<?php
/**
 * Provence — Agendar consulta (corrigido na varredura da Etapa 3).
 *
 * O original não informava `duracao_minutos` (coluna NOT NULL sem valor padrão):
 * em MariaDB no modo estrito o INSERT falha e o paciente via o erro SQL cru na
 * tela. Agora grava 50 minutos por padrão e devolve mensagens amigáveis.
 *
 * Deploy: substitui public_html/agendamento/agendar-consulta.php
 */

require_once __DIR__ . '/../config/db.php';

session_start();


// Verificar se o usuário está logado
if (!isset($_SESSION['user_id']) || !empty($_SESSION['is_admin'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado']);
    exit;
}

$input = file_get_contents("php://input");
$data = json_decode($input, true);
if (!is_array($data)) {
    echo json_encode(['success' => false, 'message' => 'Envie os dados em JSON.']);
    exit;
}

$paciente_id = $_SESSION['user_id'];
$profissional_id = isset($data['profissional_id']) ? (int) $data['profissional_id'] : 0;
$data_consulta = $data['data'] ?? null;
$horario = $data['horario'] ?? null;
$descricao = $data['descricao'] ?? '';

if (!$profissional_id || !$data_consulta || !$horario
    || !preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $data_consulta) || !preg_match('/^\d{2}:\d{2}$/', (string) $horario)) {
    echo json_encode(['success' => false, 'message' => 'Dados obrigatórios não fornecidos']);
    exit;
}

try {
    $pdo->beginTransaction();
    
    // Verificar se o usuário é paciente
    $stmt = $pdo->prepare("SELECT tipo FROM usuarios WHERE id = ?");
    $stmt->execute([$paciente_id]);
    $usuario = $stmt->fetch();
    
    if (!$usuario || $usuario['tipo'] !== 'paciente') {
        throw new Exception('Apenas pacientes podem agendar consultas');
    }
    
    // Buscar valor da consulta
    $stmt = $pdo->prepare("SELECT p.valor_consulta FROM profissionais p JOIN usuarios u ON u.id = p.id WHERE p.id = ? AND u.ativo = 1 AND u.aprovado = 1");
    $stmt->execute([$profissional_id]);
    $profissional = $stmt->fetch();
    
    if (!$profissional) {
        throw new Exception('Profissional não encontrado');
    }
    
    $data_hora = $data_consulta . ' ' . $horario . ':00';
    if (strtotime($data_hora) === false || strtotime($data_hora) < time()) {
        throw new Exception('Escolha uma data e horário futuros');
    }
    
    // Verificar se o horário ainda está disponível
    $stmt = $pdo->prepare("
        SELECT id FROM consultas 
        WHERE id_profissional = ? 
        AND data_hora = ? 
        AND status NOT IN ('cancelada_por_nao_ocorrencia')
    ");
    $stmt->execute([$profissional_id, $data_hora]);
    $consulta_existente = $stmt->fetch();
    
    if ($consulta_existente) {
        throw new Exception('Este horário não está mais disponível');
    }
    
    // Gerar código de confirmação
    $codigo_confirmacao = strtoupper(substr(md5(uniqid()), 0, 8));
    
    // Inserir consulta
    $stmt = $pdo->prepare("
        INSERT INTO consultas (
            id_paciente, 
            id_profissional, 
            data_hora, 
            duracao_minutos,
            valor_pago, 
            status, 
            codigo_confirmacao
        ) VALUES (?, ?, ?, 50, ?, 'pendente', ?)
    ");
    
    $stmt->execute([
        $paciente_id,
        $profissional_id,
        $data_hora,
        $profissional['valor_consulta'],
        $codigo_confirmacao
    ]);
    
    $consulta_id = $pdo->lastInsertId();
    
    $pdo->commit();
    
    echo json_encode([
        'success' => true,
        'message' => 'Consulta agendada com sucesso',
        'data' => [
            'consulta_id' => $consulta_id,
            'codigo_confirmacao' => $codigo_confirmacao,
            'valor' => $profissional['valor_consulta']
        ]
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Erro ao agendar consulta: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Não foi possível agendar agora. Tente novamente.']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
