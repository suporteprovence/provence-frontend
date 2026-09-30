<?php
/**
 * Provence — Administração de reembolsos (Etapa 2).
 *
 *  GET  /admin/reembolsos.php               -> lista (solicitados primeiro, depois os últimos 100)
 *  POST /admin/reembolsos.php  { "reembolso_id": 1, "acao": "aprovar" | "recusar", "justificativa": "..." }
 *       aprovar: estorna no Mercado Pago e marca como pago
 *       recusar: marca como recusado (o paciente vê a justificativa)
 *
 * Exige sessão de administrador. Deploy: public_html/admin/reembolsos.php (novo).
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/seguranca.php';
require_once __DIR__ . '/../config/mercadopago.php';
require_once __DIR__ . '/../config/notificacoes.php';

session_start();
if (empty($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
    provence_responder(403, ['success' => false, 'message' => 'Acesso negado. Autenticação de administrador necessária.']);
}
$adminId = (int) ($_SESSION['user_id'] ?? 0);

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
        $st = $pdo->query(
            "SELECT r.id, r.consulta_id, r.motivo, r.valor_reembolso, r.status, r.justificativa, r.data_solicitacao, r.data_resposta, r.mp_refund_id,
                    c.data_hora, c.status AS status_consulta,
                    up.nome AS paciente_nome, up.email AS paciente_email, upr.nome AS profissional_nome,
                    pg.id AS pagamento_id, pg.status AS status_pagamento, pg.metodo_pagamento, pg.mp_payment_id
               FROM reembolsos r
               JOIN consultas c   ON c.id = r.consulta_id
               JOIN usuarios up   ON up.id = c.id_paciente
               JOIN usuarios upr  ON upr.id = c.id_profissional
          LEFT JOIN pagamentos pg ON pg.id = (SELECT MAX(id) FROM pagamentos WHERE consulta_id = c.id)
              ORDER BY (r.status = 'solicitado') DESC, r.data_solicitacao DESC
              LIMIT 100"
        );
        $lista = $st->fetchAll();
        foreach ($lista as &$l) {
            $l['valor_reembolso'] = (float) $l['valor_reembolso'];
            $l['pode_estornar_automatico'] = !empty($l['mp_payment_id']) && in_array($l['status_pagamento'], ['aprovado', 'liberado'], true);
        }
        unset($l);
        provence_responder(200, ['success' => true, 'data' => $lista, 'ambiente' => mp_configurado() ? mp_ambiente() : null]);
    }

    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        provence_responder(405, ['success' => false, 'message' => 'Método não permitido.']);
    }
    $b = provence_corpo_json();
    if ($b === null) {
        provence_responder(200, ['success' => false, 'message' => 'Envie os dados em JSON.']);
    }
    $rid  = isset($b['reembolso_id']) ? (int) $b['reembolso_id'] : 0;
    $acao = (string) ($b['acao'] ?? '');
    $just = trim((string) ($b['justificativa'] ?? ''));
    if ($rid <= 0 || !in_array($acao, ['aprovar', 'recusar'], true)) {
        provence_responder(200, ['success' => false, 'message' => 'Informe o reembolso e a ação (aprovar ou recusar).']);
    }
    if ($acao === 'recusar' && mb_strlen($just) < 5) {
        provence_responder(200, ['success' => false, 'message' => 'Explique o motivo da recusa (o paciente vai ver).']);
    }

    $st = $pdo->prepare('SELECT r.*, pg.id AS pagamento_id FROM reembolsos r LEFT JOIN pagamentos pg ON pg.id = (SELECT MAX(id) FROM pagamentos WHERE consulta_id = r.consulta_id) WHERE r.id = ?');
    $st->execute([$rid]);
    $r = $st->fetch();
    if (!$r) {
        provence_responder(404, ['success' => false, 'message' => 'Reembolso não encontrado.']);
    }
    if ($r['status'] !== 'solicitado') {
        provence_responder(200, ['success' => false, 'message' => 'Esse pedido já foi respondido (' . $r['status'] . ').']);
    }

    if ($acao === 'recusar') {
        $pdo->prepare("UPDATE reembolsos SET status = 'recusado', justificativa = ?, data_resposta = NOW() WHERE id = ?")->execute([mb_substr($just, 0, 1000), $rid]);
        provence_log($pdo, 'reembolso_recusado', 'reembolso ' . $rid . ' por admin ' . $adminId);
        provence_responder_e_notificar(200, ['success' => true, 'message' => 'Pedido recusado. O paciente foi avisado por e-mail.'], function () use ($pdo, $r, $just) {
            notificar_reembolso($pdo, (int) $r['consulta_id'], 'recusado', (float) $r['valor_reembolso'], $just);
        });
    }

    if (empty($r['pagamento_id'])) {
        provence_responder(200, ['success' => false, 'message' => 'Essa consulta não tem pagamento registrado para estornar.']);
    }
    $res = mp_reembolsar($pdo, (int) $r['pagamento_id'], $rid, $just !== '' ? $just : 'Aprovado pela administração');
    if (!$res['ok']) {
        provence_responder(200, ['success' => false, 'message' => $res['message']]);
    }
    provence_log($pdo, 'reembolso_aprovado', 'reembolso ' . $rid . ' por admin ' . $adminId);
    $valorEstorno = (float) ($res['valor'] ?? $r['valor_reembolso']);
    provence_responder_e_notificar(200, ['success' => true, 'message' => $res['message'] . ' O paciente foi avisado por e-mail.'], function () use ($pdo, $r, $valorEstorno) {
        notificar_reembolso($pdo, (int) $r['consulta_id'], 'pago', $valorEstorno);
    });
} catch (PDOException $e) {
    error_log('admin/reembolsos: ' . $e->getMessage());
    provence_responder(500, ['success' => false, 'message' => 'Erro interno do servidor']);
}
