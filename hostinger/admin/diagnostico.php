<?php
/**
 * Provence — Diagnóstico do servidor (Etapa 2). Só para administrador logado.
 *
 *  GET /admin/diagnostico.php
 *
 * Mostra, sem expor valores secretos, se o que as etapas precisam está no lugar:
 * versão do PHP e extensões, chaves do .env presentes, tabelas/colunas das
 * migrações, SMTP configurado e se o token do Mercado Pago é válido (consulta
 * GET /users/me no MP e devolve o e-mail da conta e o ambiente).
 *
 * Deploy: public_html/admin/diagnostico.php (arquivo novo).
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/seguranca.php';
require_once __DIR__ . '/../config/mercadopago.php';

session_start();
if (empty($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
    provence_responder(403, ['success' => false, 'message' => 'Acesso negado. Autenticação de administrador necessária.']);
}

$out = ['php' => PHP_VERSION, 'extensoes' => [], 'env' => [], 'banco' => [], 'email' => [], 'mercadopago' => []];

foreach (['curl', 'openssl', 'pdo_mysql', 'mbstring', 'json'] as $ext) {
    $out['extensoes'][$ext] = extension_loaded($ext);
}
$out['extensoes']['aes-256-gcm'] = extension_loaded('openssl') && in_array('aes-256-gcm', openssl_get_cipher_methods(), true);

foreach (['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS', 'MAIL_HOST', 'MAIL_USER', 'MAIL_PASS', 'MAIL_FROM', 'FRONTEND_URL', 'CHAT_KEY', 'MIGRACAO_TOKEN', 'CONTATO_DESTINO', 'MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET', 'API_PUBLIC_URL', 'CONFIAR_CF_IP'] as $k) {
    $out['env'][$k] = (isset($_ENV[$k]) && $_ENV[$k] !== '') || (getenv($k) !== false && getenv($k) !== '') ? 'definida' : 'ausente';
}
$out['env']['CHAT_KEY_valida'] = provence_chave_chat() !== null;
$out['env']['MIGRACAO_TOKEN_aviso'] = $out['env']['MIGRACAO_TOKEN'] === 'definida' ? 'apague depois de cifrar as mensagens antigas' : 'ok (removido)';

$checks = [
    'tabela tentativas_login'        => "SHOW TABLES LIKE 'tentativas_login'",
    'tabela reembolsos'              => "SHOW TABLES LIKE 'reembolsos'",
    'tabela confirmacoes_sessao'     => "SHOW TABLES LIKE 'confirmacoes_sessao'",
    'tabela consentimentos'          => "SHOW TABLES LIKE 'consentimentos'",
    'usuarios.excluido_em'           => "SHOW COLUMNS FROM usuarios LIKE 'excluido_em'",
    'pagamentos.mp_payment_id'       => "SHOW COLUMNS FROM pagamentos LIKE 'mp_payment_id'",
    'pagamentos.data_repasse'        => "SHOW COLUMNS FROM pagamentos LIKE 'data_repasse'",
    'reembolsos.mp_refund_id'        => "SHOW COLUMNS FROM reembolsos LIKE 'mp_refund_id'",
    'profissionais.chave_pix'        => "SHOW COLUMNS FROM profissionais LIKE 'chave_pix'",
];
foreach ($checks as $rotulo => $sql) {
    try {
        $out['banco'][$rotulo] = (bool) $pdo->query($sql)->fetch();
    } catch (Throwable $e) {
        $out['banco'][$rotulo] = false;
    }
}
try {
    $out['banco']['taxa_plataforma_percent'] = mp_config_numero($pdo, 'taxa_plataforma_percent', -1);
    $out['banco']['reembolso_horas_min']     = mp_config_numero($pdo, 'reembolso_horas_min', -1);
    $out['banco']['mensagens_em_claro']      = (int) $pdo->query("SELECT COUNT(*) FROM mensagens WHERE mensagem NOT LIKE 'enc:v1:%'")->fetchColumn();
    $out['banco']['pagamentos_duplicados_sem_estorno'] = (int) $pdo->query("SELECT COUNT(*) FROM logs_sistema WHERE acao = 'mp_pagamento_duplicado_sem_estorno' AND criado_em > NOW() - INTERVAL 90 DAY")->fetchColumn();
} catch (Throwable $e) {
    $out['banco']['erro'] = 'não foi possível ler configurações';
}

$out['email'] = ['smtp_host' => defined('MAIL_HOST') ? MAIL_HOST : (mp_env('MAIL_HOST') ?: 'padrão'), 'remetente' => mp_env('MAIL_FROM', 'padrão'), 'senha_smtp' => $out['env']['MAIL_PASS']];

if (!mp_configurado()) {
    $out['mercadopago'] = ['configurado' => false, 'mensagem' => 'MP_ACCESS_TOKEN ausente no .env'];
} else {
    $r = mp_request('GET', '/users/me');
    $conta = is_array($r['body']) ? $r['body'] : [];
    $out['mercadopago'] = [
        'configurado'      => true,
        'ambiente'         => mp_ambiente(),
        'token_valido'     => $r['status'] === 200,
        'http'             => $r['status'],
        'conta_email'      => $conta['email'] ?? null,
        'conta_id'         => $conta['id'] ?? null,
        'conta_nome'       => trim(($conta['first_name'] ?? '') . ' ' . ($conta['last_name'] ?? '')) ?: null,
        'site_id'          => $conta['site_id'] ?? null,
        'webhook_secret'   => $out['env']['MP_WEBHOOK_SECRET'],
        'notification_url' => mp_api_publica() . '/pagamentos/webhook_pagamento.php',
        'back_url_base'    => mp_frontend() . '/paciente?pagamento=retorno',
    ];
    if ($r['status'] !== 200) {
        $out['mercadopago']['mensagem'] = 'O Mercado Pago recusou o token (HTTP ' . $r['status'] . '). Confira MP_ACCESS_TOKEN.';
    }
}

$pendencias = [];
foreach ($out['banco'] as $k => $v) {
    if ($v === false) {
        $pendencias[] = 'banco: falta ' . $k . ' (rodar sql/migracoes-consolidado.sql)';
    }
}
if ($out['env']['CHAT_KEY_valida'] !== true) {
    $pendencias[] = '.env: CHAT_KEY ausente ou inválida (chat fica indisponível)';
}
if (($out['banco']['mensagens_em_claro'] ?? 0) > 0) {
    $pendencias[] = 'chat: ' . $out['banco']['mensagens_em_claro'] . ' mensagem(ns) antiga(s) ainda em claro (rodar admin/cifrar_mensagens_legado.php)';
}
if (($out['banco']['pagamentos_duplicados_sem_estorno'] ?? 0) > 0) {
    $pendencias[] = 'mercadopago: ' . $out['banco']['pagamentos_duplicados_sem_estorno'] . ' pagamento(s) duplicado(s) que o estorno automático não conseguiu devolver (ver logs_sistema e estornar no painel do MP)';
}
if (empty($out['mercadopago']['configurado'])) {
    $pendencias[] = '.env: MP_ACCESS_TOKEN ausente (pagamento online desligado)';
} elseif (empty($out['mercadopago']['token_valido'])) {
    $pendencias[] = 'mercadopago: token inválido';
} elseif ($out['env']['MP_WEBHOOK_SECRET'] !== 'definida') {
    $pendencias[] = '.env: MP_WEBHOOK_SECRET ausente (webhook aceito sem validar assinatura)';
}
if ($out['env']['MAIL_PASS'] !== 'definida') {
    $pendencias[] = '.env: MAIL_PASS ausente (e-mails não saem)';
}
$out['pendencias'] = $pendencias;
$out['pronto'] = count($pendencias) === 0;

provence_responder(200, ['success' => true, 'data' => $out]);
