
<?php
require_once '/home/u218657465/domains/provence.host/public_html/config/db.php';
require_once '/home/u218657465/domains/provence.host/public_html/config/mailer.php';
require_once '/home/u218657465/domains/provence.host/public_html/config/email_templates.php';

session_start();

$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data || !isset($data['nome']) || !isset($data['email']) || !isset($data['senha']) || !isset($data['tipo_usuario'])) {
    echo json_encode(array('success' => false, 'message' => 'Dados obrigatorios nao fornecidos'));
    exit;
}

$nome = htmlspecialchars(trim($data['nome']), ENT_QUOTES, 'UTF-8');
$email = filter_var(trim($data['email']), FILTER_SANITIZE_EMAIL);
$senha = $data['senha'];
$telefone = isset($data['telefone']) ? preg_replace('/[^\d\s\-\(\)\+]/', '', trim($data['telefone'])) : '';
$cpf = isset($data['cpf']) ? preg_replace('/[^\d\.\-]/', '', trim($data['cpf'])) : '';
$tipo_usuario = $data['tipo_usuario'];

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(array('success' => false, 'message' => 'Formato de e-mail invalido'));
    exit;
}

if (empty($nome) || empty($email) || empty($senha)) {
    echo json_encode(array('success' => false, 'message' => 'Nome, email e senha sao obrigatorios'));
    exit;
}

if (strlen($senha) < 6) {
    echo json_encode(array('success' => false, 'message' => 'A senha deve ter pelo menos 6 caracteres'));
    exit;
}

if (!in_array($tipo_usuario, array('paciente', 'profissional'))) {
    echo json_encode(array('success' => false, 'message' => 'Tipo de usuario invalido'));
    exit;
}

// LGPD: o consentimento é obrigatório no cadastro
if (empty($data['aceite_termos'])) {
    echo json_encode(array('success' => false, 'message' => 'É necessário aceitar os Termos de Uso e a Política de Privacidade.'));
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
    $stmt->execute(array($email));
    if ($stmt->fetch()) {
        echo json_encode(array('success' => false, 'message' => 'Este email ja esta cadastrado'));
        exit;
    }
} catch (Exception $e) {
    echo json_encode(array('success' => false, 'message' => 'Erro ao verificar email'));
    exit;
}

