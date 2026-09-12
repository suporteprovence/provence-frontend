<?php
// Relógio do PHP fixo no fuso da plataforma (Brasil). Sem isso, checagens como
// "data já passou" dependem do fuso do servidor e podem errar por um dia.
date_default_timezone_set('America/Sao_Paulo');

// ============================================================================
// Cookie de sessão compartilhável entre o frontend (Vercel) e a API (Hostinger).
// Como são domínios diferentes, o navegador só envia o PHPSESSID nas requisições
// se o cookie for SameSite=None; Secure. Definido AQUI porque config/db.php é
// incluído por todos os endpoints antes do session_start().
// ============================================================================
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_samesite', 'None');
    ini_set('session.cookie_secure', '1');
    ini_set('session.cookie_httponly', '1');
    // Endurecimento da sessão (Etapa 3):
    //  - use_strict_mode: rejeita PHPSESSID que o servidor não criou (session fixation)
    //  - use_only_cookies: id de sessão nunca vem pela URL
    //  - cookie_lifetime 0: cookie morre ao fechar o navegador
    //  - gc_maxlifetime 8h: sessão parada expira no servidor
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_lifetime', '0');
    ini_set('session.gc_maxlifetime', '28800');
}

$allowed_origins = array(
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "https://provence.host",
    "https://www.provence.host",
    "https://provence-frontend.vercel.app",
    "https://provence-frontend-git-main-suporteprovenceo-4679s-projects.vercel.app"
);

$origin = isset($_SERVER["HTTP_ORIGIN"]) ? $_SERVER["HTTP_ORIGIN"] : "";

// Só ecoa a origem se ela estiver EXATAMENTE na allowlist. NÃO refletir
// *.vercel.app arbitrário: como enviamos Allow-Credentials, refletir qualquer
// subdomínio vercel.app permitiria que um site publicado em *.vercel.app fizesse
// requisições cross-origin credenciadas e lesse/gravasse dados do usuário logado
// (PII, dados bancários). Previews novos da Vercel devem ser adicionados à mão.
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Vary: Origin");
}

header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

// Cabeçalhos de segurança (Etapa 3). A API só devolve JSON com dados pessoais:
// não pode ser embutida em iframe, o navegador não deve "adivinhar" o tipo do
// conteúdo, nada fica em cache e o Referer não vaza para fora.
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Referrer-Policy: no-referrer");
header("Cache-Control: no-store");
if (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off") {
    header("Strict-Transport-Security: max-age=31536000; includeSubDomains");
}

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// ============================================================================
// Proteção contra CSRF. O cookie de sessão precisa ser SameSite=None para o
// site (Vercel) conversar com a API (Hostinger), mas isso também faz o
// navegador enviar o cookie a partir de QUALQUER site. O CORS acima impede um
// site estranho de LER a resposta, mas não impede a ESCRITA: um formulário ou
// um fetch com text/plain (que não passa por preflight) disparado de uma
// página maliciosa executaria a ação em nome do usuário logado. Por isso toda
// requisição que altera estado precisa vir de uma origem conhecida.
// Navegadores sempre mandam Origin em POST cross-site; requisições sem Origin
// (curl, servidor a servidor, webhooks) não carregam o cookie de uma vítima e
// seguem permitidas.
// ============================================================================
$metodo = isset($_SERVER["REQUEST_METHOD"]) ? $_SERVER["REQUEST_METHOD"] : "GET";
if (!in_array($metodo, array("GET", "HEAD", "OPTIONS"), true) && $origin !== "" && !in_array($origin, $allowed_origins, true)) {
    http_response_code(403);
    echo json_encode(array("success" => false, "message" => "Origem não permitida."));
    exit;
}

// Carregar .env se existir
$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($key, $value) = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value);
    }
}

$host     = isset($_ENV['DB_HOST']) ? $_ENV['DB_HOST'] : "localhost";
$dbname   = isset($_ENV['DB_NAME']) ? $_ENV['DB_NAME'] : "u218657465_PROVENCE";
$username = isset($_ENV['DB_USER']) ? $_ENV['DB_USER'] : "u218657465_provence";
$password = isset($_ENV['DB_PASS']) ? $_ENV['DB_PASS'] : "";

try {
    $pdo = new PDO("mysql:host=" . $host . ";dbname=" . $dbname . ";charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    error_log('DB connection error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(array("success" => false, "message" => "Erro de conexao ao banco"));
    exit;
}
