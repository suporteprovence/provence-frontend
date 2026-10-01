<?php
/**
 * Provence — avisos por e-mail dos eventos de consulta e pagamento.
 *
 * Cada função busca os dados da consulta e dispara o e-mail para quem interessa.
 * Nenhuma delas derruba a requisição: se o envio falhar, fica só no log do servidor.
 *
 * Use sempre por último, DEPOIS de responder ao site, com
 * provence_responder_e_notificar(): o envio por SMTP leva alguns segundos e não pode
 * deixar a pessoa esperando na tela.
 *
 * Depende de config/db.php, config/seguranca.php, config/mailer.php e
 * config/email_templates.php.
 *
 * Deploy: public_html/config/notificacoes.php (arquivo novo).
 */

/**
 * Responde ao site e só então executa o trabalho lento (enviar e-mail).
 * Encerra o script no final.
 */
function provence_responder_e_notificar(int $status, array $payload, callable $depois): void
{
    if (function_exists('provence_finalizar_resposta')) {
        provence_finalizar_resposta($status, $payload);
    } else {
        http_response_code($status);
        echo json_encode($payload);
    }
    try {
        $depois();
    } catch (Throwable $e) {
        error_log('notificacoes: ' . $e->getMessage());
    }
    exit;
}

/** Dados de uma consulta com os dois lados (nome e e-mail). null se não existir. */
function provence_dados_consulta(PDO $pdo, int $consultaId): ?array
{
    try {
        $st = $pdo->prepare(
            "SELECT c.id, c.data_hora, c.valor_pago, c.status, c.link_sessao, c.link_reuniao,
                    DATE_FORMAT(c.data_hora, '%d/%m/%Y') AS data_br,
                    DATE_FORMAT(c.data_hora, '%H:%i')    AS hora_br,
                    up.nome AS paciente_nome,  up.email AS paciente_email,
                    upr.nome AS profissional_nome, upr.email AS profissional_email
               FROM consultas c
               JOIN usuarios up  ON up.id  = c.id_paciente
               JOIN usuarios upr ON upr.id = c.id_profissional
              WHERE c.id = ?"
        );
        $st->execute([$consultaId]);
        $c = $st->fetch();
        if (!$c) {
            return null;
        }
        $c['quando'] = $c['data_br'] . ' às ' . $c['hora_br'];
        $c['valor_br'] = 'R$ ' . number_format((float) $c['valor_pago'], 2, ',', '.');
        // Quanto fica para o profissional depois da taxa da plataforma
        $taxa = 0.0;
        try {
            $stT = $pdo->prepare("SELECT valor FROM configuracoes_sistema WHERE chave = 'taxa_plataforma_percent' LIMIT 1");
            $stT->execute();
            $v = $stT->fetchColumn();
            if ($v !== false && is_numeric($v)) {
                $taxa = max(0.0, min(100.0, (float) $v));
            }
        } catch (Throwable $e) {
            $taxa = 0.0;
        }
        $c['valor_profissional_br'] = 'R$ ' . number_format((float) $c['valor_pago'] * (100 - $taxa) / 100, 2, ',', '.');
        return $c;
    } catch (Throwable $e) {
        error_log('provence_dados_consulta: ' . $e->getMessage());
        return null;
    }
}

/** Carrega o mailer e os templates só na hora de enviar (evita peso em toda requisição). */
function provence_carrega_mailer(): bool
{
    if (!function_exists('enviarEmail')) {
        $m = __DIR__ . '/mailer.php';
        if (file_exists($m)) { require_once $m; }
    }
    if (!function_exists('templateBase')) {
        $t = __DIR__ . '/email_templates.php';
        if (file_exists($t)) { require_once $t; }
    }
    if (!function_exists('enviarEmail') || !function_exists('templateBase')) {
        error_log('notificacoes: mailer ou templates ausentes, aviso não enviado');
        return false;
    }
    return true;
}

