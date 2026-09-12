<?php
/**
 * Provence — Recuperação de senha (passo 1½): a tela confere se o link ainda vale.
 *
 *  GET /validar_token.php?token=...   ->  { "success": true, "valido": true|false }
 *
 * Só leitura, não muda nada e não devolve nenhum dado da conta. Serve para a
 * tela mostrar "link expirado, peça outro" antes de a pessoa digitar a senha.
 *
 * Deploy: public_html/validar_token.php (raiz, arquivo novo).
 */

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/seguranca.php';

$token = isset($_GET['token']) ? (string) $_GET['token'] : '';

if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
    provence_responder(200, ['success' => true, 'valido' => false]);
}

try {
    $st = $pdo->prepare(
        'SELECT 1
           FROM tokens_recuperacao t
           JOIN usuarios u ON u.id = t.usuario_id
          WHERE t.token = ? AND t.usado = 0 AND t.expira_em > NOW() AND u.ativo = 1
          LIMIT 1'
    );
    $st->execute([hash('sha256', $token)]);
    provence_responder(200, ['success' => true, 'valido' => (bool) $st->fetchColumn()]);
} catch (PDOException $e) {
    error_log('validar_token: ' . $e->getMessage());
    provence_responder(500, ['success' => false, 'message' => 'Erro interno do servidor']);
}
