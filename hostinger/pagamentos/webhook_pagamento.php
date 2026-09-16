<?php
/**
 * Provence — Webhook do Mercado Pago (Etapa 2).
 *
 * O MP chama este endereço (notification_url) quando um pagamento muda:
 *   POST /pagamentos/webhook_pagamento.php?type=payment&data.id=123
 *   corpo: { "action": "payment.updated", "type": "payment", "data": { "id": "123" }, ... }
 *
 * Nunca confia no corpo: valida a assinatura (x-signature, quando MP_WEBHOOK_SECRET
 * está no .env) e busca o pagamento no próprio MP antes de mudar qualquer coisa.
 * Responde 200 rápido (senão o MP reenvia). Substitui o webhook antigo, que
 * marcava qualquer consulta como paga sem verificação (e nem executava: erro de sintaxe).
 *
 * Deploy: substitui public_html/pagamentos/webhook_pagamento.php
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/seguranca.php';
require_once __DIR__ . '/../config/mercadopago.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    provence_responder(405, ['ok' => false]);
}

$corpo = provence_corpo_json() ?? [];
// O MP manda ?type=payment&data.id=123 (o PHP expõe "data.id" como $_GET['data_id'])
parse_str((string) ($_SERVER['QUERY_STRING'] ?? ''), $q);
$tipo   = (string) ($q['type'] ?? $q['topic'] ?? $corpo['type'] ?? '');
$dataId = (string) ($q['data_id'] ?? $q['data.id'] ?? $q['id'] ?? ($corpo['data']['id'] ?? ''));

// Só pagamentos interessam; merchant_order, plan etc. são aceitos e ignorados
if ($tipo !== 'payment' || $dataId === '') {
    provence_responder(200, ['ok' => true, 'ignorado' => true]);
}

$segredo = mp_env('MP_WEBHOOK_SECRET');
if ($segredo !== '') {
    $xSig = (string) ($_SERVER['HTTP_X_SIGNATURE'] ?? '');
    $xReq = (string) ($_SERVER['HTTP_X_REQUEST_ID'] ?? '');
    if (!mp_assinatura_valida($xSig, $xReq, $dataId)) {
        provence_log($pdo, 'mp_webhook_assinatura_invalida', 'data.id=' . mb_substr($dataId, 0, 40));
        provence_responder(401, ['ok' => false, 'message' => 'Assinatura inválida.']);
    }
} else {
    error_log('webhook_pagamento: MP_WEBHOOK_SECRET não configurado; aceitando notificação sem validar assinatura (o pagamento é sempre conferido no MP).');
}

if (!mp_configurado()) {
    provence_responder(503, ['ok' => false, 'message' => 'MP não configurado.']);
}

$r = mp_sincronizar_por_payment_id($pdo, $dataId);
if (!$r['ok'] && isset($r['http']) && $r['http'] !== 404) {
    // MP fora do ar ou recusando o token: devolve 500 para o MP reenviar depois
    // (404 = pagamento não existe; reenviar não resolveria)
    provence_responder(500, ['ok' => false, 'message' => 'Tente novamente.']);
}
provence_responder(200, ['ok' => true, 'resultado' => $r['motivo'], 'status' => $r['status']]);
