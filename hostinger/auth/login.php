<?php
/**
 * Provence — Login (Etapa 3: endurecido).
 *
 *  POST /auth/login.php   Body JSON: { "email": "...", "senha": "..." }
 *
 * O que mudou em relação ao login anterior:
 *   - Uma única mensagem de erro para "e-mail não existe" e "senha errada"
 *     (o anterior dizia qual dos dois, o que permitia descobrir quem tem conta).
 *   - Bloqueio de força bruta: 5 falhas para o mesmo e-mail (ou 30 para o mesmo IP)
 *     em 15 minutos devolvem 429 e o login fica travado por 15 minutos.
 *     Redefinir a senha pelo e-mail destrava na hora (redefinir_senha.php).
 *   - session_regenerate_id() após autenticar (contra fixação de sessão).
 *   - Trilha de auditoria em logs_sistema e expurgo periódico de dados antigos.
 *   - Não devolve mais o CPF no JSON de login (o site guardava isso no navegador).
 *
 * A resposta mantém o formato que o site já consome (data.tipo_usuario etc.).
 *
 * Deploy: substitui public_html/auth/login.php
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/seguranca.php';

session_start();

const LOGIN_MAX_FALHAS_EMAIL = 5;
const LOGIN_MAX_FALHAS_IP    = 30;
const LOGIN_JANELA_MINUTOS   = 15;

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    provence_responder(405, ['success' => false, 'message' => 'Método não permitido.']);
}

$data = provence_corpo_json();
if ($data === null) {
    provence_responder(200, ['success' => false, 'message' => 'Envie os dados em JSON.']);
}

$email = mb_strtolower(trim((string) ($data['email'] ?? '')));
$senha = (string) ($data['senha'] ?? '');

if ($email === '' || $senha === '' || mb_strlen($email) > 100 || strlen($senha) > 200) {
    provence_responder(200, ['success' => false, 'message' => 'Informe e-mail e senha.']);
}

$ip = provence_ip();
$msgGenerica = 'E-mail ou senha incorretos.';

try {
    // Expurgo oportunista de dados antigos (retenção LGPD), sem precisar de cron.
    if (mt_rand(1, 50) === 1) {
        provence_expurgo($pdo);
    }

    // -------------------------------------------------------------------
    // Bloqueio de força bruta
    // -------------------------------------------------------------------
    $st = $pdo->prepare(
        'SELECT COUNT(*) FROM tentativas_login
          WHERE email = ? AND sucesso = 0 AND criado_em > NOW() - INTERVAL ' . LOGIN_JANELA_MINUTOS . ' MINUTE'
    );
    $st->execute([$email]);
    $falhasEmail = (int) $st->fetchColumn();

    $st = $pdo->prepare(
        'SELECT COUNT(*) FROM tentativas_login
          WHERE ip = ? AND sucesso = 0 AND criado_em > NOW() - INTERVAL ' . LOGIN_JANELA_MINUTOS . ' MINUTE'
    );
    $st->execute([$ip]);
    $falhasIp = (int) $st->fetchColumn();

    if ($falhasEmail >= LOGIN_MAX_FALHAS_EMAIL || $falhasIp >= LOGIN_MAX_FALHAS_IP) {
        provence_log($pdo, 'login_bloqueado', 'e-mail=' . $email);
        provence_responder(429, [
            'success'   => false,
            'bloqueado' => true,
            'message'   => 'Muitas tentativas de login. Aguarde ' . LOGIN_JANELA_MINUTOS
                         . ' minutos ou redefina sua senha pelo link "Esqueci minha senha".',
        ]);
    }

    $registrarFalha = function () use ($pdo, $email, $ip) {
        $st = $pdo->prepare('INSERT INTO tentativas_login (email, ip, sucesso) VALUES (?, ?, 0)');
        $st->execute([$email, $ip]);
    };

    // -------------------------------------------------------------------
    // 1. Administrador
    // -------------------------------------------------------------------
    $st = $pdo->prepare('SELECT id, nome, email, senha FROM administradores WHERE email = ? AND ativo = 1');
    $st->execute([$email]);
    $admin = $st->fetch();

    if ($admin && password_verify($senha, $admin['senha'])) {
        session_regenerate_id(true);
        $_SESSION['user_id']   = (int) $admin['id'];
        $_SESSION['user_type'] = 'admin';
        $_SESSION['user_name'] = $admin['nome'];
        $_SESSION['is_admin']  = true;

        $pdo->prepare('UPDATE administradores SET ultimo_login = NOW() WHERE id = ?')->execute([(int) $admin['id']]);
        $pdo->prepare('INSERT INTO tentativas_login (email, ip, sucesso) VALUES (?, ?, 1)')->execute([$email, $ip]);
        provence_log($pdo, 'login_admin', 'admin_id=' . (int) $admin['id']);

        provence_responder(200, [
            'success' => true,
            'message' => 'Login de administrador realizado com sucesso',
            'data'    => [
                'id'              => (int) $admin['id'],
                'nome'            => $admin['nome'],
                'email'           => $admin['email'],
                'tipo_usuario'    => 'admin',
                'aprovado'        => true,
                'perfil_completo' => true,
                'aceita_termos'   => true,
            ],
        ]);
    }

    // -------------------------------------------------------------------
    // 2. Usuário comum (paciente / profissional)
    // -------------------------------------------------------------------
    $st = $pdo->prepare(
        'SELECT u.id, u.nome, u.email, u.senha, u.telefone, u.tipo, u.aprovado,
                u.perfil_completo, u.aceita_termos,
                p.crp, p.especialidade, p.valor_consulta
           FROM usuarios u
           LEFT JOIN profissionais p ON p.id = u.id
          WHERE u.email = ? AND u.ativo = 1'
    );
    $st->execute([$email]);
    $usuario = $st->fetch();

    if (!$usuario) {
        // Gasta o mesmo tempo de um password_verify real para não revelar,
        // pelo tempo de resposta, se o e-mail existe.
        password_verify($senha, '$2y$10$7EqJtq98hPqEX7fNZaFWoOhi5XkPd2wYV0z7z6nUeM3v1QmZ3Qz6a');
        $registrarFalha();
        provence_responder(200, ['success' => false, 'message' => $msgGenerica]);
    }

    if (!password_verify($senha, $usuario['senha'])) {
        $registrarFalha();
        provence_responder(200, ['success' => false, 'message' => $msgGenerica]);
    }

    // Senha certa: daqui em diante a pessoa provou ser dona da conta, então
    // pode saber o motivo de não entrar.
    if (!(int) $usuario['aprovado']) {
        provence_responder(200, [
            'success' => false,
            'message' => $usuario['tipo'] === 'profissional'
                ? 'Seu cadastro ainda está em análise.'
                : 'Conta não ativa.',
        ]);
    }

    session_regenerate_id(true);
    $_SESSION['user_id']   = (int) $usuario['id'];
    $_SESSION['user_type'] = $usuario['tipo'];
    $_SESSION['user_name'] = $usuario['nome'];
    $_SESSION['is_admin']  = false;

    $pdo->prepare('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?')->execute([(int) $usuario['id']]);
    $pdo->prepare('INSERT INTO tentativas_login (email, ip, sucesso) VALUES (?, ?, 1)')->execute([$email, $ip]);
    provence_log($pdo, 'login', 'tipo=' . $usuario['tipo'], (int) $usuario['id']);

    $resposta = [
        'id'              => (int) $usuario['id'],
        'nome'            => $usuario['nome'],
        'email'           => $usuario['email'],
        'telefone'        => $usuario['telefone'],
        'tipo_usuario'    => $usuario['tipo'],
        'aprovado'        => true,
        'perfil_completo' => true,
        'aceita_termos'   => true,
    ];
    if ($usuario['tipo'] === 'profissional') {
        $resposta['crp']            = $usuario['crp'];
        $resposta['especialidade']  = $usuario['especialidade'];
        $resposta['valor_consulta'] = $usuario['valor_consulta'];
    }

    provence_responder(200, [
        'success' => true,
        'message' => 'Login realizado com sucesso',
        'data'    => $resposta,
    ]);
} catch (PDOException $e) {
    error_log('login: ' . $e->getMessage());
    provence_responder(500, ['success' => false, 'message' => 'Erro interno do servidor']);
}
