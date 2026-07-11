<?php
/**
 * Provence — Consultas do profissional (agenda).
 *
 * SUBSTITUI a versão de produção, que estava QUEBRADA: usava as colunas
 * c.paciente_id / c.profissional_id, que não existem no schema real
 * (as corretas são id_paciente / id_profissional). Com o PDO em modo de
 * exceção, a query quebrava e a agenda do profissional nunca carregava.
 *
 * Deploy: public_html/profissional/get_all_consultas.php (SUBSTITUI).
 */

require_once __DIR__ . '/../config/db.php'; // $pdo + CORS + headers + OPTIONS

session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado']);
    exit;
}
if (($_SESSION['user_type'] ?? '') !== 'profissional') {
    echo json_encode(['success' => false, 'message' => 'Acesso negado.']);
    exit;
}

$user_id = (int) $_SESSION['user_id'];

try {
    $stmt = $pdo->prepare("
        SELECT
            c.*,
            u.nome     AS paciente_nome,
            u.email    AS paciente_email,
            u.telefone AS paciente_telefone,
            DATE(c.data_hora)                    AS data,
            DATE_FORMAT(c.data_hora, '%d/%m/%Y') AS data_formatada,
            DATE_FORMAT(c.data_hora, '%H:%i')    AS horario,
            'video'                              AS tipo
        FROM consultas c
        JOIN usuarios u ON u.id = c.id_paciente
        WHERE c.id_profissional = ?
        ORDER BY c.data_hora DESC
    ");
    $stmt->execute([$user_id]);

    echo json_encode([
        'success' => true,
        'message' => 'Consultas encontradas',
        'data' => $stmt->fetchAll(PDO::FETCH_ASSOC),
    ]);
} catch (Exception $e) {
    error_log('get_all_consultas (profissional): ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
