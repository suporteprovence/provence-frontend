<?php
/**
 * Provence — Cancelamento de consulta pelo profissional.
 *
 * O paciente já tinha paciente/cancel_consulta.php; o profissional não tinha
 * endpoint (o front chamava o do paciente, que só autoriza id_paciente, então
 * o cancelamento do profissional nunca funcionava). Espelha a regra do paciente:
 * apenas muda o status para 'cancelada_por_nao_ocorrencia'. Não faz reembolso
 * automático (reembolso é fluxo separado, igual ao do paciente).
 *
 * Deploy: public_html/profissional/cancelar_consulta.php (NOVO).
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/seguranca.php';
require_once __DIR__ . '/../config/mercadopago.php';
require_once __DIR__ . '/../config/notificacoes.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado']);
    exit;
}
if (($_SESSION['user_type'] ?? '') !== 'profissional') {
    echo json_encode(['success' => false, 'message' => 'Acesso negado.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    $data = $_POST;
}
$consulta_id = isset($data['consulta_id']) ? (int) $data['consulta_id'] : 0;
if (!$consulta_id) {
    echo json_encode(['success' => false, 'message' => 'ID da consulta é obrigatório']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Só o profissional dono da consulta pode cancelar; trava a linha.
    $stmt = $pdo->prepare("SELECT status FROM consultas WHERE id = ? AND id_profissional = ? FOR UPDATE");
    $stmt->execute([$consulta_id, (int) $_SESSION['user_id']]);
    $status = $stmt->fetchColumn();

    if ($status === false) {
        throw new Exception('Consulta não encontrada ou você não tem permissão para cancelá-la.');
    }
    if (in_array($status, ['realizada', 'cancelada_por_nao_ocorrencia'], true)) {
        throw new Exception('Esta consulta não pode ser cancelada.');
    }

    $pdo->prepare("UPDATE consultas SET status = 'cancelada_por_nao_ocorrencia' WHERE id = ?")->execute([$consulta_id]);

    $pdo->commit();

    // Etapa 2: se o paciente já tinha pago, o cancelamento pelo profissional devolve o valor.
    $reembolsoMsg = '';
    $stP = $pdo->prepare("SELECT id, valor_total, status, mp_payment_id FROM pagamentos WHERE consulta_id = ? AND status IN ('aprovado','liberado') ORDER BY id DESC LIMIT 1");
    $stP->execute([$consulta_id]);
    $pagCancel = $stP->fetch();
    if ($pagCancel) {
        $stR = $pdo->prepare("SELECT id FROM reembolsos WHERE consulta_id = ? AND status IN ('solicitado','aprovado','pago') ORDER BY id DESC LIMIT 1");
        $stR->execute([$consulta_id]);
        $ridCancel = (int) ($stR->fetchColumn() ?: 0);
        if ($ridCancel === 0) {
            $stI = $pdo->prepare("SELECT id_paciente FROM consultas WHERE id = ?");
            $stI->execute([$consulta_id]);
            $pdo->prepare("INSERT INTO reembolsos (consulta_id, id_paciente, motivo, valor_reembolso, status) VALUES (?, ?, 'Consulta cancelada pelo profissional', ?, 'solicitado')")
                ->execute([$consulta_id, (int) $stI->fetchColumn(), (float) $pagCancel['valor_total']]);
            $ridCancel = (int) $pdo->lastInsertId();
        }
        $resC = (mp_configurado() && !empty($pagCancel['mp_payment_id']))
            ? mp_reembolsar($pdo, (int) $pagCancel['id'], $ridCancel, 'Reembolso automático: consulta cancelada pelo profissional')
            : ['ok' => false];
        $reembolsoMsg = $resC['ok'] ? ' O paciente será reembolsado automaticamente.' : ' O reembolso ao paciente ficou pendente para a administração.';
    }
    $estornou = isset($resC) && !empty($resC['ok']);
    $valorEstornado = ($estornou && isset($resC['valor'])) ? (float) $resC['valor'] : null;
    provence_responder_e_notificar(200, ['success' => true, 'message' => 'Consulta cancelada com sucesso!' . $reembolsoMsg], function () use ($pdo, $consulta_id, $estornou, $valorEstornado) {
        notificar_consulta_cancelada($pdo, (int) $consulta_id, 'profissional');
        if ($estornou) {
            notificar_reembolso($pdo, (int) $consulta_id, 'pago', $valorEstornado);
        }
    });
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('cancelar_consulta (profissional): ' . $e->getMessage());
    // Mensagens de regra de negócio são seguras; erros de banco viram genérico.
    $msg = ($e instanceof PDOException) ? 'Erro interno do servidor' : $e->getMessage();
    echo json_encode(['success' => false, 'message' => $msg]);
}
