<?php
/**
 * Provence — utilitários de segurança e LGPD (Etapa 3).
 *
 * Incluído pelos endpoints que precisam de:
 *   - provence_ip()             IP do cliente (para bloqueio de força bruta e auditoria)
 *   - provence_log()            trilha de auditoria em logs_sistema
 *   - provence_expurgo()        apaga logs/tentativas/tokens antigos (retenção LGPD)
 *   - provence_cifrar()/provence_decifrar()  criptografia do chat em repouso (AES-256-GCM)
 *   - provence_corpo_json()     corpo da requisição em JSON (ou null)
 *   - provence_responder()      encerra com JSON + status HTTP
 *
 * Depende de config/db.php já ter sido incluído ($pdo e $_ENV carregado do .env).
 *
 * Variáveis do .env usadas aqui:
 *   CHAT_KEY=<32 bytes em base64>   gerar com:  openssl rand -base64 32
 *
 * Deploy: public_html/config/seguranca.php
 */

// Prefixo que marca um texto cifrado por esta versão. Linhas sem o prefixo são
// mensagens antigas ainda em claro (migradas por admin/cifrar_mensagens_legado.php).
const PROVENCE_ENC_PREFIX = 'enc:v1:';

/**
 * IP do cliente. Por padrão usa REMOTE_ADDR (a Hostinger entrega o site direto,
 * sem Cloudflare na frente). Se um dia o site passar a ficar atrás da Cloudflare,
 * defina CONFIAR_CF_IP=1 no .env para usar o cabeçalho CF-Connecting-IP; sem a
 * Cloudflare na frente esse cabeçalho pode ser forjado por qualquer cliente e
 * serviria para burlar o bloqueio por IP e sujar a trilha de auditoria.
 * X-Forwarded-For nunca é usado pelo mesmo motivo.
 */
function provence_ip(): string
{
    $confiaCf = (isset($_ENV['CONFIAR_CF_IP']) && $_ENV['CONFIAR_CF_IP'] === '1')
        || getenv('CONFIAR_CF_IP') === '1';
    if ($confiaCf) {
        $cf = isset($_SERVER['HTTP_CF_CONNECTING_IP']) ? trim((string) $_SERVER['HTTP_CF_CONNECTING_IP']) : '';
        if ($cf !== '' && filter_var($cf, FILTER_VALIDATE_IP)) {
            return substr($cf, 0, 45);
        }
    }
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
    return substr($ip, 0, 45);
}

/** Registra uma ação na trilha de auditoria. Nunca derruba a requisição. */
function provence_log(PDO $pdo, string $acao, string $descricao = '', ?int $usuarioId = null): void
{
    try {
        $st = $pdo->prepare(
            'INSERT INTO logs_sistema (usuario_id, acao, descricao, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?)'
        );
        $ua = isset($_SERVER['HTTP_USER_AGENT']) ? (string) $_SERVER['HTTP_USER_AGENT'] : '';
        $st->execute([
            $usuarioId,
            mb_substr($acao, 0, 100),
            $descricao !== '' ? mb_substr($descricao, 0, 1000) : null,
            provence_ip(),
            $ua !== '' ? mb_substr($ua, 0, 500) : null,
        ]);
    } catch (Throwable $e) {
        error_log('provence_log falhou: ' . $e->getMessage());
    }
}

/**
 * Retenção de dados (LGPD, art. 15/16): apaga o que já não tem finalidade.
 *   - logs_sistema: 12 meses (o Marco Civil pede guardar registros de acesso por 6 meses)
 *   - tentativas_login: 30 dias
 *   - tokens_recuperacao usados ou vencidos: 7 dias
 * Chamado de forma oportunista pelo login (1 em cada 50 chamadas); não precisa de cron.
 */
function provence_expurgo(PDO $pdo): void
{
    try {
        $pdo->exec('DELETE FROM logs_sistema WHERE criado_em < NOW() - INTERVAL 12 MONTH');
        $pdo->exec('DELETE FROM tentativas_login WHERE criado_em < NOW() - INTERVAL 30 DAY');
        $pdo->exec('DELETE FROM tokens_recuperacao WHERE (usado = 1 OR expira_em < NOW()) AND criado_em < NOW() - INTERVAL 7 DAY');
    } catch (Throwable $e) {
        error_log('provence_expurgo falhou: ' . $e->getMessage());
    }
}

