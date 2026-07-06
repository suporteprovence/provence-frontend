<?php
/**
 * Provence — Recuperação de senha (passo 1): confirma identidade.
 *
 * Reforço de segurança "leve" (sem e-mail): só confirma a conta quando
 * E-MAIL + CPF conferem. Substitui o verificar_email.php antigo, que
 * confirmava só pelo e-mail (permitia trocar a senha de qualquer conta).
 *
 * Deploy: enviar para a RAIZ de public_html (https://provence.host/verificar_email.php),
 * substituindo o arquivo atual. Reaproveita a conexão/CORS de chat/conexao.php
 * (por isso a pasta chat/ também precisa estar publicada).
 */

require __DIR__ . '/chat/conexao.php'; // $pdo, CORS com credenciais, JSON, preflight OPTIONS

$b = json_decode(file_get_contents('php://input'), true);
if (!is_array($b)) {
    $b = $_POST;
}

$email = trim((string) ($b['email'] ?? ''));
$cpf   = preg_replace('/\D/', '', (string) ($b['cpf'] ?? ''));

if ($email === '' || $cpf === '') {
    responder(200, ['success' => true, 'existe' => false, 'message' => 'Informe e-mail e CPF.']);
}

$stmt = $pdo->prepare('SELECT cpf FROM usuarios WHERE email = ? AND ativo = 1');
$stmt->execute([$email]);
$u = $stmt->fetch();

$confere = $u
    && $u['cpf'] !== null
    && preg_replace('/\D/', '', $u['cpf']) !== ''
    && preg_replace('/\D/', '', $u['cpf']) === $cpf;

responder(200, ['success' => true, 'existe' => (bool) $confere]);