$senha_hash = password_hash($senha, PASSWORD_DEFAULT);

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare("INSERT INTO usuarios (nome, email, senha, telefone, cpf, tipo, aprovado, ativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

    $aprovado = ($tipo_usuario === 'paciente') ? 1 : 0;

    $stmt->execute(array($nome, $email, $senha_hash, $telefone, $cpf, $tipo_usuario, $aprovado, 1));
    $usuario_id = $pdo->lastInsertId();

    if ($tipo_usuario === 'profissional') {
        $crp = isset($data['numero_crp']) ? htmlspecialchars(trim($data['numero_crp']), ENT_QUOTES, 'UTF-8') : '';
        $especialidade = isset($data['especialidade']) ? htmlspecialchars(trim($data['especialidade']), ENT_QUOTES, 'UTF-8') : '';
        $valor_consulta = isset($data['valor_consulta']) ? floatval($data['valor_consulta']) : 0;
        $bio = isset($data['bio']) ? htmlspecialchars(trim($data['bio']), ENT_QUOTES, 'UTF-8') : '';
        $foto_perfil = isset($data['foto_perfil']) ? htmlspecialchars(trim($data['foto_perfil']), ENT_QUOTES, 'UTF-8') : '';

        if (empty($crp) || empty($especialidade)) {
            throw new Exception('CRP e especialidade sao obrigatorios para profissionais');
        }

        $stmt_check = $pdo->query("SHOW TABLES LIKE 'profissionais'");
        if ($stmt_check->rowCount() == 0) {
            $pdo->exec("CREATE TABLE profissionais (id INT PRIMARY KEY, crp VARCHAR(20) NOT NULL, especialidade VARCHAR(100) NOT NULL, valor_consulta DECIMAL(10,2) DEFAULT 0, bio TEXT, foto_perfil VARCHAR(255), FOREIGN KEY (id) REFERENCES usuarios(id) ON DELETE CASCADE)");
        }

        $stmt2 = $pdo->prepare("INSERT INTO profissionais (id, crp, especialidade, valor_consulta, bio, foto_perfil) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt2->execute(array($usuario_id, $crp, $especialidade, $valor_consulta, $bio, $foto_perfil));

    } else if ($tipo_usuario === 'paciente') {
        $stmt_check = $pdo->query("SHOW TABLES LIKE 'pacientes'");
        if ($stmt_check->rowCount() == 0) {
            $pdo->exec("CREATE TABLE pacientes (id INT PRIMARY KEY, data_nascimento DATE NULL, endereco TEXT NULL, FOREIGN KEY (id) REFERENCES usuarios(id) ON DELETE CASCADE)");
        }

        $stmt2 = $pdo->prepare("INSERT INTO pacientes (id) VALUES (?)");
        $stmt2->execute(array($usuario_id));
    }

    // LGPD: registra o consentimento de forma auditável (quem, quando, qual versão, IP)
    $versao_termos = '1.0';
    try {
        $vv = $pdo->query("SELECT valor FROM configuracoes_sistema WHERE chave = 'versao_termos'")->fetchColumn();
        if ($vv) {
            $versao_termos = $vv;
        }
    } catch (Exception $e) {
        // usa a versão padrão
    }
    $ip_consent = $_SERVER['REMOTE_ADDR'] ?? null;
    $pdo->prepare("UPDATE usuarios SET aceita_termos = 1, data_aceite_termos = NOW(), versao_termos_aceita = ? WHERE id = ?")
        ->execute(array($versao_termos, $usuario_id));
    $pdo->prepare("INSERT INTO consentimentos (usuario_id, tipo, versao, ip_address) VALUES (?, 'termos_privacidade', ?, ?)")
        ->execute(array($usuario_id, $versao_termos, $ip_consent));

    $pdo->commit();

    $stmt = $pdo->prepare("SELECT u.*, CASE WHEN u.tipo = 'profissional' THEN p.crp ELSE NULL END as crp, CASE WHEN u.tipo = 'profissional' THEN p.especialidade ELSE NULL END as especialidade FROM usuarios u LEFT JOIN profissionais p ON u.id = p.id WHERE u.id = ?");
    $stmt->execute(array($usuario_id));
    $usuario_completo = $stmt->fetch();

    $response_data = array(
        'id' => $usuario_completo['id'],
        'nome' => $usuario_completo['nome'],
        'email' => $usuario_completo['email'],
        'telefone' => $usuario_completo['telefone'],
        'cpf' => $usuario_completo['cpf'],
        'tipo_usuario' => $usuario_completo['tipo'],
        'aprovado' => (bool)$usuario_completo['aprovado'],
        'perfil_completo' => true,
        'aceita_termos' => false
    );

    if ($tipo_usuario === 'profissional') {
        $response_data['crp'] = $usuario_completo['crp'];
        $response_data['especialidade'] = $usuario_completo['especialidade'];
    }

    // Enviar e-mail de confirmacao de cadastro
    if ($tipo_usuario === 'profissional') {
        $emailResult = enviarEmail($email, $nome, 'Cadastro recebido - Provence', templateCadastroProfissional($nome));
    } else {
        $emailResult = enviarEmail($email, $nome, 'Bem-vindo a Provence!', templateCadastroPaciente($nome));
    }

    if (!$emailResult['success']) {
        error_log("Cadastro OK para {$email}, mas e-mail falhou: " . $emailResult['message']);
    }

    $msg = ($tipo_usuario === 'profissional') ? 'Cadastro realizado! Aguarde a aprovacao para fazer login.' : 'Cadastro realizado com sucesso!';

    echo json_encode(array('success' => true, 'message' => $msg, 'data' => $response_data));

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(array('success' => false, 'message' => 'Erro ao cadastrar: ' . $e->getMessage()));
}
?>