<?php
/**
 * Provence — Recuperação de senha (passo 1): pede o link por e-mail.
 *
 *  POST /verificar_email.php   Body JSON: { "email": "..." }
 *
 * Substitui a versão interina (e-mail + CPF, sem e-mail). Agora:
 *   - gera um token aleatório de 256 bits, guarda só o SHA-256 dele em
 *     tokens_recuperacao (validade 1 hora, uso único) e manda o link por e-mail;
 *   - responde SEMPRE a mesma coisa, exista a conta ou não (não dá para usar a
 *     tela para descobrir quem tem cadastro);
 *   - no máximo 3 pedidos por conta e 10 por IP a cada hora.
 *
 * Link enviado: {FRONTEND_URL}/esqueci-senha?token=...
 *   FRONTEND_URL vem do .env (já existe em produção).
 *
 * Deploy: substitui public_html/verificar_email.php (raiz). Mantém o nome do
 * arquivo para o site continuar apontando para o mesmo endereço.
 */

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/seguranca.php';
require_once __DIR__ . '/config/mailer.php';
require_once __DIR__ . '/config/email_templates.php';

const RECUPERACAO_VALIDADE_MIN   = 60;
const RECUPERACAO_MAX_POR_CONTA  = 3;   // por hora
const RECUPERACAO_MAX_POR_IP     = 10;  // por hora

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    provence_responder(405, ['success' => false, 'message' => 'Método não permitido.']);
}

$b = provence_corpo_json();
if ($b === null) {
    provence_responder(200, ['success' => false, 'message' => 'Envie os dados em JSON.']);
}

$email = mb_strtolower(trim((string) ($b['email'] ?? '')));
if ($email === '' || mb_strlen($email) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    provence_responder(200, ['success' => false, 'message' => 'Informe um e-mail válido.']);
}

// Mesma resposta para conta existente, inexistente ou limitada.
$generica = [
    'success' => true,
    'message' => 'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha em alguns minutos. Confira também a caixa de spam.',
];

$ip = provence_ip();

try {
    // Limite por IP (conta pedidos registrados na auditoria na última hora)
    $st = $pdo->prepare(
        "SELECT COUNT(*) FROM logs_sistema
          WHERE acao = 'senha_solicitada' AND ip_address = ? AND criado_em > NOW() - INTERVAL 1 HOUR"
    );
    $st->execute([$ip]);
    if ((int) $st->fetchColumn() >= RECUPERACAO_MAX_POR_IP) {
        provence_responder(200, $generica);
    }

    $st = $pdo->prepare('SELECT id, nome, email FROM usuarios WHERE email = ? AND ativo = 1');
    $st->execute([$email]);
    $u = $st->fetch();

    if (!$u) {
        provence_log($pdo, 'senha_solicitada', 'e-mail não cadastrado');
        provence_responder(200, $generica);
    }

    $uid = (int) $u['id'];

    // Limite por conta
    $st = $pdo->prepare(
        'SELECT COUNT(*) FROM tokens_recuperacao WHERE usuario_id = ? AND criado_em > NOW() - INTERVAL 1 HOUR'
    );
    $st->execute([$uid]);
    if ((int) $st->fetchColumn() >= RECUPERACAO_MAX_POR_CONTA) {
        provence_log($pdo, 'senha_solicitada', 'limite por conta atingido', $uid);
        provence_responder(200, $generica);
    }

    // Token: 32 bytes aleatórios; no banco fica só o hash (quem ler a tabela não
    // consegue montar o link). Pedidos anteriores ainda abertos são invalidados.
    $token = bin2hex(random_bytes(32));
    $hash  = hash('sha256', $token);

    $pdo->beginTransaction();
    $pdo->prepare('UPDATE tokens_recuperacao SET usado = 1 WHERE usuario_id = ? AND usado = 0')->execute([$uid]);
    $st = $pdo->prepare(
        'INSERT INTO tokens_recuperacao (usuario_id, token, usado, expira_em)
         VALUES (?, ?, 0, NOW() + INTERVAL ' . RECUPERACAO_VALIDADE_MIN . ' MINUTE)'
    );
    $st->execute([$uid, $hash]);
    $tokenId = (int) $pdo->lastInsertId();
    $pdo->commit();

    $frontend = '';
    if (isset($_ENV['FRONTEND_URL']) && $_ENV['FRONTEND_URL'] !== '') {
        $frontend = (string) $_ENV['FRONTEND_URL'];
    } elseif (getenv('FRONTEND_URL') !== false && getenv('FRONTEND_URL') !== '') {
        $frontend = (string) getenv('FRONTEND_URL');
    } else {
        $frontend = 'https://provence-frontend.vercel.app';
    }
    $link = rtrim($frontend, '/') . '/esqueci-senha?token=' . $token;

    // Responde ANTES de mandar o e-mail: o envio pelo SMTP demora centenas de ms e,
    // se ficasse dentro da resposta, o tempo denunciaria se o e-mail tem conta.
    provence_log($pdo, 'senha_solicitada', 'link gerado', $uid);
    provence_finalizar_resposta(200, $generica);

    $envio = enviarEmail($u['email'], $u['nome'], 'Redefinição de senha - Provence', templateRecuperacaoSenha($u['nome'], $link, RECUPERACAO_VALIDADE_MIN));
    if (empty($envio['success'])) {
        // Sem e-mail o token não serve para nada: invalida e registra a falha para o
        // administrador ver (a pessoa pode pedir outro link).
        $pdo->prepare('UPDATE tokens_recuperacao SET usado = 1 WHERE id = ?')->execute([$tokenId]);
        error_log('verificar_email: falha ao enviar e-mail de recuperação para usuario ' . $uid . ': ' . ($envio['message'] ?? ''));
        provence_log($pdo, 'senha_envio_falhou', (string) ($envio['message'] ?? ''), $uid);
    }
    exit;
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('verificar_email: ' . $e->getMessage());
    provence_responder(500, ['success' => false, 'message' => 'Erro interno do servidor']);
}