/** Chave do chat (32 bytes) vinda do .env (CHAT_KEY em base64). null se ausente/inválida. */
function provence_chave_chat(): ?string
{
    $b64 = '';
    if (isset($_ENV['CHAT_KEY']) && $_ENV['CHAT_KEY'] !== '') {
        $b64 = (string) $_ENV['CHAT_KEY'];
    } elseif (getenv('CHAT_KEY') !== false && getenv('CHAT_KEY') !== '') {
        $b64 = (string) getenv('CHAT_KEY');
    }
    if ($b64 === '') {
        return null;
    }
    $k = base64_decode($b64, true);
    if ($k === false || strlen($k) !== 32) {
        error_log('CHAT_KEY inválida: precisa ser 32 bytes em base64 (openssl rand -base64 32)');
        return null;
    }
    return $k;
}

/**
 * Cifra um texto com AES-256-GCM (IV aleatório de 12 bytes + tag de 16 bytes).
 * Retorna "enc:v1:" + base64(iv . tag . ciphertext), ou null se não houver chave.
 */
function provence_cifrar(string $texto): ?string
{
    $k = provence_chave_chat();
    if ($k === null) {
        return null;
    }
    $iv  = random_bytes(12);
    $tag = '';
    $c   = openssl_encrypt($texto, 'aes-256-gcm', $k, OPENSSL_RAW_DATA, $iv, $tag, '', 16);
    if ($c === false || strlen($tag) !== 16) {
        return null;
    }
    return PROVENCE_ENC_PREFIX . base64_encode($iv . $tag . $c);
}

/**
 * Decifra o que provence_cifrar() gerou. Texto sem o prefixo (mensagem antiga,
 * ainda em claro) volta como está. Falha de chave/integridade vira um marcador
 * neutro em vez de derrubar a listagem inteira.
 */
function provence_decifrar(?string $blob): ?string
{
    if ($blob === null) {
        return null;
    }
    if (strpos($blob, PROVENCE_ENC_PREFIX) !== 0) {
        return $blob;
    }
    $k = provence_chave_chat();
    if ($k === null) {
        return '[mensagem indisponível]';
    }
    $raw = base64_decode(substr($blob, strlen(PROVENCE_ENC_PREFIX)), true);
    if ($raw === false || strlen($raw) < 28) {
        return '[mensagem indisponível]';
    }
    $iv  = substr($raw, 0, 12);
    $tag = substr($raw, 12, 16);
    $c   = substr($raw, 28);
    $p   = openssl_decrypt($c, 'aes-256-gcm', $k, OPENSSL_RAW_DATA, $iv, $tag);
    return $p === false ? '[mensagem indisponível]' : $p;
}

/** Corpo JSON da requisição, ou null se não for JSON válido (form-urlencoded é recusado). */
function provence_corpo_json(): ?array
{
    $b = json_decode((string) file_get_contents('php://input'), true);
    return is_array($b) ? $b : null;
}

/** Encerra a requisição devolvendo JSON com um código HTTP. */
function provence_responder(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

/**
 * Envia a resposta JSON ao cliente e continua executando o script (para trabalho
 * lento depois da resposta, como enviar e-mail). Usa o mecanismo do servidor
 * quando existe (LiteSpeed na Hostinger, PHP-FPM) e cai num flush comum caso não.
 */
function provence_finalizar_resposta(int $status, array $payload): void
{
    ignore_user_abort(true);
    set_time_limit(60);
    http_response_code($status);
    $corpo = json_encode($payload);
    header('Content-Length: ' . strlen($corpo));
    header('Connection: close');
    echo $corpo;
    if (function_exists('litespeed_finish_request')) {
        litespeed_finish_request();
    } elseif (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } else {
        while (ob_get_level() > 0) {
            ob_end_flush();
        }
        flush();
    }
}

/** Valida CPF pelos dígitos verificadores (recusa sequências repetidas como 111.111.111-11). */
function provence_cpf_valido(string $cpf): bool
{
    $cpf = preg_replace('/\D/', '', $cpf);
    if (strlen($cpf) !== 11 || preg_match('/^(\d)\1{10}$/', $cpf)) {
        return false;
    }
    for ($t = 9; $t < 11; $t++) {
        $soma = 0;
        for ($i = 0; $i < $t; $i++) {
            $soma += (int) $cpf[$i] * (($t + 1) - $i);
        }
        $digito = (10 * $soma) % 11 % 10;
        if ((int) $cpf[$t] !== $digito) {
            return false;
        }
    }
    return true;
}
