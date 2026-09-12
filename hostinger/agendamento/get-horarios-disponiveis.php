<?php
/**
 * Provence — Horários livres de um profissional numa data (tela de agendamento).
 *  GET ?profissional_id=&data=YYYY-MM-DD -> {success:true, data:["09:00","10:00",...]}
 *
 * SUBSTITUI a versão de produção, que lia só UMA faixa do dia (fetch()); a nova
 * tela "Meus Horários" permite várias faixas por dia (ex.: manhã e tarde com
 * intervalo de almoço), então aqui é preciso somar os blocos de TODAS as faixas
 * daquele dia da semana (fetchAll()). Mantém: respeita dia bloqueado, remove
 * horários já ocupados e, se for hoje, os que já passaram.
 *
 * Deploy: public_html/agendamento/get-horarios-disponiveis.php (SUBSTITUI).
 */

require_once __DIR__ . '/../config/db.php';

session_start();

$profissional_id = isset($_GET['profissional_id']) ? (int) $_GET['profissional_id'] : 0;
$data = $_GET['data'] ?? '';

if ($profissional_id <= 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $data)) {
    echo json_encode(['success' => false, 'message' => 'Parâmetros obrigatórios não fornecidos']);
    exit;
}

try {
    if (strtotime($data) < strtotime(date('Y-m-d'))) {
        echo json_encode(['success' => false, 'message' => 'Não é possível agendar para datas passadas']);
        exit;
    }

    $dias_semana = [
        'Sunday' => 'domingo', 'Monday' => 'segunda', 'Tuesday' => 'terca', 'Wednesday' => 'quarta',
        'Thursday' => 'quinta', 'Friday' => 'sexta', 'Saturday' => 'sabado',
    ];
    $dia_semana = $dias_semana[date('l', strtotime($data))];

    // TODAS as faixas de trabalho do dia (pode ter mais de uma).
    $stmt = $pdo->prepare(
        "SELECT horario_inicio, horario_fim FROM horarios_trabalho WHERE id_profissional = ? AND dia_semana = ?"
    );
    $stmt->execute([$profissional_id, $dia_semana]);
    $faixas = $stmt->fetchAll();

    if (!$faixas) {
        echo json_encode(['success' => true, 'data' => [], 'message' => 'Profissional não trabalha neste dia']);
        exit;
    }

    // Dia bloqueado (folga/feriado)?
    $stmt = $pdo->prepare("SELECT id FROM dias_bloqueados WHERE id_profissional = ? AND data_bloqueada = ?");
    $stmt->execute([$profissional_id, $data]);
    if ($stmt->fetch()) {
        echo json_encode(['success' => true, 'data' => [], 'message' => 'Data não disponível']);
        exit;
    }

    // Gera blocos de 1h de cada faixa e junta.
    $possiveis = [];
    foreach ($faixas as $f) {
        $ini = strtotime($f['horario_inicio']);
        $fim = strtotime($f['horario_fim']);
        for ($h = $ini; $h < $fim; $h += 3600) {
            $possiveis[date('H:i', $h)] = true; // chave = dedupe automático
        }
    }
    $possiveis = array_keys($possiveis);

    // Remove horários já ocupados por outras consultas ativas.
    $stmt = $pdo->prepare(
        "SELECT DATE_FORMAT(data_hora, '%H:%i') AS h FROM consultas
          WHERE id_profissional = ? AND DATE(data_hora) = ? AND status NOT IN ('cancelada_por_nao_ocorrencia')"
    );
    $stmt->execute([$profissional_id, $data]);
    $ocupados = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $livres = array_values(array_diff($possiveis, $ocupados));

    // Se for hoje, tira o que já passou.
    if ($data === date('Y-m-d')) {
        $agora = date('H:i');
        $livres = array_values(array_filter($livres, fn ($h) => $h > $agora));
    }

    sort($livres);
    echo json_encode(['success' => true, 'data' => $livres]);
} catch (Exception $e) {
    error_log('get-horarios-disponiveis: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
