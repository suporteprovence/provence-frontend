<?php
/**
 * Provence — Profissional informa o link da sessão de uma consulta (Etapa 1).
 *  POST {consulta_id, link_sessao}
 *
 * SUBSTITUI a versão de produção. Ela gravava só em link_reuniao, mas o site
 * lê link_sessao, então o link era salvo e nunca aparecia. Agora grava nas duas
 * colunas. Mantém a checagem de dono e passa a proteger consultas já encerradas.
 *
 * Deploy: public_html/profissional/add-link-sessao.php (SUBSTITUI).
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/seguranca.php';
require_once __DIR__ . '/../config/notificacoes.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado']);
    exit;
}
if (($_SESSION['user_type'] ?? '') !== 'profissional') {
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
$link        = trim((string) ($body['link_sessao'] ?? ''));

if ($consulta_id <= 0 || $link === '') {
    echo json_encode(['success' => false, 'message' => 'Informe a consulta e o link.']);
    exit;
}
if (mb_strlen($link) > 2000 || !filter_var($link, FILTER_VALIDATE_URL) || !preg_match('#^https?://#i', $link) || preg_match('/[<>"\x27\s]/', $link)) {
    echo json_encode(['success' => false, 'message' => 'Link inválido. Use um endereço completo começando com https://']);
    exit;
}

try {
    $pdo->beginTransaction();

    $st = $pdo->prepare("SELECT status FROM consultas WHERE id = ? AND id_profissional = ? FOR UPDATE");
    $st->execute([$consulta_id, $uid]);
    $status = $st->fetchColumn();

    if ($status === false) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Consulta não encontrada.']);
        exit;
    }
    if (in_array($status, ['realizada', 'cancelada_por_nao_ocorrencia'], true)) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Essa consulta já foi encerrada.']);
        exit;
    }
    // Só consulta paga (ou já além disso) recebe link. Sem isso o paciente
    // poderia entrar na sessão sem ter pago.
    if (!in_array($status, ['paga', 'link_enviado', 'confirmada_paciente', 'confirmada_profissional', 'confirmada_ambos'], true)) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Aguarde a confirmação do pagamento para enviar o link.']);
        exit;
    }

    // Só avança o status quando a consulta está paga aguardando link; nos demais
    // casos (já confirmada pelas partes, etc.) atualiza o link sem regredir o status.
    if ($status === 'paga') {
        $up = $pdo->prepare("UPDATE consultas SET link_sessao = ?, link_reuniao = ?, status = 'link_enviado' WHERE id = ?");
    } else {
        $up = $pdo->prepare("UPDATE consultas SET link_sessao = ?, link_reuniao = ? WHERE id = ?");
    }
    $up->execute([$link, $link, $consulta_id]);

    $pdo->commit();
    provence_responder_e_notificar(200, ['success' => true, 'message' => 'Link da sessão salvo. O paciente será avisado por e-mail.'], function () use ($pdo, $consulta_id, $link) {
        notificar_link_sessao($pdo, (int) $consulta_id, $link);
    });
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('add-link-sessao: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
