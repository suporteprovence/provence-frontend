<?php
/**
 * Provence — Dias bloqueados do profissional logado (Etapa 1).
 *  GET -> lista os bloqueios de hoje em diante (os passados não interessam mais).
 *
 * SUBSTITUI a versão de produção (colunas inexistentes e sem checagem de sessão).
 * Deploy: public_html/profissionais/listar_dias_bloqueados.php (SUBSTITUI).
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

$uid = (int) $_SESSION['user_id'];

try {
    $stmt = $pdo->prepare(
        "SELECT id, data_bloqueada, motivo
           FROM dias_bloqueados
          WHERE id_profissional = ? AND data_bloqueada >= ?
          ORDER BY data_bloqueada ASC"
    );
    $stmt->execute([$uid, date('Y-m-d')]);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
} catch (Exception $e) {
    error_log('listar_dias_bloqueados: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
