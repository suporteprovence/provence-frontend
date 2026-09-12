<?php
/**
 * Provence — Define os horários de trabalho do profissional logado (Etapa 1).
 *  POST {horarios: [{dia_semana, horario_inicio:"HH:MM", horario_fim:"HH:MM"}, ...]}
 *  Substitui TODA a agenda semanal do profissional (apaga e reinsere, em transação).
 *  Lista vazia é válida e limpa a agenda.
 *
 * SUBSTITUI a versão de produção (colunas inexistentes e sem checagem de sessão).
 * Deploy: public_html/profissionais/definir_horarios.php (SUBSTITUI).
 */

require_once __DIR__ . '/../config/db.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado']);
    exit;
}
if (($_SESSION['user_type'] ?? '') !== 'profissional') {
    echo json_encode(['success' => false, 'message' => 'Acesso negado']);
    exit;
}

$uid  = (int) $_SESSION['user_id'];
$DIAS = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body) || !isset($body['horarios']) || !is_array($body['horarios'])) {
    echo json_encode(['success' => false, 'message' => 'Envie a lista "horarios".']);
    exit;
}

/** "HH:MM" ou "HH:MM:SS" -> minutos desde 00:00, ou null se inválido. */
function minutos(string $t): ?int
{
    if (!preg_match('/^(\d{2}):(\d{2})(?::[0-5]\d)?$/', $t, $m)) return null;
    $h = (int) $m[1]; $mi = (int) $m[2];
    if ($h > 23 || $mi > 59) return null;
    return $h * 60 + $mi;
}

$limpos = [];
$erros  = [];
foreach ($body['horarios'] as $i => $h) {
    $dia = (string) ($h['dia_semana'] ?? '');
    $ini = trim((string) ($h['horario_inicio'] ?? ''));
    $fim = trim((string) ($h['horario_fim'] ?? ''));

    if (!in_array($dia, $DIAS, true)) { $erros[] = "Item " . ($i + 1) . ": dia da semana inválido."; continue; }
    $mi = minutos($ini); $mf = minutos($fim);
    if ($mi === null || $mf === null) { $erros[] = "Item " . ($i + 1) . " ($dia): horário deve estar no formato HH:MM."; continue; }
    if ($mi >= $mf) { $erros[] = "Item " . ($i + 1) . " ($dia): o horário de início deve ser antes do fim."; continue; }

    // Rejeita faixas que se sobrepõem no mesmo dia (ex.: 09:00-12:00 e 11:00-14:00)
    foreach ($limpos as $l) {
        if ($l['dia'] === $dia && $mi < $l['mf'] && $mf > $l['mi']) {
            $erros[] = "Item " . ($i + 1) . " ($dia): esse horário se sobrepõe a outro do mesmo dia.";
            continue 2;
        }
    }
    $limpos[] = ['dia' => $dia, 'ini' => substr($ini, 0, 5) . ':00', 'fim' => substr($fim, 0, 5) . ':00', 'mi' => $mi, 'mf' => $mf];
}

if (!empty($erros)) {
    echo json_encode(['success' => false, 'message' => 'Há horários inválidos.', 'erros' => $erros]);
    exit;
}

try {
    $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM horarios_trabalho WHERE id_profissional = ?")->execute([$uid]);
    $ins = $pdo->prepare(
        "INSERT INTO horarios_trabalho (id_profissional, dia_semana, horario_inicio, horario_fim) VALUES (?, ?, ?, ?)"
    );
    foreach ($limpos as $l) {
        $ins->execute([$uid, $l['dia'], $l['ini'], $l['fim']]);
    }
    $pdo->commit();
    echo json_encode(['success' => true, 'message' => 'Horários salvos com sucesso.', 'total' => count($limpos)]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('definir_horarios: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
