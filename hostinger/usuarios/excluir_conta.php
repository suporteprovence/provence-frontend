<?php
/**
 * Provence — LGPD: excluir a própria conta (Etapa 3).
 *
 *  POST /usuarios/excluir_conta.php
 *  Body JSON: { "senha": "...", "confirmacao": "EXCLUIR" }
 *
 * Exige a senha atual e a palavra EXCLUIR. Recusa (409) enquanto houver:
 *   - consulta futura já paga/confirmada (cancelar ou aguardar realização);
 *   - pedido de reembolso em andamento;
 *   - (profissional) pagamento aprovado ainda não liberado (valor a receber).
 *
 * O que acontece (tudo numa transação):
 *   - usuarios: nome/e-mail/telefone/CPF substituídos, senha inutilizada,
 *     ativo = 0, excluido_em = agora. A linha fica porque consultas e pagamentos
 *     apontam para ela (obrigação legal/fiscal), mas sem nada que identifique.
 *   - pacientes / profissionais: campos pessoais, bio, foto, dados bancários
 *     zerados; horários e dias bloqueados apagados; CRP substituído.
 *   - mensagens do chat (enviadas e recebidas), tokens de recuperação e
 *     tentativas de login apagados. Comentários de avaliações que a pessoa
 *     escreveu são apagados (a nota fica, anonimizada).
 *   - consultas 'pendente' (nunca pagas) são canceladas.
 *   - consentimentos e trilha de auditoria ficam ligados ao id anonimizado
 *     (prova de consentimento / obrigação legal), sem dados pessoais.
 * Depois envia um e-mail de confirmação e encerra a sessão.
 *
 * Deploy: public_html/usuarios/excluir_conta.php (arquivo novo).
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/seguranca.php';
require_once __DIR__ . '/../config/mailer.php';
require_once __DIR__ . '/../config/email_templates.php';

session_start();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    provence_responder(405, ['success' => false, 'message' => 'Método não permitido.']);
}
if (!isset($_SESSION['user_id'])) {
    provence_responder(401, ['success' => false, 'message' => 'Usuário não autenticado']);
}
$tipoSessao = $_SESSION['user_type'] ?? '';
if (!empty($_SESSION['is_admin']) || ($tipoSessao !== 'paciente' && $tipoSessao !== 'profissional')) {
    provence_responder(403, ['success' => false, 'message' => 'Disponível apenas para pacientes e profissionais.']);
}

$uid = (int) $_SESSION['user_id'];

$b = provence_corpo_json();
if ($b === null) {
    provence_responder(200, ['success' => false, 'message' => 'Envie os dados em JSON.']);
}
$senha       = (string) ($b['senha'] ?? '');
$confirmacao = trim((string) ($b['confirmacao'] ?? ''));

if ($confirmacao !== 'EXCLUIR') {
    provence_responder(200, ['success' => false, 'message' => 'Digite EXCLUIR para confirmar.']);
}
if ($senha === '' || strlen($senha) > 200) {
    provence_responder(200, ['success' => false, 'message' => 'Informe sua senha atual.']);
}

try {
    $st = $pdo->prepare('SELECT id, nome, email, senha, tipo FROM usuarios WHERE id = ? AND ativo = 1');
    $st->execute([$uid]);
    $u = $st->fetch();
    if (!$u) {
        provence_responder(404, ['success' => false, 'message' => 'Usuário não encontrado']);
    }
    if (!password_verify($senha, $u['senha'])) {
        provence_log($pdo, 'conta_exclusao_negada', 'senha incorreta', $uid);
        provence_responder(200, ['success' => false, 'message' => 'Senha incorreta.']);
    }
    $tipo = $u['tipo'];

    // -------------------------------------------------------------------
    // Pendências que impedem a exclusão
    // -------------------------------------------------------------------
    $st = $pdo->prepare(
        "SELECT COUNT(*) FROM consultas
          WHERE (id_paciente = ? OR id_profissional = ?)
            AND status IN ('paga','link_enviado','confirmada_paciente','confirmada_profissional','confirmada_ambos')
            AND data_hora > NOW()"
    );
    $st->execute([$uid, $uid]);
    $futuras = (int) $st->fetchColumn();
    if ($futuras > 0) {
        provence_responder(409, [
            'success' => false,
            'message' => "Você tem {$futuras} consulta(s) confirmada(s) com data futura. Cancele ou aguarde a realização antes de excluir a conta.",
        ]);
    }

    if ($tipo === 'paciente') {
        $st = $pdo->prepare("SELECT COUNT(*) FROM reembolsos WHERE id_paciente = ? AND status = 'solicitado'");
        $st->execute([$uid]);
        if ((int) $st->fetchColumn() > 0) {
            provence_responder(409, [
                'success' => false,
                'message' => 'Há um pedido de reembolso em andamento. Aguarde a resposta antes de excluir a conta.',
            ]);
        }
    } else {
        $st = $pdo->prepare(
            "SELECT COUNT(*) FROM pagamentos p JOIN consultas c ON c.id = p.consulta_id
              WHERE c.id_profissional = ? AND p.status = 'aprovado'"
        );
        $st->execute([$uid]);
        if ((int) $st->fetchColumn() > 0) {
            provence_responder(409, [
                'success' => false,
                'message' => 'Há valores a receber ainda não liberados. Aguarde a liberação antes de excluir a conta.',
            ]);
        }
    }

    // -------------------------------------------------------------------
    // Anonimização + limpeza
    // -------------------------------------------------------------------
    $emailOriginal = mb_strtolower((string) $u['email']);
    $nomeOriginal  = (string) $u['nome'];

    $pdo->beginTransaction();

    $pdo->prepare(
        "UPDATE usuarios
            SET nome = 'Usuário removido',
                email = ?,
                senha = ?,
                telefone = NULL,
                cpf = NULL,
                ativo = 0,
                aprovado = 0,
                excluido_em = NOW()
          WHERE id = ?"
    )->execute([
        'removido-' . $uid . '@excluido.provence.invalid',
        password_hash(bin2hex(random_bytes(32)), PASSWORD_BCRYPT),
        $uid,
    ]);

    if ($tipo === 'paciente') {
        $pdo->prepare(
            'UPDATE pacientes
                SET data_nascimento = NULL, endereco = NULL, cep = NULL, cidade = NULL, estado = NULL,
                    genero = NULL, profissao = NULL, como_conheceu = NULL, objetivos = NULL
              WHERE id = ?'
        )->execute([$uid]);
        $pdo->prepare('UPDATE avaliacoes SET comentario = NULL WHERE id_paciente = ?')->execute([$uid]);
    } else {
        $pdo->prepare(
            "UPDATE profissionais
                SET crp = 'REMOVIDO', bio = NULL, foto_perfil = NULL, data_nascimento = NULL,
                    endereco = NULL, cep = NULL, cidade = NULL, estado = NULL, genero = NULL,
                    banco = NULL, agencia = NULL, conta = NULL, tipo_conta = NULL,
                    chave_pix = NULL, tipo_pix = NULL
              WHERE id = ?"
        )->execute([$uid]);
        $pdo->prepare('DELETE FROM horarios_trabalho WHERE id_profissional = ?')->execute([$uid]);
        $pdo->prepare('DELETE FROM dias_bloqueados WHERE id_profissional = ?')->execute([$uid]);
    }

    $pdo->prepare("UPDATE consultas SET status = 'cancelada_por_nao_ocorrencia'
                    WHERE (id_paciente = ? OR id_profissional = ?) AND status = 'pendente'")
        ->execute([$uid, $uid]);

    $pdo->prepare('DELETE FROM mensagens WHERE id_remetente = ? OR id_destinatario = ?')->execute([$uid, $uid]);
    $pdo->prepare('DELETE FROM tokens_recuperacao WHERE usuario_id = ?')->execute([$uid]);
    $pdo->prepare('DELETE FROM tentativas_login WHERE email = ?')->execute([$emailOriginal]);

    $pdo->commit();

    provence_log($pdo, 'conta_excluida', 'exclusão pelo titular (tipo=' . $tipo . ')', $uid);

    // Confirmação por e-mail (melhor esforço: a exclusão já está feita)
    $envio = enviarEmail($emailOriginal, $nomeOriginal, 'Conta excluída - Provence', templateContaExcluida($nomeOriginal));
    if (empty($envio['success'])) {
        error_log('excluir_conta: falha ao enviar confirmação para usuario ' . $uid);
    }

    // Encerra a sessão
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires'  => time() - 42000,
            'path'     => $p['path'],
            'domain'   => $p['domain'],
            'secure'   => (bool) $p['secure'],
            'httponly' => (bool) $p['httponly'],
            'samesite' => $p['samesite'] ?: 'None',
        ]);
    }
    session_destroy();

    provence_responder(200, [
        'success' => true,
        'message' => 'Conta excluída. Seus dados pessoais foram removidos.',
    ]);
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('excluir_conta: ' . $e->getMessage());
    provence_responder(500, ['success' => false, 'message' => 'Erro ao excluir a conta']);
}
