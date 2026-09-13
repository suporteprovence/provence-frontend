<?php
/**
 * Provence — Completar perfil (Etapa 3: corrigido).
 *
 * A versão anterior aceitava `usuario_id` no corpo e gravava o perfil de QUALQUER
 * usuário (sem sessão). Agora o id vem da sessão: login normal (user_id) ou a
 * sessão de cadastro criada por auth/register.php (onboarding_user_id).
 * CORS/headers vêm do config/db.php como no resto do site.
 *
 * Deploy: substitui public_html/auth/completar_perfil.php
 */

require_once __DIR__ . '/../config/db.php';

session_start();

function logError($message, $data = null) {
    $logMessage = date('Y-m-d H:i:s') . " - " . $message;
    if ($data) {
        $logMessage .= " - Data: " . json_encode($data);
    }
    error_log($logMessage);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(array('success' => false, 'message' => 'Metodo nao permitido'));
    exit;
}

$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    logError("Erro ao decodificar JSON", $input);
    echo json_encode(array('success' => false, 'message' => 'Dados JSON invalidos'));
    exit;
}

// Etapa 3: o id vem da SESSÃO, nunca do corpo da requisição.
$usuario_id = 0;
if (isset($_SESSION['onboarding_user_id'])) {
    $usuario_id = (int) $_SESSION['onboarding_user_id'];
} elseif (isset($_SESSION['user_id']) && empty($_SESSION['is_admin'])) {
    $usuario_id = (int) $_SESSION['user_id'];
}
if ($usuario_id <= 0) {
    http_response_code(401);
    echo json_encode(array('success' => false, 'message' => 'Sessão não encontrada. Faça login ou refaça o cadastro.'));
    exit;
}

$camposObrigatorios = array('endereco', 'cidade', 'estado');
foreach ($camposObrigatorios as $campo) {
    if (!isset($data[$campo]) || trim($data[$campo]) === '') {
        echo json_encode(array('success' => false, 'message' => "Campo obrigatorio nao preenchido: $campo"));
        exit;
    }
}

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("SELECT id, tipo FROM usuarios WHERE id = ?");
    $stmt->execute(array($usuario_id));
    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$usuario) {
        $pdo->rollBack();
        echo json_encode(array('success' => false, 'message' => 'Usuario nao encontrado'));
        exit;
    }

    $tipoUsuario = $usuario['tipo'];
    logError("Processando perfil para usuario", array('id' => $usuario_id, 'tipo' => $tipoUsuario));

    if ($tipoUsuario === 'paciente') {

        if (!isset($data['data_nascimento']) || empty($data['data_nascimento'])) {
            $pdo->rollBack();
            echo json_encode(array('success' => false, 'message' => 'Data de nascimento e obrigatoria para pacientes'));
            exit;
        }

        if (!isset($data['genero']) || empty($data['genero'])) {
            $pdo->rollBack();
            echo json_encode(array('success' => false, 'message' => 'Genero e obrigatorio para pacientes'));
            exit;
        }

        $stmt = $pdo->prepare("SELECT id FROM pacientes WHERE id = ?");
        $stmt->execute(array($usuario_id));
        $pacienteExiste = $stmt->fetch();

        $cep = isset($data['cep']) ? $data['cep'] : '';
        $profissao = isset($data['profissao']) ? $data['profissao'] : '';
        $como_conheceu = isset($data['como_conheceu']) ? $data['como_conheceu'] : '';
        $objetivos = isset($data['objetivos']) ? $data['objetivos'] : '';

        if ($pacienteExiste) {

            $stmt = $pdo->prepare("
                UPDATE pacientes SET
                    data_nascimento = ?,
                    endereco = ?,
                    cep = ?,
                    cidade = ?,
                    estado = ?,
                    genero = ?,
                    profissao = ?,
                    como_conheceu = ?,
                    objetivos = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");

            $result = $stmt->execute(array(
                $data['data_nascimento'],
                trim($data['endereco']),
                $cep,
                trim($data['cidade']),
                $data['estado'],
                $data['genero'],
                $profissao,
                $como_conheceu,
                $objetivos,
                $usuario_id
            ));

        } else {

            $stmt = $pdo->prepare("
                INSERT INTO pacientes (
                    id, data_nascimento, endereco, cep, cidade, estado,
                    genero, profissao, como_conheceu, objetivos, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");

            $result = $stmt->execute(array(
                $usuario_id,
                $data['data_nascimento'],
                trim($data['endereco']),
                $cep,
                trim($data['cidade']),
                $data['estado'],
                $data['genero'],
                $profissao,
                $como_conheceu,
                $objetivos
            ));
        }

    } else if ($tipoUsuario === 'profissional') {

        $stmt = $pdo->prepare("SELECT id FROM profissionais WHERE id = ?");
        $stmt->execute(array($usuario_id));
        $profissionalExiste = $stmt->fetch();

        $cep = isset($data['cep']) ? $data['cep'] : '';
        // Campos opcionais do profissional: string vazia vira NULL (DATE/ENUM não aceitam '')
        $data_nascimento = (isset($data['data_nascimento']) && trim((string) $data['data_nascimento']) !== '') ? $data['data_nascimento'] : null;
        $genero = (isset($data['genero']) && trim((string) $data['genero']) !== '') ? $data['genero'] : null;

        if ($profissionalExiste) {

            $stmt = $pdo->prepare("
                UPDATE profissionais SET
                    endereco = ?,
                    cep = ?,
                    cidade = ?,
                    estado = ?,
                    data_nascimento = ?,
                    genero = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");

            $result = $stmt->execute(array(
                trim($data['endereco']),
                $cep,
                trim($data['cidade']),
                $data['estado'],
                $data_nascimento,
                $genero,
                $usuario_id
            ));

        } else {

            $stmt = $pdo->prepare("
                INSERT INTO profissionais (
                    id, crp, endereco, cep, cidade, estado, data_nascimento,
                    genero, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");

            $result = $stmt->execute(array(
                $usuario_id,
                null,
                trim($data['endereco']),
                $cep,
                trim($data['cidade']),
                $data['estado'],
                $data_nascimento,
                $genero
            ));
        }

    } else {
        $pdo->rollBack();
        echo json_encode(array('success' => false, 'message' => 'Tipo de usuario invalido'));
        exit;
    }

    if (!$result) {
        $pdo->rollBack();
        echo json_encode(array('success' => false, 'message' => 'Erro ao salvar perfil'));
        exit;
    }

    $stmt = $pdo->prepare("UPDATE usuarios SET perfil_completo = 1, updated_at = NOW() WHERE id = ?");
    $stmt->execute(array($usuario_id));

    $pdo->commit();

    echo json_encode(array('success' => true, 'message' => 'Perfil completado com sucesso'));

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(array('success' => false, 'message' => 'Erro interno'));
}
?>