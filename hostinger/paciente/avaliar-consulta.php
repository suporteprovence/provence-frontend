<?php
/**
 * Provence — Avaliação do atendimento pelo paciente (Etapa 4).
 *  GET  -> avaliações que o paciente logado já deu: {data:[{consulta_id, nota, comentario, criado_em}]}
 *  POST {consulta_id, nota(1..5), comentario?} -> registra a avaliação.
 *
 * SUBSTITUI a versão de produção, que tinha o script duplicado dentro do mesmo
 * arquivo: quando dava certo, respondia dois JSONs colados e o navegador não
 * conseguia ler. Regras: só o dono da consulta, consulta realizada e liberada
 * para avaliação (pode_ser_avaliada), uma avaliação por consulta.
 *
 * Deploy: public_html/paciente/avaliar-consulta.php (SUBSTITUI).
 */

require_once __DIR__ . '/../config/db.php';

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
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
        $st = $pdo->prepare(
            "SELECT consulta_id, nota, comentario, criado_em FROM avaliacoes WHERE id_paciente = ? ORDER BY criado_em DESC"
        );
        $st->execute([$uid]);
        echo json_encode(['success' => true, 'data' => $st->fetchAll()]);
        exit;
    }

    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
    echo json_encode(['success' => false, 'message' => 'Envie os dados em JSON.']);
    exit;
}

    $consulta_id = (int) ($body['consulta_id'] ?? 0);
    $nota        = filter_var($body['nota'] ?? null, FILTER_VALIDATE_INT);
    $comentario  = trim((string) ($body['comentario'] ?? ''));

    if ($consulta_id <= 0 || $nota === false) {
        echo json_encode(['success' => false, 'message' => 'Informe a consulta e a nota.']);
        exit;
    }
    if ($nota < 1 || $nota > 5) {
        echo json_encode(['success' => false, 'message' => 'A nota deve ser de 1 a 5.']);
        exit;
    }
    if (mb_strlen($comentario) > 1000) {
        echo json_encode(['success' => false, 'message' => 'O comentário deve ter no máximo 1000 caracteres.']);
        exit;
    }

    $pdo->beginTransaction();

    // FOR UPDATE serializa duas avaliações simultâneas da mesma consulta.
    $st = $pdo->prepare(
        "SELECT id_profissional, status, pode_ser_avaliada FROM consultas WHERE id = ? AND id_paciente = ? FOR UPDATE"
    );
    $st->execute([$consulta_id, $uid]);
    $c = $st->fetch();

    if (!$c) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Consulta não encontrada.']);
        exit;
    }
    if ($c['status'] !== 'realizada' || !(int) $c['pode_ser_avaliada']) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Essa consulta ainda não pode ser avaliada.']);
        exit;
    }
    $ja = $pdo->prepare("SELECT id FROM avaliacoes WHERE consulta_id = ?");
    $ja->execute([$consulta_id]);
    if ($ja->fetch()) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'message' => 'Você já avaliou essa consulta.']);
        exit;
    }

    $pdo->prepare(
        "INSERT INTO avaliacoes (consulta_id, id_paciente, id_profissional, nota, comentario) VALUES (?, ?, ?, ?, ?)"
    )->execute([$consulta_id, $uid, (int) $c['id_profissional'], $nota, $comentario !== '' ? $comentario : null]);

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => 'Obrigado pela avaliação!']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('avaliar-consulta: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
