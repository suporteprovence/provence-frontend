<?php
/**
 * Provence — Perfil: atualizar dados do usuário logado.
 *
 * Corrige a versão anterior, que gravava em colunas inexistentes
 * (usuarios.data_nascimento, profissionais.experiencia_anos/descricao/localizacao).
 * Agora grava no schema real: básicos em `usuarios`; específicos em
 * `profissionais` / `pacientes`.
 *
 * Deploy: substitui public_html/usuarios/atualizar_perfil.php
 */

require_once __DIR__ . '/../config/db.php'; // $pdo + CORS + headers

session_start();

if (!isset($_SESSION['user_id']) || !empty($_SESSION['is_admin'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado']);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);
if (!is_array($data)) {
    echo json_encode(['success' => false, 'message' => 'Dados inválidos']);
    exit;
}

$user_id = (int) $_SESSION['user_id'];
$nascimento = !empty($data['data_nascimento']) ? $data['data_nascimento'] : null;

// Validação defensiva (o frontend valida, mas o servidor não pode confiar só nele)
// Limites da plataforma (configuração; fonte única de verdade)
$cfg_min = 50.0;
$cfg_max = 1000.0;
try {
    $cfg = $pdo->query(
        "SELECT chave, valor FROM configuracoes_sistema
         WHERE chave IN ('valor_minimo_consulta','valor_maximo_consulta')"
    )->fetchAll(PDO::FETCH_KEY_PAIR);
    if (isset($cfg['valor_minimo_consulta'])) $cfg_min = (float) $cfg['valor_minimo_consulta'];
    if (isset($cfg['valor_maximo_consulta'])) $cfg_max = (float) $cfg['valor_maximo_consulta'];
} catch (Exception $e) {
    // mantém os defaults
}

$erros = [];
if (!isset($data['nome']) || trim((string) $data['nome']) === '') {
    $erros['nome'] = 'Informe o nome.';
}

// Valor da consulta: valida e corrige automaticamente para o máximo se ultrapassar
$temValor = isset($data['valor_consulta']) && $data['valor_consulta'] !== null && $data['valor_consulta'] !== '';
$valorFinal = null;
if ($temValor) {
    if (!is_numeric($data['valor_consulta']) || (float) $data['valor_consulta'] <= 0) {
        $erros['valor_consulta'] = 'Valor da consulta inválido.';
    } else {
        $valorFinal = round((float) $data['valor_consulta'], 2);
        if ($valorFinal < $cfg_min) {
            $erros['valor_consulta'] = 'O valor mínimo é R$ ' . number_format($cfg_min, 2, ',', '.') . '.';
        } elseif ($valorFinal > $cfg_max) {
            $valorFinal = $cfg_max; // corrige automático para o máximo permitido
        }
    }
}

if (!empty($data['estado']) && !preg_match('/^[A-Za-z]{2}$/', trim((string) $data['estado']))) {
    $erros['estado'] = 'UF deve ter 2 letras.';
}
if ($nascimento !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $nascimento)) {
    $erros['data_nascimento'] = 'Data de nascimento inválida.';
}
if (!empty($erros)) {
    echo json_encode(['success' => false, 'message' => 'Dados inválidos.', 'erros' => $erros]);
    exit;
}

try {
    $pdo->beginTransaction();

    // Dados básicos (tabela usuarios)
    $stmt = $pdo->prepare("UPDATE usuarios SET nome = ?, telefone = ? WHERE id = ?");
    $stmt->execute([
        $data['nome'] ?? '',
        $data['telefone'] ?? null,
        $user_id,
    ]);

    // Descobre o tipo (usa o enviado; se não vier, consulta no banco)
    $tipo = $data['tipo_usuario'] ?? null;
    if (!$tipo) {
        $s = $pdo->prepare("SELECT tipo FROM usuarios WHERE id = ?");
        $s->execute([$user_id]);
        $tipo = $s->fetchColumn();
    }

    if ($tipo === 'profissional') {
        $stmt = $pdo->prepare(
            "UPDATE profissionais
             SET especialidade = ?, valor_consulta = ?, bio = ?, data_nascimento = ?, cidade = ?, estado = ?
             WHERE id = ?"
        );
        $stmt->execute([
            $data['especialidade'] ?? null,
            $valorFinal,
            $data['bio'] ?? null,
            $nascimento,
            $data['cidade'] ?? null,
            $data['estado'] ?? null,
            $user_id,
        ]);
    } elseif ($tipo === 'paciente') {
        $stmt = $pdo->prepare(
            "UPDATE pacientes SET data_nascimento = ?, cidade = ?, estado = ? WHERE id = ?"
        );
        $stmt->execute([
            $nascimento,
            $data['cidade'] ?? null,
            $data['estado'] ?? null,
            $user_id,
        ]);
    }

    $pdo->commit();
    echo json_encode(['success' => true, 'message' => 'Perfil atualizado com sucesso']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log("Erro ao atualizar perfil: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
