<?php
/**
 * Provence — Pagamentos do profissional (Etapa 2).
 *
 *  GET /profissional/get_pagamentos.php
 *  -> { success, data: { resumo: { a_receber, recebido, aguardando_sessao, total_mes }, pagamentos: [...] } }
 *
 * Substitui o uso de dashboard/get_pagamentos.php pela tela do profissional: mostra
 * o valor que cabe ao profissional (já sem a taxa da plataforma) e em que fase cada
 * pagamento está: aguardando a sessão (pago), liberado (a receber) ou repassado.
 *
 * Deploy: public_html/profissional/get_pagamentos.php (arquivo novo).
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/seguranca.php';

session_start();
if (!isset($_SESSION['user_id']) || !empty($_SESSION['is_admin']) || ($_SESSION['user_type'] ?? '') !== 'profissional') {
    provence_responder(401, ['success' => false, 'message' => 'Usuário não autenticado']);
}
$uid = (int) $_SESSION['user_id'];

try {
    $st = $pdo->prepare(
        "SELECT pg.id, pg.consulta_id, pg.valor_total, pg.valor_profissional, pg.valor_plataforma, pg.status,
                pg.metodo_pagamento, pg.data_pagamento, pg.data_liberacao, pg.data_repasse,
                c.data_hora, c.status AS status_consulta, DATE_FORMAT(c.data_hora, '%d/%m/%Y') AS data_formatada, DATE_FORMAT(c.data_hora, '%H:%i') AS horario,
                up.nome AS paciente_nome
           FROM pagamentos pg
           JOIN consultas c ON c.id = pg.consulta_id
           JOIN usuarios up ON up.id = c.id_paciente
          WHERE c.id_profissional = ? AND pg.status IN ('aprovado','liberado','reembolsado')
          ORDER BY c.data_hora DESC
          LIMIT 300"
    );
    $st->execute([$uid]);
    $lista = $st->fetchAll();

    $resumo = ['a_receber' => 0.0, 'recebido' => 0.0, 'aguardando_sessao' => 0.0, 'total_mes' => 0.0];
    $mesAtual = date('Y-m');
    foreach ($lista as &$l) {
        $l['valor_total']        = (float) $l['valor_total'];
        $l['valor_profissional'] = (float) $l['valor_profissional'];
        $l['valor_plataforma']   = (float) $l['valor_plataforma'];
        if ($l['status'] === 'liberado' && $l['data_repasse'] === null) {
            $l['fase'] = 'a_receber';
            $resumo['a_receber'] += $l['valor_profissional'];
        } elseif ($l['status'] === 'liberado') {
            $l['fase'] = 'recebido';
            $resumo['recebido'] += $l['valor_profissional'];
            if (substr((string) $l['data_repasse'], 0, 7) === $mesAtual) {
                $resumo['total_mes'] += $l['valor_profissional'];
            }
        } elseif ($l['status'] === 'aprovado') {
            $l['fase'] = 'aguardando_sessao';
            $resumo['aguardando_sessao'] += $l['valor_profissional'];
        } else {
            $l['fase'] = 'reembolsado';
        }
    }
    unset($l);
    foreach ($resumo as $k => $v) {
        $resumo[$k] = round($v, 2);
    }
    provence_responder(200, ['success' => true, 'data' => ['resumo' => $resumo, 'pagamentos' => $lista]]);
} catch (PDOException $e) {
    error_log('profissional/get_pagamentos: ' . $e->getMessage());
    provence_responder(500, ['success' => false, 'message' => 'Erro interno do servidor']);
}
