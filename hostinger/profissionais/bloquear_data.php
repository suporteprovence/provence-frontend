<?php
/**
 * Provence — Bloqueia uma data na agenda do profissional logado (Etapa 1).
 *  POST {data_bloqueada:"YYYY-MM-DD", motivo?:string}
 *
 * SUBSTITUI a versão de produção (colunas inexistentes e sem checagem de sessão).
 * Deploy: public_html/profissionais/bloquear_data.php (SUBSTITUI).
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

$data   = trim((string) ($body['data_bloqueada'] ?? ''));
$motivo = trim((string) ($body['motivo'] ?? ''));

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $data)) {
    echo json_encode(['success' => false, 'message' => 'Data inválida. Use o formato AAAA-MM-DD.']);
    exit;
}
[$y, $m, $d] = array_map('intval', explode('-', $data));
if (!checkdate($m, $d, $y)) {
    echo json_encode(['success' => false, 'message' => 'Data inválida.']);
    exit;
}
if ($data < date('Y-m-d')) {
    echo json_encode(['success' => false, 'message' => 'Não é possível bloquear uma data que já passou.']);
    exit;
}
if (mb_strlen($motivo) > 200) {
    echo json_encode(['success' => false, 'message' => 'O motivo deve ter no máximo 200 caracteres.']);
    exit;
}

try {
    $chk = $pdo->prepare("SELECT id FROM dias_bloqueados WHERE id_profissional = ? AND data_bloqueada = ?");
    $chk->execute([$uid, $data]);
    if ($chk->fetch()) {
        echo json_encode(['success' => false, 'message' => 'Essa data já está bloqueada.']);
        exit;
    }
    $ins = $pdo->prepare(
        "INSERT INTO dias_bloqueados (id_profissional, data_bloqueada, motivo) VALUES (?, ?, ?)"
    );
    $ins->execute([$uid, $data, $motivo !== '' ? $motivo : null]);
    echo json_encode(['success' => true, 'message' => 'Data bloqueada.', 'data' => ['id' => (int) $pdo->lastInsertId()]]);
} catch (Exception $e) {
    error_log('bloquear_data: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
