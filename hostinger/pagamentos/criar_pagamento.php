<?php
/**
 * Provence — Pagamento de uma consulta pelo Mercado Pago (Checkout Pro).
 *
 *  POST /pagamentos/criar_pagamento.php   Body JSON: { "consulta_id": 123 }
 *  -> { success, data: { init_point, preference_id, ambiente } }
 *
 * Cria (ou reaproveita) a preferência de pagamento no Mercado Pago e devolve o
 * endereço para o paciente concluir o pagamento na página segura do MP. A
 * confirmação chega pelo webhook (pagamentos/webhook_pagamento.php) e pelo
 * retorno ao site (pagamentos/sincronizar_pagamento.php).
 *
 * Divisão do valor: taxa_plataforma_percent (configuracoes_sistema) fica com a
 * plataforma e o restante é do profissional.
 *
 * Deploy: public_html/pagamentos/criar_pagamento.php (arquivo novo).
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/seguranca.php';
require_once __DIR__ . '/../config/mercadopago.php';

session_start();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    provence_responder(405, ['success' => false, 'message' => 'Método não permitido.']);
}
if (!isset($_SESSION['user_id']) || !empty($_SESSION['is_admin']) || ($_SESSION['user_type'] ?? '') !== 'paciente') {
    provence_responder(401, ['success' => false, 'message' => 'Faça login como paciente para pagar.']);
}
$uid = (int) $_SESSION['user_id'];

$b = provence_corpo_json();
if ($b === null) {
    provence_responder(200, ['success' => false, 'message' => 'Envie os dados em JSON.']);
}
$consultaId = isset($b['consulta_id']) ? (int) $b['consulta_id'] : 0;
if ($consultaId <= 0) {
    provence_responder(200, ['success' => false, 'message' => 'Informe a consulta.']);
}
if (!mp_configurado()) {
    provence_responder(503, ['success' => false, 'message' => 'Pagamento online ainda não está configurado. Fale com a equipe.']);
}

try {
    $st = $pdo->prepare(
        'SELECT c.id, c.status, c.data_hora, c.valor_pago, c.id_profissional,
                up.nome AS profissional_nome, u.email AS paciente_email, u.nome AS paciente_nome
           FROM consultas c
           JOIN usuarios up ON up.id = c.id_profissional
           JOIN usuarios u  ON u.id  = c.id_paciente
          WHERE c.id = ? AND c.id_paciente = ?'
    );
    $st->execute([$consultaId, $uid]);
    $c = $st->fetch();
    if (!$c) {
        provence_responder(403, ['success' => false, 'message' => 'Consulta não encontrada.']);
    }
    if ($c['status'] !== 'pendente') {
        provence_responder(200, ['success' => false, 'message' => $c['status'] === 'paga' ? 'Essa consulta já está paga.' : 'Essa consulta não está aguardando pagamento.']);
    }
    if (strtotime((string) $c['data_hora']) <= time()) {
        provence_responder(200, ['success' => false, 'message' => 'O horário dessa consulta já passou. Agende outra.']);
    }
    $valor = round((float) $c['valor_pago'], 2);
    if ($valor < 1) {
        provence_responder(200, ['success' => false, 'message' => 'Valor da consulta inválido. Fale com a equipe.']);
    }

    // Pagamento em aberto para esta consulta? Reaproveita a preferência recente.
    $st = $pdo->prepare('SELECT * FROM pagamentos WHERE consulta_id = ? ORDER BY id DESC LIMIT 1');
    $st->execute([$consultaId]);
    $pag = $st->fetch();
    if ($pag && in_array($pag['status'], ['aprovado', 'liberado'], true)) {
        $pdo->prepare("UPDATE consultas SET status = 'paga' WHERE id = ? AND status = 'pendente'")->execute([$consultaId]);
        provence_responder(200, ['success' => false, 'message' => 'Essa consulta já está paga.']);
    }
    if ($pag && $pag['status'] === 'pendente' && !empty($pag['mp_init_point']) && !empty($pag['mp_preference_id'])
        && strtotime((string) $pag['atualizado_em']) > time() - 20 * 3600
        && abs((float) $pag['valor_total'] - $valor) < 0.01) {
        provence_responder(200, [
            'success' => true,
            'message' => 'Redirecionando para o pagamento.',
            'data'    => ['init_point' => $pag['mp_init_point'], 'preference_id' => $pag['mp_preference_id'], 'ambiente' => mp_ambiente()],
        ]);
    }

    $taxa = mp_config_numero($pdo, 'taxa_plataforma_percent', 20.0);
    $taxa = max(0.0, min(100.0, $taxa));
    $valorPlataforma   = round($valor * $taxa / 100, 2);
    $valorProfissional = round($valor - $valorPlataforma, 2);

    // Linha de pagamento (reusa a pendente/falha ou cria)
    if ($pag && in_array($pag['status'], ['pendente', 'falhou'], true)) {
        $pagId = (int) $pag['id'];
        $pdo->prepare("UPDATE pagamentos SET status = 'pendente', valor_total = ?, valor_profissional = ?, valor_plataforma = ?, mp_payment_id = NULL, mp_status_detail = NULL WHERE id = ?")
            ->execute([$valor, $valorProfissional, $valorPlataforma, $pagId]);
    } else {
        $pdo->prepare("INSERT INTO pagamentos (consulta_id, valor_total, valor_profissional, valor_plataforma, metodo_pagamento, status) VALUES (?, ?, ?, ?, NULL, 'pendente')")
            ->execute([$consultaId, $valor, $valorProfissional, $valorPlataforma]);
        $pagId = (int) $pdo->lastInsertId();
    }
    $extRef = 'provence-consulta-' . $consultaId . '-pag-' . $pagId;

    $dataHora  = strtotime((string) $c['data_hora']);
    $expira    = min(time() + 24 * 3600, $dataHora - 30 * 60);
    if ($expira < time() + 15 * 60) {
        $expira = time() + 15 * 60;
    }
    $iso = function (int $t): string {
        return date('Y-m-d\TH:i:s', $t) . substr_replace(date('O', $t), ':', 3, 0);
    };
    $retorno = mp_frontend() . '/paciente?pagamento=retorno&consulta_id=' . $consultaId;

    $preferencia = [
        'items' => [[
            'id'          => 'consulta-' . $consultaId,
            'title'       => 'Consulta online com ' . mb_substr((string) $c['profissional_nome'], 0, 80),
            'description' => 'Provence, ' . date('d/m/Y \à\s H:i', $dataHora),
            'category_id' => 'services',
            'quantity'    => 1,
            'currency_id' => 'BRL',
            'unit_price'  => $valor,
        ]],
        'payer' => [
            'email' => (string) $c['paciente_email'],
            'name'  => mb_substr((string) $c['paciente_nome'], 0, 80),
        ],
        'external_reference'   => $extRef,
        'notification_url'     => mp_api_publica() . '/pagamentos/webhook_pagamento.php',
        'back_urls'            => ['success' => $retorno, 'pending' => $retorno, 'failure' => $retorno],
        'auto_return'          => 'approved',
        'statement_descriptor' => 'PROVENCE',
        'binary_mode'          => false,
        'payment_methods'      => ['excluded_payment_types' => [['id' => 'ticket']], 'installments' => 3],
        'expires'              => true,
        'expiration_date_from' => $iso(time()),
        'expiration_date_to'   => $iso($expira),
        'metadata'             => ['consulta_id' => $consultaId, 'pagamento_id' => $pagId],
    ];

    $r = mp_request('POST', '/checkout/preferences', $preferencia, 'pref-' . $pagId . '-' . $valor . '-' . date('YmdH'));
    $corpo = $r['body'] ?? [];
    if (!in_array($r['status'], [200, 201], true) || empty($corpo['id']) || empty($corpo['init_point'])) {
        error_log('criar_pagamento: preferência falhou HTTP ' . $r['status'] . ' ' . mb_substr($r['raw'], 0, 300));
        provence_log($pdo, 'mp_preferencia_falhou', 'consulta ' . $consultaId . ' HTTP ' . $r['status'], $uid);
        provence_responder(502, ['success' => false, 'message' => 'O Mercado Pago não respondeu agora. Tente novamente em instantes.']);
    }
    $initPoint = (mp_ambiente() === 'teste' && !empty($corpo['sandbox_init_point'])) ? (string) $corpo['sandbox_init_point'] : (string) $corpo['init_point'];

    $pdo->prepare('UPDATE pagamentos SET external_reference = ?, mp_preference_id = ?, mp_init_point = ? WHERE id = ?')
        ->execute([$extRef, mb_substr((string) $corpo['id'], 0, 80), mb_substr($initPoint, 0, 500), $pagId]);
    provence_log($pdo, 'mp_preferencia_criada', 'consulta ' . $consultaId . ' pagamento ' . $pagId . ' pref ' . $corpo['id'], $uid);

    provence_responder(200, [
        'success' => true,
        'message' => 'Redirecionando para o pagamento.',
        'data'    => ['init_point' => $initPoint, 'preference_id' => (string) $corpo['id'], 'ambiente' => mp_ambiente()],
    ]);
} catch (PDOException $e) {
    error_log('criar_pagamento: ' . $e->getMessage());
    provence_responder(500, ['success' => false, 'message' => 'Erro interno do servidor']);
}
