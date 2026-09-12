<?php
/**
 * Provence — Logout (Etapa 3).
 *
 *  POST /auth/logout.php
 *
 * Destrói a sessão no servidor e expira o cookie com os MESMOS atributos com
 * que ele foi criado (SameSite=None; Secure), senão o navegador ignora a
 * expiração. O logout anterior ainda mandava um segundo
 * "Access-Control-Allow-Origin: *" por cima do CORS do db.php, o que faz o
 * navegador rejeitar a resposta.
 *
 * Deploy: substitui public_html/auth/logout.php
 */

require_once __DIR__ . '/../config/db.php';

session_start();

$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $p = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires'  => time() - 42000,
        'path'     => $p['path'],
        'domain'   => $p['domain'],
        'secure'   => (bool) $p['secure'],
        'httponly' => (bool) $p['httponly'],
        'samesite' => $p['samesite'] ?: 'None',
    ]);
}

session_destroy();

echo json_encode(['success' => true, 'message' => 'Logout realizado com sucesso']);
