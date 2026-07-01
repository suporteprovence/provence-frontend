<?php
/**
 * Provence — Chat (PHP + MySQL na Hostinger)
 * Conexão com o banco, CORS com credenciais e leitura da sessão do login.
 *
 * Este arquivo é incluído por listar.php e enviar.php.
 * Faça upload da pasta inteira para: public_html/chat/  (fica em https://provence.host/chat/)
 */

// ------------------------------------------------------------------
// CORS — o frontend (Vercel) precisa enviar o cookie de sessão (PHPSESSID).
// Por isso NÃO pode usar "*": precisa devolver a origem exata + credentials.
// ------------------------------------------------------------------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$origemPermitida =
    $origin === 'https://provence.host' ||
    // produção e previews da Vercel (ex.: provence-frontend.vercel.app)
    preg_match('/^https:\/\/[a-z0-9-]+\.vercel\.app$/i', $origin) === 1;

if ($origemPermitida) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept');
header('Content-Type: application/json; charset=utf-8');

// Responde ao preflight do navegador sem tocar no banco
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Sessão — a mesma criada por auth/login.php (mesmo domínio = cookie compartilhado)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ==================================================================
// >>> PREENCHER com as credenciais do MySQL da Hostinger <<<
// Painel Hostinger > Bancos de dados MySQL. Em regra, no PHP da própria
// Hostinger o host é 'localhost'. Se falhar, troque por 'srv1199.hstgr.io'.
// ==================================================================
$DB_HOST = 'localhost';
$DB_NAME = 'u218657465_PROVENCE';
$DB_USER = 'u218657465_XXXXXX';   // <-- preencher
$DB_PASS = 'XXXXXXXXXX';          // <-- preencher
// ==================================================================

try {
    $pdo = new PDO(
        "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro de conexão com o banco de dados']);
    exit;
}

/**
 * Descobre o id do usuário logado a partir da sessão criada no login.
 * Testa as chaves mais comuns para não depender do nome exato usado em
 * auth/login.php — assim funciona sem precisar editar o login.
 *
 * Se o chat retornar 401 mesmo logado, verifique em auth/login.php qual
 * chave é gravada (ex.: $_SESSION['usuario_id'] = ...) e garanta que ela
 * esteja na lista abaixo.
 */
function usuario_logado_id(): ?int
{
    $chaves = ['usuario_id', 'user_id', 'id_usuario', 'idUsuario', 'id', 'userId'];
    foreach ($chaves as $k) {
        if (isset($_SESSION[$k]) && is_numeric($_SESSION[$k])) {
            return (int) $_SESSION[$k];
        }
    }
    // casos em que o usuário fica aninhado, ex.: $_SESSION['usuario']['id']
    foreach (['usuario', 'user', 'dados', 'auth'] as $wrap) {
        if (isset($_SESSION[$wrap]) && is_array($_SESSION[$wrap]) && isset($_SESSION[$wrap]['id'])) {
            return (int) $_SESSION[$wrap]['id'];
        }
    }
    return null;
}

/** Encerra a requisição devolvendo JSON com um código HTTP. */
function responder(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}
