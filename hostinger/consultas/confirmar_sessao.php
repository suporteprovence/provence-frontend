<?php
/**
 * Provence — Confirmação de início e fim da sessão (item 5).
 *  GET  ?consulta_id=N  -> estado das confirmações (início/fim, dos dois lados)
 *  POST {consulta_id, fase}  -> registra a confirmação do usuário logado
 *      fase: 'inicio' | 'fim'. Quando os DOIS confirmam o 'fim', a consulta
 *      vira 'realizada' e o pagamento é liberado.
 *
 * Requer a migração hostinger/sql/04-confirmacao-sessao.sql.
 * Deploy: public_html/consultas/confirmar_sessao.php (arquivo novo).
 */

require_once __DIR__ . '/../config/db.php'; // $pdo + CORS + headers + OPTIONS

session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado']);
    exit;
}
$uid = (int) $_SESSION['user_id'];

/** 'paciente' | 'profissional' se participa; false se não; null se consulta não existe. */
function papelNaConsulta(PDO $pdo, int $consulta_id, int $uid)
{
    $st = $pdo->prepare("SELECT id_paciente, id_profissional FROM consultas WHERE id = ?");
    $st->execute([$consulta_id]);
    $c = $st->fetch();
    if (!$c) return null;
    if ((int) $c['id_paciente'] === $uid) return 'paciente';
    if ((int) $c['id_profissional'] === $uid) return 'profissional';
    return false;
}

function estadoConfirmacoes(PDO $pdo, int $consulta_id): array
{
    $r = [
        'inicio' => ['paciente' => false, 'profissional' => false],
        'fim'    => ['paciente' => false, 'profissional' => false],
    ];
    $st = $pdo->prepare("SELECT quem, fase FROM confirmacoes_sessao WHERE consulta_id = ?");
    $st->execute([$consulta_id]);
    foreach ($st->fetchAll() as $row) {
        if (isset($r[$row['fase']][$row['quem']])) {
            $r[$row['fase']][$row['quem']] = true;
        }
    }
    return $r;
}

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'GET') {
        $consulta_id = (int) ($_GET['consulta_id'] ?? 0);
        $papel = papelNaConsulta($pdo, $consulta_id, $uid);
        if ($papel === null) {
            echo json_encode(['success' => false, 'message' => 'Consulta não encontrada']);
            exit;
        }
        if ($papel === false) {
            echo json_encode(['success' => false, 'message' => 'Acesso negado']);
            exit;
        }
        $st = $pdo->prepare("SELECT status FROM consultas WHERE id = ?");
        $st->execute([$consulta_id]);
        $status = $st->fetchColumn();
        echo json_encode([
            'success' => true,
            'data' => array_merge(
                ['consulta_id' => $consulta_id, 'meu_papel' => $papel, 'status_consulta' => $status],
                estadoConfirmacoes($pdo, $consulta_id)
            ),
        ]);
        exit;
    }

    // POST — registrar confirmação
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        $body = $_POST;
    }
    $consulta_id = (int) ($body['consulta_id'] ?? 0);
    $fase = (string) ($body['fase'] ?? '');

    if (!in_array($fase, ['inicio', 'fim'], true)) {
        echo json_encode(['success' => false, 'message' => 'Fase inválida.']);
        exit;
    }
    $papel = papelNaConsulta($pdo, $consulta_id, $uid);
    if ($papel === null) {
        echo json_encode(['success' => false, 'message' => 'Consulta não encontrada']);
        exit;
    }
    if ($papel === false) {
        echo json_encode(['success' => false, 'message' => 'Acesso negado']);
        exit;
    }

    $pdo->beginTransaction();

    // Fim exige que o mesmo participante já tenha confirmado o início
    if ($fase === 'fim') {
        $st = $pdo->prepare("SELECT 1 FROM confirmacoes_sessao WHERE consulta_id = ? AND quem = ? AND fase = 'inicio'");
        $st->execute([$consulta_id, $papel]);
        if (!$st->fetch()) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => 'Confirme o início da sessão antes de confirmar o fim.']);
            exit;
        }
    }

    $pdo->prepare(
        "INSERT INTO confirmacoes_sessao (consulta_id, quem, fase, confirmado_em)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE confirmado_em = confirmado_em"
    )->execute([$consulta_id, $papel, $fase]);

    // Os dois confirmaram o fim?
    $st = $pdo->prepare("SELECT COUNT(DISTINCT quem) AS n FROM confirmacoes_sessao WHERE consulta_id = ? AND fase = 'fim'");
    $st->execute([$consulta_id]);
    $ambosFim = ((int) $st->fetchColumn()) >= 2;

    $pagamento_liberado = false;
    $status_consulta = null;
    if ($ambosFim) {
        $pdo->prepare("UPDATE consultas SET status = 'realizada', pode_ser_avaliada = TRUE WHERE id = ?")->execute([$consulta_id]);
        $pdo->prepare("UPDATE pagamentos SET status = 'liberado', data_liberacao = NOW() WHERE consulta_id = ? AND status != 'liberado'")->execute([$consulta_id]);
        $pagamento_liberado = true;
        $status_consulta = 'realizada';
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => $ambosFim ? 'Sessão confirmada pelos dois lados. Pagamento liberado.' : 'Confirmação registrada.',
        'pagamento_liberado' => $pagamento_liberado,
        'status_consulta' => $status_consulta,
        'estado' => estadoConfirmacoes($pdo, $consulta_id),
    ]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('confirmar_sessao: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
