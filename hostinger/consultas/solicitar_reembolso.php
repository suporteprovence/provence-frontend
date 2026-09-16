<?php
/**
 * Provence — Paciente solicita reembolso de uma consulta (Etapa 4).
 *  POST {consulta_id, motivo}
 *
 * SUBSTITUI a versão de produção, que não checava sessão (qualquer um pedia
 * reembolso de qualquer consulta) e gravava numa tabela que não existia.
 * Requer a migração sql/05-reembolsos.sql.
 *
 * Regras: só o dono; precisa existir pagamento aprovado/liberado (dinheiro que
 * de fato entrou); consulta realizada não cabe reembolso por aqui; um pedido em
 * aberto por consulta. O pedido fica "solicitado" para a Provence analisar; o
 * dinheiro só volta quando a plataforma marcar como pago (isso depende do
 * meio de pagamento real, Etapa 2). Se a consulta ainda estava ativa, ela é
 * cancelada para liberar o horário.
 *
 * Deploy: public_html/consultas/solicitar_reembolso.php (SUBSTITUI).
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/seguranca.php';
require_once __DIR__ . '/../config/mercadopago.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado']);
    exit;
}
if (($_SESSION['user_type'] ?? '') !== 'paciente') {
    echo json_encode(['success' => false, 'message' => 'Acesso negado']);
    exit;
}

$uid  = (int) $_SESSION['user_id'];
$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    echo json_encode(['success' => false, 'message' => 'Envie os dados em JSON.']);
    exit;
}

$consulta_id = (int) ($body['consulta_id'] ?? 0);
$motivo      = trim((string) ($body['motivo'] ?? ''));

if ($consulta_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Informe a consulta.']);
    exit;
}
if (mb_strlen($motivo) < 5) {
    echo json_encode(['success' => false, 'message' => 'Conte em poucas palavras o motivo do reembolso.']);
    exit;
}
if (mb_strlen($motivo) > 500) {
    echo json_encode(['success' => false, 'message' => 'O motivo deve ter no máximo 500 caracteres.']);
    exit;
}

try {
    $pdo->beginTransaction();

    $st = $pdo->prepare("SELECT status, data_hora FROM consultas WHERE id = ? AND id_paciente = ? FOR UPDATE");
    $st->execute([$consulta_id, $uid]);
    $cons = $st->fetch();
    $status = $cons ? $cons['status'] : false;
    if ($status === false) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Consulta não encontrada.']);
        exit;
    }
    if ($status === 'realizada') {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Essa consulta já foi realizada. Fale com o suporte se precisar de ajuda.']);
        exit;
    }

    // Último pagamento da consulta: só reembolsa o que realmente foi pago.
    $pg = $pdo->prepare(
        "SELECT id, valor_total, status FROM pagamentos WHERE consulta_id = ? ORDER BY id DESC LIMIT 1"
    );
    $pg->execute([$consulta_id]);
    $pag = $pg->fetch();
    if (!$pag || !in_array($pag['status'], ['aprovado', 'liberado'], true)) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Não há pagamento confirmado para essa consulta.']);
        exit;
    }

    $ab = $pdo->prepare(
        "SELECT id, status FROM reembolsos WHERE consulta_id = ? AND status IN ('solicitado','aprovado','pago') ORDER BY id DESC LIMIT 1"
    );
    $ab->execute([$consulta_id]);
    if ($r = $ab->fetch()) {
        $pdo->rollBack();
        $msg = $r['status'] === 'pago' ? 'Essa consulta já foi reembolsada.' : 'Já existe um pedido de reembolso em análise para essa consulta.';
        echo json_encode(['success' => false, 'message' => $msg]);
        exit;
    }

    $ins = $pdo->prepare(
        "INSERT INTO reembolsos (consulta_id, id_paciente, motivo, valor_reembolso, status) VALUES (?, ?, ?, ?, 'solicitado')"
    );
    $ins->execute([$consulta_id, $uid, $motivo, $pag['valor_total']]);
    $rid = (int) $pdo->lastInsertId();

    // Consulta ainda ativa: cancela para liberar o horário do profissional.
    if ($status !== 'cancelada_por_nao_ocorrencia') {
        $pdo->prepare("UPDATE consultas SET status = 'cancelada_por_nao_ocorrencia' WHERE id = ?")->execute([$consulta_id]);
    }

    $pdo->commit();

    // Etapa 2: cancelamento com antecedência (reembolso_horas_min) estorna na hora pelo Mercado Pago.
    $horasMin   = mp_config_numero($pdo, 'reembolso_horas_min', 24.0);
    $horasAte   = (strtotime((string) $cons['data_hora']) - time()) / 3600;
    $automatico = $horasAte >= $horasMin;
    if ($automatico && mp_configurado()) {
        $res = mp_reembolsar($pdo, (int) $pag['id'], $rid, 'Reembolso automático: cancelamento com ' . (int) floor($horasAte) . 'h de antecedência');
        if ($res['ok']) {
            echo json_encode([
                'success' => true,
                'message' => 'Consulta cancelada e reembolso feito. O valor volta pelo mesmo meio de pagamento (Pix em minutos; cartão em até 2 faturas).',
                'data' => ['id' => $rid, 'status' => 'pago', 'valor' => (float) $pag['valor_total'], 'automatico' => true],
            ]);
            exit;
        }
        error_log('solicitar_reembolso: estorno automático falhou (reembolso ' . $rid . '): ' . $res['message']);
    }
    echo json_encode([
        'success' => true,
        'message' => $automatico
            ? 'Consulta cancelada. O reembolso será concluído pela equipe em até 5 dias úteis.'
            : 'Consulta cancelada com menos de ' . (int) $horasMin . ' horas de antecedência: o pedido de reembolso foi registrado e a equipe vai analisar (resposta em até 5 dias úteis).',
        'data' => ['id' => $rid, 'status' => 'solicitado', 'valor' => (float) $pag['valor_total'], 'automatico' => false],
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('solicitar_reembolso: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
