<?php
/**
 * Provence — Chat (PHP + MySQL na Hostinger): bootstrap.
 *
 * Reaproveita o config/db.php que o restante do site já usa — ele cria a
 * conexão PDO ($pdo) a partir do .env, trata o CORS com credenciais e responde
 * ao preflight OPTIONS. Assim NÃO é preciso configurar credenciais aqui.
 *
 * Deploy: enviar a pasta para public_html/chat/ (https://provence.host/chat/).
 */

$configDb = __DIR__ . '/../config/db.php';

if (file_exists($configDb)) {
    // Produção: usa a mesma conexão/CORS/headers do restante do site
    require_once $configDb; // define $pdo, trata CORS + OPTIONS, carrega .env
} else {
    // ---- Fallback para ambiente local/dev (sem config/db.php) ----
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $origemExtra = getenv('CHAT_EXTRA_ORIGIN') ?: '';
    if (
        $origin === 'https://provence.host'
        || preg_match('/^https:\/\/[a-z0-9-]+\.vercel\.app$/i', $origin) === 1
        || ($origemExtra !== '' && $origin === $origemExtra)
    ) {
        header("Access-Control-Allow-Origin: $origin");
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept');
    header('Content-Type: application/json; charset=utf-8');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    $DB_HOST = getenv('DB_HOST') ?: 'localhost';
    $DB_NAME = getenv('DB_NAME') ?: 'u218657465_PROVENCE';
    $DB_USER = getenv('DB_USER') ?: 'u218657465_provence';
    $DB_PASS = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';
    try {
        $pdo = new PDO(
            "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
            $DB_USER,
            $DB_PASS,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro de conexão com o banco de dados']);
        exit;
    }
}

// Sessão — a mesma criada por auth/login.php (mesmo domínio = cookie compartilhado)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Descobre o id do usuário logado a partir da sessão criada no login.
 * Testa as chaves mais comuns para não depender do nome exato usado em
 * auth/login.php. Se o chat retornar 401 mesmo logado, basta confirmar a
 * chave usada no login e garantir que ela esteja na lista abaixo.
 */
function usuario_logado_id(): ?int
{
    $chaves = ['usuario_id', 'user_id', 'id_usuario', 'idUsuario', 'id', 'userId'];
    foreach ($chaves as $k) {
        if (isset($_SESSION[$k]) && is_numeric($_SESSION[$k])) {
            return (int) $_SESSION[$k];
        }
    }
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
