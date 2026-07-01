<?php
/**
 * Provence — Chat: enviar mensagem.
 *
 *  POST /chat/enviar.php
 *  Body JSON: { "consulta_id": 123, "mensagem": "texto" }
 *
 * O remetente é o usuário logado (sessão) e o destinatário é o outro
 * participante da consulta (paciente <-> profissional).
 */

require_once __DIR__ . '/conexao.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    responder(405, ['success' => false, 'message' => 'Método não permitido.']);
}

$uid = usuario_logado_id();
if ($uid === null) {
    responder(401, ['success' => false, 'message' => 'Sessão expirada. Faça login novamente.']);
}

// Aceita corpo JSON (usado pelo frontend) ou form-urlencoded
$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    $body = $_POST;
}

$consultaId = isset($body['consulta_id']) ? (int) $body['consulta_id'] : 0;
$mensagem   = isset($body['mensagem']) ? trim((string) $body['mensagem']) : '';

if ($consultaId <= 0 || $mensagem === '') {
    responder(400, ['success' => false, 'message' => 'Informe a consulta e a mensagem.']);
}

// Limite defensivo de tamanho (a coluna é TEXT, mas evita abuso)
if (mb_strlen($mensagem) > 5000) {
    $mensagem = mb_substr($mensagem, 0, 5000);
}

try {
    $stmt = $pdo->prepare('SELECT id_paciente, id_profissional FROM consultas WHERE id = ?');
    $stmt->execute([$consultaId]);
    $consulta = $stmt->fetch();

    if (!$consulta || ((int) $consulta['id_paciente'] !== $uid && (int) $consulta['id_profissional'] !== $uid)) {
        responder(403, ['success' => false, 'message' => 'Acesso negado a esta conversa.']);
    }

    $destinatario = ((int) $consulta['id_paciente'] === $uid)
        ? (int) $consulta['id_profissional']
        : (int) $consulta['id_paciente'];

    $stmt = $pdo->prepare(
        'INSERT INTO mensagens (id_consulta, id_remetente, id_destinatario, mensagem)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$consultaId, $uid, $destinatario, $mensagem]);

    responder(200, [
        'success' => true,
        'message' => 'Mensagem enviada',
        'data'    => [
            'id'              => (int) $pdo->lastInsertId(),
            'id_consulta'     => $consultaId,
            'id_remetente'    => $uid,
            'id_destinatario' => $destinatario,
            'mensagem'        => $mensagem,
        ],
    ]);
} catch (PDOException $e) {
    responder(500, ['success' => false, 'message' => 'Erro ao enviar a mensagem']);
}
