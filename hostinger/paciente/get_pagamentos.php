<?php
/**
 * Provence — Pagamentos do paciente logado (Etapa 4).
 *  GET -> uma linha por consulta, com o último pagamento e o último reembolso,
 *         e as flags do que o paciente pode fazer (calculadas no servidor para
 *         a tela não ter que adivinhar regra de negócio).
 *
 * NOVO. A tela "Pagamentos" do paciente lia campos que nenhum endpoint devolvia
 * (status_pagamento, valor), então nunca mostrava botão nenhum.
 * Requer a migração sql/05-reembolsos.sql.
 * Deploy: public_html/paciente/get_pagamentos.php (NOVO).
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/mercadopago.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado']);
    exit;
}
if (($_SESSION['user_type'] ?? '') !== 'paciente') {
    echo json_encode(['success' => false, 'message' => 'Acesso negado']);
    exit;
}

$uid = (int) $_SESSION['user_id'];

try {
    $st = $pdo->prepare(
        "SELECT c.id AS consulta_id, c.status AS status_consulta, c.valor_pago, c.data_hora,
                DATE_FORMAT(c.data_hora, '%d/%m/%Y') AS data_formatada,
                DATE_FORMAT(c.data_hora, '%H:%i')    AS horario,
                u.nome AS profissional_nome, p.especialidade,
                pg.id AS pg_id, pg.status AS pg_status, pg.valor_total AS pg_valor_total,
                pg.metodo_pagamento AS pg_metodo, pg.data_pagamento AS pg_data,
                r.id AS r_id, r.status AS r_status, r.valor_reembolso AS r_valor, r.data_solicitacao AS r_data
           FROM consultas c
           JOIN usuarios u       ON u.id = c.id_profissional
      LEFT JOIN profissionais p ON p.id = c.id_profissional
      LEFT JOIN pagamentos pg   ON pg.id = (SELECT MAX(id) FROM pagamentos WHERE consulta_id = c.id)
      LEFT JOIN reembolsos r    ON r.id  = (SELECT MAX(id) FROM reembolsos WHERE consulta_id = c.id)
          WHERE c.id_paciente = ?
       ORDER BY c.data_hora DESC"
    );
    $st->execute([$uid]);

    $out = [];
    foreach ($st->fetchAll() as $row) {
        $pgStatus = $row['pg_status'];
        $rStatus  = $row['r_status'];
        $pago     = in_array($pgStatus, ['aprovado', 'liberado'], true);
        $reembolsoAberto = in_array($rStatus, ['solicitado', 'aprovado', 'pago'], true);

        $out[] = [
            'consulta_id'        => (int) $row['consulta_id'],
            'profissional_nome'  => $row['profissional_nome'],
            'especialidade'      => $row['especialidade'],
            'data_hora'          => $row['data_hora'],
            'data_formatada'     => $row['data_formatada'],
            'horario'            => $row['horario'],
            'status_consulta'    => $row['status_consulta'],
            'valor'              => (float) $row['valor_pago'],
            'pagamento'          => $row['pg_id'] ? [
                'id'     => (int) $row['pg_id'],
                'status' => $pgStatus,
                'valor'  => (float) $row['pg_valor_total'],
                'metodo' => $row['pg_metodo'],
                'data'   => $row['pg_data'],
            ] : null,
            'reembolso'          => $row['r_id'] ? [
                'id'     => (int) $row['r_id'],
                'status' => $rStatus,
                'valor'  => (float) $row['r_valor'],
                'data'   => $row['r_data'],
            ] : null,
            // Regras (as mesmas que o servidor aplica ao executar a ação):
            'pode_pagar'           => $row['status_consulta'] === 'pendente' && !$pago && strtotime((string) $row['data_hora']) > time(),
            'pode_pedir_reembolso' => $pago && $row['status_consulta'] !== 'realizada' && !$reembolsoAberto,
        ];
    }
    echo json_encode([
        'success' => true,
        'data' => $out,
        'pagamento_online' => mp_configurado(),
        'ambiente' => mp_configurado() ? mp_ambiente() : null,
        'reembolso_horas_min' => (int) mp_config_numero($pdo, 'reembolso_horas_min', 24.0),
    ]);
} catch (Exception $e) {
    error_log('get_pagamentos (paciente): ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
