<?php
/**
 * Provence — Perfil: buscar dados do usuário logado.
 *
 * Corrige a versão anterior, que referenciava colunas inexistentes
 * (experiencia_anos, descricao, localizacao) e quebrava para todos.
 * Agora usa o schema real: dados básicos em `usuarios` e os específicos
 * em `profissionais` / `pacientes`.
 *
 * Deploy: substitui public_html/usuarios/get_perfil.php
 */

require_once __DIR__ . '/../config/db.php'; // $pdo + CORS + headers (mesmo do resto do site)

session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado']);
    exit;
}

$user_id = (int) $_SESSION['user_id'];

try {
    $stmt = $pdo->prepare(
        "SELECT id, nome, email, telefone, cpf, tipo, aprovado
         FROM usuarios WHERE id = ? AND ativo = 1"
    );
    $stmt->execute([$user_id]);
    $usuario = $stmt->fetch();

    if (!$usuario) {
        echo json_encode(['success' => false, 'message' => 'Usuário não encontrado']);
        exit;
    }

    $data = [
        'id'           => (int) $usuario['id'],
        'nome'         => $usuario['nome'],
        'email'        => $usuario['email'],
        'telefone'     => $usuario['telefone'],
        'cpf'          => $usuario['cpf'],
        'tipo_usuario' => $usuario['tipo'],
        'aprovado'     => (bool) $usuario['aprovado'],
    ];

    if ($usuario['tipo'] === 'profissional') {
        $stmt = $pdo->prepare(
            "SELECT crp, especialidade, valor_consulta, bio, data_nascimento, cidade, estado
             FROM profissionais WHERE id = ?"
        );
        $stmt->execute([$user_id]);
        $p = $stmt->fetch() ?: [];
        $data['crp']             = $p['crp'] ?? null;
        $data['especialidade']   = $p['especialidade'] ?? null;
        $data['valor_consulta']  = $p['valor_consulta'] ?? null;
        $data['bio']             = $p['bio'] ?? null;
        $data['data_nascimento'] = $p['data_nascimento'] ?? null;
        $data['cidade']          = $p['cidade'] ?? null;
        $data['estado']          = $p['estado'] ?? null;
    } elseif ($usuario['tipo'] === 'paciente') {
        $stmt = $pdo->prepare(
            "SELECT data_nascimento, cidade, estado FROM pacientes WHERE id = ?"
        );
        $stmt->execute([$user_id]);
        $p = $stmt->fetch() ?: [];
        $data['data_nascimento'] = $p['data_nascimento'] ?? null;
        $data['cidade']          = $p['cidade'] ?? null;
        $data['estado']          = $p['estado'] ?? null;
    }

    echo json_encode(['success' => true, 'message' => 'Perfil encontrado', 'data' => $data]);
} catch (Exception $e) {
    error_log("Erro ao buscar perfil: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