/**
 * Já mandamos este aviso desta consulta há pouco? Evita e-mail repetido quando o
 * mesmo evento chega por dois caminhos (o aviso do Mercado Pago e a nossa própria
 * ação podem se cruzar).
 */
function provence_aviso_repetido(PDO $pdo, string $acao, int $consultaId, int $janelaMin, string $variante = ''): bool
{
    if ($consultaId <= 0) {
        return false;
    }
    $janela = (int) max(1, min(1440, $janelaMin));
    try {
        // Só conta aviso que REALMENTE saiu: a ação de falha é outra ('..._falhou'),
        // então uma tentativa frustrada não bloqueia a próxima.
        $st = $pdo->prepare(
            'SELECT 1 FROM logs_sistema
              WHERE acao = ? AND descricao LIKE ? AND criado_em > NOW() - INTERVAL ' . $janela . ' MINUTE
              LIMIT 1'
        );
        $st->execute([$acao, provence_chave_aviso($consultaId, $variante) . '%']);
        return (bool) $st->fetchColumn();
    } catch (Throwable $e) {
        return false;
    }
}

/**
 * Identifica o aviso na trilha de auditoria. A "variante" separa avisos do mesmo tipo
 * que têm conteúdo diferente (por exemplo, dois links de sessão distintos).
 */
function provence_chave_aviso(int $consultaId, string $variante = ''): string
{
    return 'consulta ' . $consultaId . '|' . substr($variante, 0, 16) . '|';
}

/** Esconde o meio do e-mail antes de gravar na auditoria (dado pessoal, LGPD). */
function provence_email_mascarado(string $email): string
{
    $at = strpos($email, '@');
    if ($at === false) {
        return '***';
    }
    $nome = substr($email, 0, $at);
    $visivel = mb_substr($nome, 0, 2);
    return $visivel . str_repeat('*', max(1, mb_strlen($nome) - 2)) . substr($email, $at);
}

/** Envia e registra na auditoria, sem nunca interromper o fluxo. */
function provence_avisar(PDO $pdo, string $para, string $nome, string $assunto, string $html, string $evento, int $consultaId = 0, int $janelaMin = 15, string $variante = ''): bool
{
    if ($para === '' || !filter_var($para, FILTER_VALIDATE_EMAIL) || !provence_carrega_mailer()) {
        return false;
    }
    if (provence_aviso_repetido($pdo, 'aviso_' . $evento, $consultaId, $janelaMin, $variante)) {
        return false;
    }
    try {
        $r = enviarEmail($para, $nome, $assunto, $html);
        $ok = !empty($r['success']);
        if (!$ok) {
            error_log('notificacoes: falha ao enviar "' . $evento . '" da consulta ' . $consultaId . ': ' . ($r['message'] ?? ''));
        }
        if (function_exists('provence_log')) {
            provence_log(
                $pdo,
                'aviso_' . $evento . ($ok ? '' : '_falhou'),
                provence_chave_aviso($consultaId, $variante) . ($ok ? 'enviado' : 'falhou') . ' para ' . provence_email_mascarado($para)
            );
        }
        return $ok;
    } catch (Throwable $e) {
        error_log('notificacoes: ' . $e->getMessage());
        return false;
    }
}

/** Consulta recém-agendada: o profissional precisa saber que tem horário ocupado. */
function notificar_consulta_agendada(PDO $pdo, int $consultaId): void
{
    if (!provence_carrega_mailer()) {
        return;
    }
    $c = provence_dados_consulta($pdo, $consultaId);
    if (!$c) {
        return;
    }
    provence_avisar($pdo, $c['profissional_email'], $c['profissional_nome'],
        'Nova consulta agendada - Provence',
        templateConsultaAgendada($c['profissional_nome'], $c['paciente_nome'], $c['quando'], $c['valor_br'], $c['valor_profissional_br']),
        'consulta_agendada', $consultaId);
}

