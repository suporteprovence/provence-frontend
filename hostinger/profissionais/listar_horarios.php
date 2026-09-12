<?php
/**
 * Provence — Horários de trabalho do profissional logado (Etapa 1).
 *  GET -> lista os horários semanais do profissional da sessão.
 *
 * SUBSTITUI a versão de produção, que estava quebrada: usava as colunas
 * profissional_id / hora_inicio / hora_fim / ativo, que não existem no banco
 * (as reais são id_profissional / horario_inicio / horario_fim, e não há "ativo").
 * Também recebia profissional_id pela URL sem checar sessão, ou seja, qualquer
 * um lia a agenda de qualquer profissional. Agora o id vem da sessão.
 *
 * Deploy: public_html/profissionais/listar_horarios.php (SUBSTITUI).
 */

require_once __DIR__ . '/../config/db.php'; // $pdo + CORS + headers + OPTIONS

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
        "SELECT id, dia_semana, horario_inicio, horario_fim
           FROM horarios_trabalho
          WHERE id_profissional = ?
          ORDER BY FIELD(dia_semana, 'segunda','terca','quarta','quinta','sexta','sabado','domingo'),
                   horario_inicio"
    );
    $stmt->execute([$uid]);
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
} catch (Exception $e) {
    error_log('listar_horarios: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
