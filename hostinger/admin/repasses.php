<?php
/**
 * Provence — Repasses aos profissionais (Etapa 2).
 *
 *  GET  /admin/repasses.php   -> pagamentos liberados (consulta realizada) ainda não repassados,
 *                                agrupados por profissional com os dados bancários, + histórico recente
 *  POST /admin/repasses.php   { "pagamento_id": 1, "acao": "marcar_repassado" }
 *       registra que o Pix ao profissional foi feito (data_repasse = agora)
 *
 * O repasse em si é feito manualmente pela administração (Pix), conforme combinado.
 * Exige sessão de administrador. Deploy: public_html/admin/repasses.php (novo).
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/seguranca.php';

session_start();
if (empty($_SESSION['is_admin']) || $_SESSION['is_admin'] !== true) {
    provence_responder(403, ['success' => false, 'message' => 'Acesso negado. Autenticação de administrador necessária.']);
}
$adminId = (int) ($_SESSION['user_id'] ?? 0);

try {
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
        $st = $pdo->query(
            "SELECT pg.id AS pagamento_id, pg.consulta_id, pg.valor_total, pg.valor_profissional, pg.valor_plataforma,
                    pg.status, pg.data_liberacao, pg.data_repasse, pg.metodo_pagamento,
                    c.data_hora, c.id_profissional,
                    upr.nome AS profissional_nome, upr.email AS profissional_email,
                    p.banco, p.agencia, p.conta, p.tipo_conta, p.chave_pix, p.tipo_pix,
                    up.nome AS paciente_nome
               FROM pagamentos pg
               JOIN consultas c      ON c.id = pg.consulta_id
               JOIN usuarios upr     ON upr.id = c.id_profissional
          LEFT JOIN profissionais p  ON p.id = c.id_profissional
               JOIN usuarios up      ON up.id = c.id_paciente
              WHERE pg.status = 'liberado'
              ORDER BY (pg.data_repasse IS NULL) DESC, pg.data_liberacao DESC
              LIMIT 300"
        );
        $linhas = $st->fetchAll();
        $pendentes = [];
        $historico = [];
        foreach ($linhas as $l) {
            $l['valor_total']        = (float) $l['valor_total'];
            $l['valor_profissional'] = (float) $l['valor_profissional'];
            $l['valor_plataforma']   = (float) $l['valor_plataforma'];
            if ($l['data_repasse'] === null) {
                $pid = (int) $l['id_profissional'];
                if (!isset($pendentes[$pid])) {
                    $pendentes[$pid] = [
                        'id_profissional'    => $pid,
                        'profissional_nome'  => $l['profissional_nome'],
                        'profissional_email' => $l['profissional_email'],
                        'dados_bancarios'    => ['banco' => $l['banco'], 'agencia' => $l['agencia'], 'conta' => $l['conta'], 'tipo_conta' => $l['tipo_conta'], 'chave_pix' => $l['chave_pix'], 'tipo_pix' => $l['tipo_pix']],
                        'total_a_repassar'   => 0.0,
                        'itens'              => [],
                    ];
                }
                $pendentes[$pid]['total_a_repassar'] += $l['valor_profissional'];
                $pendentes[$pid]['itens'][] = ['pagamento_id' => (int) $l['pagamento_id'], 'consulta_id' => (int) $l['consulta_id'], 'data_hora' => $l['data_hora'], 'paciente_nome' => $l['paciente_nome'], 'valor_profissional' => $l['valor_profissional'], 'data_liberacao' => $l['data_liberacao']];
            } else {
                $historico[] = ['pagamento_id' => (int) $l['pagamento_id'], 'consulta_id' => (int) $l['consulta_id'], 'profissional_nome' => $l['profissional_nome'], 'valor_profissional' => $l['valor_profissional'], 'data_repasse' => $l['data_repasse']];
            }
        }
        foreach ($pendentes as &$p) {
            $p['total_a_repassar'] = round($p['total_a_repassar'], 2);
        }
        unset($p);
        provence_responder(200, ['success' => true, 'data' => ['pendentes' => array_values($pendentes), 'historico' => array_slice($historico, 0, 50)]]);
    }

    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        provence_responder(405, ['success' => false, 'message' => 'Método não permitido.']);
    }
    $b = provence_corpo_json();
    if ($b === null) {
        provence_responder(200, ['success' => false, 'message' => 'Envie os dados em JSON.']);
    }
    $pagId = isset($b['pagamento_id']) ? (int) $b['pagamento_id'] : 0;
    $acao  = (string) ($b['acao'] ?? '');
    if ($pagId <= 0 || $acao !== 'marcar_repassado') {
        provence_responder(200, ['success' => false, 'message' => 'Informe o pagamento e a ação.']);
    }
    $st = $pdo->prepare("UPDATE pagamentos SET data_repasse = NOW() WHERE id = ? AND status = 'liberado' AND data_repasse IS NULL");
    $st->execute([$pagId]);
    if ($st->rowCount() === 0) {
        provence_responder(200, ['success' => false, 'message' => 'Esse pagamento não está liberado ou já foi repassado.']);
    }
    provence_log($pdo, 'repasse_registrado', 'pagamento ' . $pagId . ' por admin ' . $adminId);
    provence_responder(200, ['success' => true, 'message' => 'Repasse registrado.']);
} catch (PDOException $e) {
    error_log('admin/repasses: ' . $e->getMessage());
    provence_responder(500, ['success' => false, 'message' => 'Erro interno do servidor']);
}
