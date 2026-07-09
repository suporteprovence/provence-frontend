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

if (!isset($_SESSION['user_id'])) {
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
            (isset($data['valor_consulta']) && $data['valor_consulta'] !== '') ? $data['valor_consulta'] : null,
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
