<?php
/**
 * Provence — Remove um bloqueio de data do profissional logado (Etapa 1).
 *  POST {id}
 *
 * NOVO: a versão original não tinha como desfazer um bloqueio feito por engano.
 * Só remove bloqueios do próprio profissional.
 * Deploy: public_html/profissionais/desbloquear_data.php (NOVO).
 */

require_once __DIR__ . '/../config/db.php';

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
$id = (int) ($body['id'] ?? 0);

if ($id <= 0) {
    echo json_encode(['success' => false, 'message' => 'Informe o id do bloqueio.']);
    exit;
}

try {
    $del = $pdo->prepare("DELETE FROM dias_bloqueados WHERE id = ? AND id_profissional = ?");
    $del->execute([$id, $uid]);
    if ($del->rowCount() === 0) {
        echo json_encode(['success' => false, 'message' => 'Bloqueio não encontrado.']);
        exit;
    }
    echo json_encode(['success' => true, 'message' => 'Bloqueio removido.']);
} catch (Exception $e) {
    error_log('desbloquear_data: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
