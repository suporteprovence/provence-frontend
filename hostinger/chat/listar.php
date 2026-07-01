<?php
/**
 * Provence — Chat: listar conversas e mensagens.
 *
 *  GET /chat/listar.php                    -> lista de conversas do usuário logado
 *  GET /chat/listar.php?consulta_id=123    -> mensagens daquela consulta (histórico)
 *
 * Identidade vem da sessão (mesmo login das outras telas). Cada "conversa"
 * corresponde a uma consulta entre paciente e profissional.
 */

require_once __DIR__ . '/conexao.php';

$uid = usuario_logado_id();
if ($uid === null) {
    responder(401, ['success' => false, 'message' => 'Sessão expirada. Faça login novamente.']);
}

$consultaId = isset($_GET['consulta_id']) ? (int) $_GET['consulta_id'] : 0;

try {
    // ---------------------------------------------------------------
    // Histórico de mensagens de uma conversa
    // ---------------------------------------------------------------
    if ($consultaId > 0) {
        // Garante que o usuário logado participa desta consulta
        $stmt = $pdo->prepare('SELECT id_paciente, id_profissional FROM consultas WHERE id = ?');
        $stmt->execute([$consultaId]);
        $consulta = $stmt->fetch();

        if (!$consulta || ((int) $consulta['id_paciente'] !== $uid && (int) $consulta['id_profissional'] !== $uid)) {
            responder(403, ['success' => false, 'message' => 'Acesso negado a esta conversa.']);
        }

        $stmt = $pdo->prepare(
            'SELECT m.id,
                    m.mensagem,
                    m.enviada_em,
                    m.id_remetente,
                    u.tipo AS tipo_remetente
               FROM mensagens m
               JOIN usuarios u ON u.id = m.id_remetente
              WHERE m.id_consulta = ?
              ORDER BY m.enviada_em ASC, m.id ASC'
        );
        $stmt->execute([$consultaId]);

        responder(200, ['success' => true, 'data' => $stmt->fetchAll()]);
    }

    // ---------------------------------------------------------------
    // Lista de conversas do usuário logado (paciente OU profissional)
    // ---------------------------------------------------------------
    $stmt = $pdo->prepare(
        "SELECT
            c.id,
            c.data_hora,
            up.nome  AS nome_paciente,
            upr.nome AS nome_profissional,
            pr.especialidade AS especialidade,
            (SELECT m2.mensagem   FROM mensagens m2
              WHERE m2.id_consulta = c.id
              ORDER BY m2.enviada_em DESC, m2.id DESC LIMIT 1) AS ultima_mensagem,
            (SELECT m2.enviada_em FROM mensagens m2
              WHERE m2.id_consulta = c.id
              ORDER BY m2.enviada_em DESC, m2.id DESC LIMIT 1) AS data_ultima_mensagem
         FROM consultas c
         JOIN usuarios up  ON up.id  = c.id_paciente
         JOIN usuarios upr ON upr.id = c.id_profissional
         LEFT JOIN profissionais pr ON pr.id = c.id_profissional
        WHERE c.id_paciente = ? OR c.id_profissional = ?
        ORDER BY (data_ultima_mensagem IS NULL), data_ultima_mensagem DESC, c.data_hora DESC"
    );
    $stmt->execute([$uid, $uid]);
    $conversas = $stmt->fetchAll();

    // Sem coluna de "lida" na tabela e sem presença em tempo real:
    // devolvemos valores neutros para os campos opcionais da tela.
    foreach ($conversas as &$conversa) {
        $conversa['nao_lidas'] = 0;
        $conversa['online']    = false;
    }
    unset($conversa);

    responder(200, ['success' => true, 'data' => $conversas]);
} catch (PDOException $e) {
    responder(500, ['success' => false, 'message' => 'Erro ao carregar o chat']);
}