/** Pagamento aprovado: confirma para o paciente e avisa o profissional. */
function notificar_pagamento_aprovado(PDO $pdo, int $consultaId): void
{
    if (!provence_carrega_mailer()) {
        return;
    }
    $c = provence_dados_consulta($pdo, $consultaId);
    if (!$c) {
        return;
    }
    provence_avisar($pdo, $c['paciente_email'], $c['paciente_nome'],
        'Pagamento confirmado - Provence',
        templatePagamentoConfirmado($c['paciente_nome'], $c['profissional_nome'], $c['quando'], $c['valor_br']),
        'pagamento_confirmado', $consultaId);
    provence_avisar($pdo, $c['profissional_email'], $c['profissional_nome'],
        'Consulta paga - Provence',
        templateConsultaPaga($c['profissional_nome'], $c['paciente_nome'], $c['quando']),
        'consulta_paga', $consultaId);
}

/** O profissional salvou o link da sessão: o paciente recebe o endereço. */
function notificar_link_sessao(PDO $pdo, int $consultaId, string $link): void
{
    if (!provence_carrega_mailer()) {
        return;
    }
    $c = provence_dados_consulta($pdo, $consultaId);
    if (!$c) {
        return;
    }
    provence_avisar($pdo, $c['paciente_email'], $c['paciente_nome'],
        'Link da sua consulta - Provence',
        templateLinkSessao($c['paciente_nome'], $c['profissional_nome'], $c['quando'], $link),
        'link_sessao', $consultaId, 1, substr(sha1($link), 0, 12));
}

/** Consulta cancelada: avisa o outro lado. $porQuem = 'paciente' | 'profissional'. */
function notificar_consulta_cancelada(PDO $pdo, int $consultaId, string $porQuem, string $observacao = ''): void
{
    if (!provence_carrega_mailer()) {
        return;
    }
    $c = provence_dados_consulta($pdo, $consultaId);
    if (!$c) {
        return;
    }
    if ($porQuem === 'profissional') {
        provence_avisar($pdo, $c['paciente_email'], $c['paciente_nome'],
            'Sua consulta foi cancelada - Provence',
            templateConsultaCancelada($c['paciente_nome'], 'pelo profissional ' . $c['profissional_nome'], $c['quando'], $observacao),
            'consulta_cancelada_paciente', $consultaId);
    } else {
        provence_avisar($pdo, $c['profissional_email'], $c['profissional_nome'],
            'Consulta cancelada pelo paciente - Provence',
            templateConsultaCancelada($c['profissional_nome'], 'pelo paciente ' . $c['paciente_nome'], $c['quando'], $observacao),
            'consulta_cancelada_profissional', $consultaId);
    }
}

/**
 * Reembolso: avisa o paciente.
 * $situacao = 'pago' (dinheiro devolvido) | 'solicitado' | 'recusado'.
 */
function notificar_reembolso(PDO $pdo, int $consultaId, string $situacao, ?float $valor = null, string $observacao = ''): void
{
    if (!provence_carrega_mailer()) {
        return;
    }
    $c = provence_dados_consulta($pdo, $consultaId);
    if (!$c) {
        return;
    }
    $valorBr = $valor !== null ? 'R$ ' . number_format($valor, 2, ',', '.') : $c['valor_br'];
    $assuntos = [
        'pago'       => 'Reembolso feito - Provence',
        'solicitado' => 'Recebemos seu pedido de reembolso - Provence',
        'recusado'   => 'Sobre seu pedido de reembolso - Provence',
    ];
    provence_avisar($pdo, $c['paciente_email'], $c['paciente_nome'],
        $assuntos[$situacao] ?? 'Sobre seu reembolso - Provence',
        templateReembolso($c['paciente_nome'], $c['quando'], $valorBr, $situacao, $observacao),
        'reembolso_' . $situacao, $consultaId);
}
