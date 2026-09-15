<?php
/**
 * Provence — Formulário "Entre em Contato" da página inicial.
 *
 *  POST /contato.php   Body JSON: { "nome": "...", "email": "...", "mensagem": "...", "site": "" }
 *
 * Manda a mensagem por e-mail para a caixa da plataforma (CONTATO_DESTINO no .env,
 * ou o remetente padrão do mailer) com "responder para" apontando para quem escreveu.
 * Proteções: campos validados, limite de 5 mensagens por IP por hora, campo
 * escondido "site" (honeypot: robôs preenchem, pessoas não) e registro na auditoria
 * sem guardar o conteúdo.
 *
 * Deploy: public_html/contato.php (raiz, arquivo novo).
 */

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/seguranca.php';
require_once __DIR__ . '/config/mailer.php';
require_once __DIR__ . '/config/email_templates.php';

const CONTATO_MAX_POR_IP_HORA = 5;

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    provence_responder(405, ['success' => false, 'message' => 'Método não permitido.']);
}

$b = provence_corpo_json();
if ($b === null) {
    provence_responder(200, ['success' => false, 'message' => 'Envie os dados em JSON.']);
}

$nome     = trim((string) ($b['nome'] ?? ''));
$email    = mb_strtolower(trim((string) ($b['email'] ?? '')));
$mensagem = trim((string) ($b['mensagem'] ?? ''));
$honeypot = trim((string) ($b['site'] ?? ''));

// Robô preencheu o campo escondido: finge sucesso e descarta.
if ($honeypot !== '') {
    provence_responder(200, ['success' => true, 'message' => 'Mensagem enviada. Obrigado pelo contato!']);
}

if (mb_strlen($nome) < 2 || mb_strlen($nome) > 100) {
    provence_responder(200, ['success' => false, 'message' => 'Informe seu nome.']);
}
if ($email === '' || mb_strlen($email) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    provence_responder(200, ['success' => false, 'message' => 'Informe um e-mail válido.']);
}
if (mb_strlen($mensagem) < 10) {
    provence_responder(200, ['success' => false, 'message' => 'Escreva uma mensagem com pelo menos 10 caracteres.']);
}
if (mb_strlen($mensagem) > 2000) {
    provence_responder(200, ['success' => false, 'message' => 'A mensagem pode ter no máximo 2000 caracteres.']);
}

try {
    $st = $pdo->prepare(
        "SELECT COUNT(*) FROM logs_sistema
          WHERE acao = 'contato_enviado' AND ip_address = ? AND criado_em > NOW() - INTERVAL 1 HOUR"
    );
    $st->execute([provence_ip()]);
    if ((int) $st->fetchColumn() >= CONTATO_MAX_POR_IP_HORA) {
        provence_responder(429, ['success' => false, 'message' => 'Muitas mensagens em pouco tempo. Tente novamente em uma hora.']);
    }
} catch (PDOException $e) {
    error_log('contato: limite por IP falhou: ' . $e->getMessage());
}

$destino = '';
if (isset($_ENV['CONTATO_DESTINO']) && $_ENV['CONTATO_DESTINO'] !== '') {
    $destino = (string) $_ENV['CONTATO_DESTINO'];
} elseif (getenv('CONTATO_DESTINO') !== false && getenv('CONTATO_DESTINO') !== '') {
    $destino = (string) getenv('CONTATO_DESTINO');
} elseif (defined('MAIL_FROM_EMAIL')) {
    $destino = MAIL_FROM_EMAIL;
}
if ($destino === '') {
    error_log('contato: sem destino configurado (CONTATO_DESTINO ou MAIL_FROM)');
    provence_responder(500, ['success' => false, 'message' => 'Não foi possível enviar agora. Tente novamente mais tarde.']);
}

$envio = enviarEmail(
    $destino,
    'Provence',
    'Contato pelo site: ' . mb_substr(strip_tags($nome), 0, 60),
    templateContatoSite($nome, $email, $mensagem, provence_ip()),
    $email,
    $nome
);

if (empty($envio['success'])) {
    error_log('contato: falha no envio: ' . ($envio['message'] ?? ''));
    provence_responder(500, ['success' => false, 'message' => 'Não foi possível enviar agora. Tente novamente mais tarde ou escreva para ' . $destino . '.']);
}

provence_log($pdo, 'contato_enviado', 'formulário da página inicial');
provence_responder(200, ['success' => true, 'message' => 'Mensagem enviada. Obrigado pelo contato! Respondemos em breve.']);
