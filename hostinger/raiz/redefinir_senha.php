<?php
/**
 * Provence — Recuperação de senha (passo 2): redefine a senha.
 *
 * Só troca a senha quando E-MAIL + CPF conferem (mesma checagem do passo 1,
 * repetida aqui de propósito: a segurança tem que estar no servidor, não só
 * na tela). Substitui o redefinir_senha.php antigo, que trocava a senha só
 * com e-mail + nova senha.
 *
 * Deploy: enviar para a RAIZ de public_html (https://provence.host/redefinir_senha.php),
 * substituindo o arquivo atual. Reaproveita a conexão de chat/conexao.php.
 */

require __DIR__ . '/chat/conexao.php'; // $pdo, CORS com credenciais, JSON, preflight OPTIONS

$b = json_decode(file_get_contents('php://input'), true);
if (!is_array($b)) {
    $b = $_POST;
}

$email = trim((string) ($b['email'] ?? ''));
$cpf   = preg_replace('/\D/', '', (string) ($b['cpf'] ?? ''));
$nova  = (string) ($b['nova_senha'] ?? '');

if ($email === '' || $cpf === '' || strlen($nova) < 6) {
    responder(200, ['success' => false, 'sucesso' => false, 'message' => 'Dados inválidos.']);
}

$stmt = $pdo->prepare('SELECT id, cpf FROM usuarios WHERE email = ? AND ativo = 1');
$stmt->execute([$email]);
$u = $stmt->fetch();

$confere = $u
    && $u['cpf'] !== null
    && preg_replace('/\D/', '', $u['cpf']) !== ''
    && preg_replace('/\D/', '', $u['cpf']) === $cpf;

if (!$confere) {
    responder(200, ['success' => false, 'sucesso' => false, 'message' => 'E-mail e CPF não conferem.']);
}

$hash = password_hash($nova, PASSWORD_BCRYPT);
$stmt = $pdo->prepare('UPDATE usuarios SET senha = ? WHERE id = ?');
$stmt->execute([$hash, (int) $u['id']]);

responder(200, ['success' => true, 'sucesso' => true]);
