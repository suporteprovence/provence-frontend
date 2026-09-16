<?php
/**
 * Provence — Confere no Mercado Pago o pagamento de uma consulta (Etapa 2).
 *
 *  POST /pagamentos/sincronizar_pagamento.php
 *  Body JSON: { "consulta_id": 123, "payment_id": "456" }   (payment_id opcional)
 *
 * Usado quando o paciente volta do checkout (o MP manda payment_id na URL) e no
 * botão "Atualizar status". Sempre busca a verdade no MP; nunca confia na URL.
 *
 * Deploy: public_html/pagamentos/sincronizar_pagamento.php (arquivo novo).
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/seguranca.php';
require_once __DIR__ . '/../config/mercadopago.php';

session_start();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    provence_responder(405, ['success' => false, 'message' => 'Método não permitido.']);
}
if (!isset($_SESSION['user_id']) || !empty($_SESSION['is_admin']) || ($_SESSION['user_type'] ?? '') !== 'paciente') {
    provence_responder(401, ['success' => false, 'message' => 'Usuário não autenticado']);
}
$uid = (int) $_SESSION['user_id'];

$b = provence_corpo_json();
if ($b === null) {
    provence_responder(200, ['success' => false, 'message' => 'Envie os dados em JSON.']);
}
$consultaId = isset($b['consulta_id']) ? (int) $b['consulta_id'] : 0;
$paymentId  = isset($b['payment_id']) ? trim((string) $b['payment_id']) : '';
if ($consultaId <= 0) {
    provence_responder(200, ['success' => false, 'message' => 'Informe a consulta.']);
}

$responder = function () use ($pdo, $consultaId) {
    $st = $pdo->prepare('SELECT c.status AS status_consulta, p.status AS status_pagamento, p.metodo_pagamento, p.mp_status_detail, p.valor_total
                           FROM consultas c LEFT JOIN pagamentos p ON p.id = (SELECT MAX(id) FROM pagamentos WHERE consulta_id = c.id)
                          WHERE c.id = ?');
    $st->execute([$consultaId]);
    $row = $st->fetch() ?: [];
    provence_responder(200, ['success' => true, 'data' => [
        'consulta_id'      => $consultaId,
        'status_consulta'  => $row['status_consulta'] ?? null,
        'status_pagamento' => $row['status_pagamento'] ?? null,
        'metodo'           => $row['metodo_pagamento'] ?? null,
        'detalhe'          => $row['mp_status_detail'] ?? null,
        'valor'            => isset($row['valor_total']) ? (float) $row['valor_total'] : null,
        'ambiente'         => mp_ambiente(),
    ]]);
};

try {
    $st = $pdo->prepare('SELECT id FROM consultas WHERE id = ? AND id_paciente = ?');
    $st->execute([$consultaId, $uid]);
    if (!$st->fetchColumn()) {
        provence_responder(403, ['success' => false, 'message' => 'Consulta não encontrada.']);
    }
    if (!mp_configurado()) {
        $responder();
    }

    $st = $pdo->prepare('SELECT id, status, mp_payment_id, external_reference FROM pagamentos WHERE consulta_id = ? ORDER BY id DESC LIMIT 1');
    $st->execute([$consultaId]);
    $pag = $st->fetch();
    if (!$pag) {
        $responder();
    }

    if ($paymentId !== '' && preg_match('/^[0-9]{1,30}$/', $paymentId)) {
        $r = mp_request('GET', '/v1/payments/' . $paymentId);
        if ($r['status'] === 200 && is_array($r['body'])) {
            // O pagamento informado na URL tem que ser desta consulta
            if ((string) ($r['body']['external_reference'] ?? '') === (string) $pag['external_reference']) {
                mp_aplicar_pagamento($pdo, $r['body']);
            } else {
                provence_log($pdo, 'mp_sync_referencia_errada', 'consulta ' . $consultaId . ' payment ' . $paymentId, $uid);
            }
        }
    } elseif (!empty($pag['mp_payment_id'])) {
        mp_sincronizar_por_payment_id($pdo, (string) $pag['mp_payment_id']);
    } elseif (!empty($pag['external_reference'])) {
        $r = mp_request('GET', '/v1/payments/search?sort=date_created&criteria=desc&external_reference=' . rawurlencode((string) $pag['external_reference']));
        $lista = $r['body']['results'] ?? [];
        if ($r['status'] === 200 && is_array($lista) && count($lista) > 0) {
            // prioriza aprovado/estornado; senão o mais recente
            usort($lista, function ($a, $b) {
                $peso = ['approved' => 0, 'refunded' => 0, 'charged_back' => 0, 'in_process' => 1, 'pending' => 1, 'rejected' => 2, 'cancelled' => 2];
                return ($peso[$a['status'] ?? ''] ?? 3) <=> ($peso[$b['status'] ?? ''] ?? 3);
            });
            mp_aplicar_pagamento($pdo, $lista[0]);
        }
    }
    $responder();
} catch (PDOException $e) {
    error_log('sincronizar_pagamento: ' . $e->getMessage());
    provence_responder(500, ['success' => false, 'message' => 'Erro interno do servidor']);
}
