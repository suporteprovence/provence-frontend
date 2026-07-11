<?php
/**
 * Provence — Cancelamento de consulta pelo profissional.
 *
 * O paciente já tinha paciente/cancel_consulta.php; o profissional não tinha
 * endpoint (o front chamava o do paciente, que só autoriza id_paciente, então
 * o cancelamento do profissional nunca funcionava). Espelha a regra do paciente:
 * apenas muda o status para 'cancelada_por_nao_ocorrencia'. Não faz reembolso
 * automático (reembolso é fluxo separado, igual ao do paciente).
 *
 * Deploy: public_html/profissional/cancelar_consulta.php (NOVO).
 */

require_once __DIR__ . '/../config/db.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado']);
    exit;
}
if (($_SESSION['user_type'] ?? '') !== 'profissional') {
    echo json_encode(['success' => false, 'message' => 'Acesso negado.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    $data = $_POST;
}
$consulta_id = isset($data['consulta_id']) ? (int) $data['consulta_id'] : 0;
if (!$consulta_id) {
    echo json_encode(['success' => false, 'message' => 'ID da consulta é obrigatório']);
    exit;
}

try {
    $pdo->beginTransaction();

    // Só o profissional dono da consulta pode cancelar; trava a linha.
    $stmt = $pdo->prepare("SELECT status FROM consultas WHERE id = ? AND id_profissional = ? FOR UPDATE");
    $stmt->execute([$consulta_id, (int) $_SESSION['user_id']]);
    $status = $stmt->fetchColumn();

    if ($status === false) {
        throw new Exception('Consulta não encontrada ou você não tem permissão para cancelá-la.');
    }
    if (in_array($status, ['realizada', 'cancelada_por_nao_ocorrencia'], true)) {
        throw new Exception('Esta consulta não pode ser cancelada.');
    }

    $pdo->prepare("UPDATE consultas SET status = 'cancelada_por_nao_ocorrencia' WHERE id = ?")->execute([$consulta_id]);

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => 'Consulta cancelada com sucesso!']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('cancelar_consulta (profissional): ' . $e->getMessage());
    // Mensagens de regra de negócio são seguras; erros de banco viram genérico.
    $msg = ($e instanceof PDOException) ? 'Erro interno do servidor' : $e->getMessage();
    echo json_encode(['success' => false, 'message' => $msg]);
}
