<?php
/**
 * Provence — Recuperação de senha (passo 2): troca a senha usando o link.
 *
 *  POST /redefinir_senha.php   Body JSON: { "token": "...", "nova_senha": "..." }
 *
 * O token é o do link recebido por e-mail (verificar_email.php). Vale por 1 hora
 * e só uma vez. Ao trocar a senha:
 *   - todos os tokens abertos da conta são invalidados;
 *   - o bloqueio de força bruta daquele e-mail é zerado (é o jeito de destravar);
 *   - fica registrado na auditoria.
 *
 * Deploy: substitui public_html/redefinir_senha.php (raiz).
 */

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/seguranca.php';

const SENHA_MIN = 8;

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    provence_responder(405, ['success' => false, 'message' => 'Método não permitido.']);
}

$b = provence_corpo_json();
if ($b === null) {
    provence_responder(200, ['success' => false, 'sucesso' => false, 'message' => 'Envie os dados em JSON.']);
}

$token = (string) ($b['token'] ?? '');
$nova  = (string) ($b['nova_senha'] ?? '');

if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
    provence_responder(200, ['success' => false, 'sucesso' => false, 'message' => 'Link inválido ou expirado. Solicite um novo.']);
}
if (strlen($nova) < SENHA_MIN || strlen($nova) > 200) {
    provence_responder(200, ['success' => false, 'sucesso' => false, 'message' => 'A senha deve ter pelo menos ' . SENHA_MIN . ' caracteres.']);
}

try {
    $pdo->beginTransaction();

    $st = $pdo->prepare(
        'SELECT t.id, t.usuario_id, u.email
           FROM tokens_recuperacao t
           JOIN usuarios u ON u.id = t.usuario_id
          WHERE t.token = ? AND t.usado = 0 AND t.expira_em > NOW() AND u.ativo = 1
          LIMIT 1
          FOR UPDATE'
    );
    $st->execute([hash('sha256', $token)]);
    $t = $st->fetch();

    if (!$t) {
        $pdo->rollBack();
        provence_log($pdo, 'senha_redefinida_falha', 'token inválido ou expirado');
        provence_responder(200, ['success' => false, 'sucesso' => false, 'message' => 'Link inválido ou expirado. Solicite um novo.']);
    }

    $uid = (int) $t['usuario_id'];

    $pdo->prepare('UPDATE usuarios SET senha = ? WHERE id = ?')
        ->execute([password_hash($nova, PASSWORD_BCRYPT), $uid]);
    $pdo->prepare('UPDATE tokens_recuperacao SET usado = 1 WHERE usuario_id = ? AND usado = 0')
        ->execute([$uid]);
    $pdo->prepare('DELETE FROM tentativas_login WHERE email = ?')
        ->execute([mb_strtolower((string) $t['email'])]);

    $pdo->commit();

    provence_log($pdo, 'senha_redefinida', 'via link de e-mail', $uid);
    provence_responder(200, ['success' => true, 'sucesso' => true, 'message' => 'Senha redefinida com sucesso.']);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('redefinir_senha: ' . $e->getMessage());
    provence_responder(500, ['success' => false, 'sucesso' => false, 'message' => 'Erro interno do servidor']);
}
