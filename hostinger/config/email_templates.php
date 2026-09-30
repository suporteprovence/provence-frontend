<?php
/**
 * Templates de e-mail do sistema Provence
 * Todos retornam HTML formatado para envio
 *
 * Etapa 3: paleta verde da nova identidade + templates de recuperação de senha
 * e de confirmação de exclusão da conta (LGPD).
 * Deploy: substitui public_html/config/email_templates.php
 */

function templateBase($conteudo) {
    return '
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background-color:#f1f6ee;font-family:Arial,Helvetica,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
            <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(40,74,28,0.12);">
                <!-- Header -->
                <div style="background:linear-gradient(135deg,#284A1C,#3f6b2e);padding:32px;text-align:center;">
                    <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;">Provence</h1>
                    <p style="color:#d6e8cf;margin:8px 0 0;font-size:14px;">Plataforma de Saude Mental</p>
                </div>
                <!-- Conteudo -->
                <div style="padding:32px;">
                    ' . $conteudo . '
                </div>
                <!-- Footer -->
                <div style="background:#f1f6ee;padding:24px 32px;text-align:center;border-top:1px solid #d6e8cf;">
                    <p style="color:#6b7280;font-size:12px;margin:0;">
                        Provence - Plataforma de Saude Mental<br>
                        Este e-mail foi enviado automaticamente. Em caso de duvidas, responda este e-mail.<br>
                        <a href="mailto:contato@provence.host" style="color:#284A1C;">contato@provence.host</a>
                    </p>
                </div>
            </div>
        </div>
    </body>
    </html>';
}

/**
 * E-mail enviado ao profissional apos cadastro (aguardando aprovacao)
 */
function templateCadastroProfissional($nome) {
    $conteudo = '
        <h2 style="color:#1f2937;margin:0 0 16px;font-size:22px;">Cadastro Recebido!</h2>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Ola, <strong>' . htmlspecialchars($nome) . '</strong>!
        </p>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Seu cadastro como <strong>profissional</strong> na Provence foi recebido com sucesso.
            Nossa equipe ira analisar suas informacoes e documentacao.
        </p>
        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:8px;margin:24px 0;">
            <p style="color:#92400e;margin:0;font-size:14px;">
                <strong>Prazo estimado:</strong> A analise leva entre 24 a 72 horas uteis.
                Voce recebera um e-mail assim que sua conta for aprovada.
            </p>
        </div>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Enquanto isso, nenhuma acao adicional e necessaria da sua parte.
        </p>';

    return templateBase($conteudo);
}

/**
 * E-mail enviado ao paciente apos cadastro (acesso imediato)
 */
function templateCadastroPaciente($nome) {
    $conteudo = '
        <h2 style="color:#1f2937;margin:0 0 16px;font-size:22px;">Bem-vindo a Provence!</h2>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Ola, <strong>' . htmlspecialchars($nome) . '</strong>!
        </p>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Sua conta foi criada com sucesso. Voce ja pode acessar a plataforma
            e agendar sua primeira consulta com um de nossos profissionais.
        </p>
        <div style="text-align:center;margin:32px 0;">
            <a href="https://provence.host/login" style="background:linear-gradient(135deg,#284A1C,#3f6b2e);color:#ffffff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">
                Acessar Plataforma
            </a>
        </div>';

    return templateBase($conteudo);
}

/**
 * E-mail enviado ao profissional quando aprovado pelo admin
 */
function templateAprovacao($nome) {
    $conteudo = '
        <h2 style="color:#1f2937;margin:0 0 16px;font-size:22px;">Conta Aprovada!</h2>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Ola, <strong>' . htmlspecialchars($nome) . '</strong>!
        </p>
        <div style="background:#d1fae5;border-left:4px solid #10b981;padding:16px;border-radius:8px;margin:24px 0;">
            <p style="color:#065f46;margin:0;font-size:15px;">
                Seu cadastro como profissional na <strong>Provence</strong> foi <strong>aprovado</strong>!
            </p>
        </div>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Voce ja pode fazer login, configurar seus horarios de atendimento
            e comecar a receber pacientes pela plataforma.
        </p>
        <div style="text-align:center;margin:32px 0;">
            <a href="https://provence.host/login" style="background:linear-gradient(135deg,#284A1C,#3f6b2e);color:#ffffff;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;display:inline-block;">
                Fazer Login
            </a>
        </div>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Recomendamos que voce configure seus horarios disponiveis e
            complete seu perfil profissional para comecar a atender.
        </p>';

    return templateBase($conteudo);
}

/**
 * E-mail enviado ao profissional quando recusado pelo admin
 */
function templateRecusa($nome, $motivo = '') {
    $blocoMotivo = '';
    if (!empty($motivo)) {
        $blocoMotivo = '
        <div style="background:#fee2e2;border-left:4px solid #ef4444;padding:16px;border-radius:8px;margin:24px 0;">
            <p style="color:#991b1b;margin:0;font-size:14px;">
                <strong>Motivo:</strong> ' . htmlspecialchars($motivo) . '
            </p>
        </div>';
    }

    $conteudo = '
        <h2 style="color:#1f2937;margin:0 0 16px;font-size:22px;">Sobre seu Cadastro</h2>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Ola, <strong>' . htmlspecialchars($nome) . '</strong>,
        </p>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Apos analise, infelizmente nao foi possivel aprovar seu cadastro
            como profissional na Provence neste momento.
        </p>
        ' . $blocoMotivo . '
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Caso tenha duvidas ou queira enviar documentacao complementar,
            entre em contato conosco respondendo este e-mail.
        </p>';

    return templateBase($conteudo);
}

/**
 * E-mail com o link para redefinir a senha (Etapa 3).
 * O link carrega um token de uso único que vale por $validadeMin minutos.
 */
function templateRecuperacaoSenha($nome, $link, $validadeMin = 60) {
    $linkSeguro = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');
    $conteudo = '
        <h2 style="color:#1f2937;margin:0 0 16px;font-size:22px;">Redefinição de senha</h2>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Olá, <strong>' . htmlspecialchars($nome) . '</strong>!
        </p>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Recebemos um pedido para redefinir a senha da sua conta na Provence.
            Clique no botão abaixo para criar uma nova senha:
        </p>
        <div style="text-align:center;margin:28px 0;">
            <a href="' . $linkSeguro . '" style="display:inline-block;background:#284A1C;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">Criar nova senha</a>
        </div>
        <p style="color:#6b7280;font-size:13px;line-height:1.6;">
            Se o botão não funcionar, copie e cole este endereço no navegador:<br>
            <a href="' . $linkSeguro . '" style="color:#284A1C;word-break:break-all;">' . $linkSeguro . '</a>
        </p>
        <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:8px;margin:24px 0;">
            <p style="color:#92400e;margin:0;font-size:14px;">
                O link vale por <strong>' . (int) $validadeMin . ' minutos</strong> e só pode ser usado uma vez.
            </p>
        </div>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Se você não pediu esta redefinição, ignore este e-mail: sua senha continua a mesma.
        </p>';

    return templateBase($conteudo);
}

/**
 * Confirmação de exclusão da conta pelo titular (LGPD, Etapa 3).
 */
function templateContaExcluida($nome) {
    $conteudo = '
        <h2 style="color:#1f2937;margin:0 0 16px;font-size:22px;">Conta excluída</h2>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Olá, <strong>' . htmlspecialchars($nome) . '</strong>.
        </p>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Confirmamos a exclusão da sua conta na Provence. Seus dados pessoais
            (nome, e-mail, telefone, CPF, endereço, mensagens do chat e dados
            bancários, quando havia) foram removidos dos nossos sistemas.
        </p>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Registros de consultas e pagamentos já realizados são mantidos de forma
            anonimizada apenas pelo prazo exigido por obrigações legais e fiscais,
            sem qualquer dado que identifique você.
        </p>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Se não foi você quem pediu a exclusão, responda este e-mail o quanto antes.
        </p>';

    return templateBase($conteudo);
}

/**
 * E-mail interno com a mensagem enviada pelo formulário "Entre em Contato" do site.
 */
function templateContatoSite($nome, $email, $mensagem, $ip = '') {
    $conteudo = '
        <h2 style="color:#1f2937;margin:0 0 16px;font-size:22px;">Nova mensagem pelo site</h2>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            <strong>Nome:</strong> ' . htmlspecialchars($nome) . '<br>
            <strong>E-mail:</strong> <a href="mailto:' . htmlspecialchars($email) . '" style="color:#284A1C;">' . htmlspecialchars($email) . '</a>
        </p>
        <div style="background:#f1f6ee;border-left:4px solid #284A1C;padding:16px;border-radius:8px;margin:24px 0;">
            <p style="color:#1f2937;margin:0;font-size:15px;line-height:1.6;white-space:pre-wrap;">' . nl2br(htmlspecialchars($mensagem)) . '</p>
        </div>
        <p style="color:#6b7280;font-size:12px;line-height:1.6;">
            Para responder, basta responder este e-mail (vai direto para quem escreveu).' . ($ip !== '' ? ' IP de origem: ' . htmlspecialchars($ip) : '') . '
        </p>';

    return templateBase($conteudo);
}

/** Bloco padrão com os dados da consulta, usado pelos avisos abaixo. */
function blocoConsulta($linhas) {
    $html = '<div style="background:#f1f6ee;border-left:4px solid #284A1C;padding:16px;border-radius:8px;margin:24px 0;">';
    foreach ($linhas as $rotulo => $valor) {
        $html .= '<p style="color:#1f2937;margin:0 0 6px;font-size:15px;"><strong>' . htmlspecialchars($rotulo) . ':</strong> ' . htmlspecialchars($valor) . '</p>';
    }
    return $html . '</div>';
}

/** Para o PROFISSIONAL: alguém marcou um horário com ele. */
function templateConsultaAgendada($profissional, $paciente, $quando, $valor) {
    $conteudo = '
        <h2 style="color:#1f2937;margin:0 0 16px;font-size:22px;">Você tem uma consulta nova</h2>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Olá, <strong>' . htmlspecialchars($profissional) . '</strong>! Um paciente acabou de agendar um horário com você.
        </p>'
        . blocoConsulta(['Paciente' => $paciente, 'Data e hora' => $quando, 'Valor' => $valor]) . '
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Assim que o pagamento for confirmado, você recebe outro aviso e poderá enviar o link da sessão pela sua agenda.
        </p>';
    return templateBase($conteudo);
}

/** Para o PACIENTE: pagamento aprovado. */
function templatePagamentoConfirmado($paciente, $profissional, $quando, $valor) {
    $conteudo = '
        <h2 style="color:#1f2937;margin:0 0 16px;font-size:22px;">Pagamento confirmado</h2>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Olá, <strong>' . htmlspecialchars($paciente) . '</strong>! Recebemos o seu pagamento e sua consulta está garantida.
        </p>'
        . blocoConsulta(['Profissional' => $profissional, 'Data e hora' => $quando, 'Valor pago' => $valor]) . '
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            O link para entrar na sessão chega por e-mail assim que o profissional enviar, e fica também na sua área de consultas.
        </p>';
    return templateBase($conteudo);
}

/** Para o PROFISSIONAL: a consulta foi paga. */
function templateConsultaPaga($profissional, $paciente, $quando) {
    $conteudo = '
        <h2 style="color:#1f2937;margin:0 0 16px;font-size:22px;">Consulta paga</h2>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Olá, <strong>' . htmlspecialchars($profissional) . '</strong>! O pagamento desta consulta foi confirmado.
        </p>'
        . blocoConsulta(['Paciente' => $paciente, 'Data e hora' => $quando]) . '
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Você já pode enviar o link da sessão pela sua agenda. O valor fica disponível para repasse depois que os dois confirmarem o término da sessão.
        </p>';
    return templateBase($conteudo);
}

/** Para o PACIENTE: link da sessão. */
function templateLinkSessao($paciente, $profissional, $quando, $link) {
    $linkSeguro = htmlspecialchars($link, ENT_QUOTES, 'UTF-8');
    $conteudo = '
        <h2 style="color:#1f2937;margin:0 0 16px;font-size:22px;">O link da sua consulta chegou</h2>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Olá, <strong>' . htmlspecialchars($paciente) . '</strong>! O profissional enviou o endereço da sua sessão.
        </p>'
        . blocoConsulta(['Profissional' => $profissional, 'Data e hora' => $quando]) . '
        <div style="text-align:center;margin:28px 0;">
            <a href="' . $linkSeguro . '" style="display:inline-block;background:#284A1C;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:700;font-size:15px;">Entrar na sessão</a>
        </div>
        <p style="color:#6b7280;font-size:13px;line-height:1.6;">
            Se o botão não funcionar, copie este endereço no navegador:<br>
            <a href="' . $linkSeguro . '" style="color:#284A1C;word-break:break-all;">' . $linkSeguro . '</a>
        </p>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Entre alguns minutos antes do horário. Em caso de imprevisto, avise pelo chat da plataforma.
        </p>';
    return templateBase($conteudo);
}

/** Consulta cancelada: avisa o outro lado. */
function templateConsultaCancelada($nome, $porQuem, $quando, $observacao = '') {
    $extra = trim((string) $observacao) !== ''
        ? '<p style="color:#4b5563;font-size:15px;line-height:1.6;"><strong>Observação:</strong> ' . htmlspecialchars($observacao) . '</p>'
        : '';
    $conteudo = '
        <h2 style="color:#1f2937;margin:0 0 16px;font-size:22px;">Consulta cancelada</h2>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Olá, <strong>' . htmlspecialchars($nome) . '</strong>. A consulta marcada para <strong>' . htmlspecialchars($quando) . '</strong> foi cancelada por ' . htmlspecialchars($porQuem) . '.
        </p>
        ' . $extra . '
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Se houve pagamento, a devolução segue as regras dos Termos de Uso e você recebe um aviso assim que for concluída. Para remarcar, é só entrar na plataforma e escolher um novo horário.
        </p>';
    return templateBase($conteudo);
}

/** Para o PACIENTE: situação do reembolso. */
function templateReembolso($paciente, $quando, $valor, $situacao, $observacao = '') {
    if ($situacao === 'pago') {
        $titulo = 'Reembolso feito';
        $texto  = 'O valor de <strong>' . htmlspecialchars($valor) . '</strong> foi devolvido pelo mesmo meio de pagamento que você usou. No Pix costuma cair em minutos; no cartão de crédito, pode aparecer em até duas faturas, conforme o seu banco.';
    } elseif ($situacao === 'recusado') {
        $titulo = 'Sobre seu pedido de reembolso';
        $texto  = 'Analisamos seu pedido de reembolso e ele não pôde ser aprovado.';
    } else {
        $titulo = 'Recebemos seu pedido de reembolso';
        $texto  = 'Seu pedido foi registrado e nossa equipe vai analisar. Você recebe a resposta por e-mail em até 5 dias úteis.';
    }
    $extra = trim((string) $observacao) !== ''
        ? '<p style="color:#4b5563;font-size:15px;line-height:1.6;"><strong>Observação da equipe:</strong> ' . htmlspecialchars($observacao) . '</p>'
        : '';
    $conteudo = '
        <h2 style="color:#1f2937;margin:0 0 16px;font-size:22px;">' . $titulo . '</h2>
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Olá, <strong>' . htmlspecialchars($paciente) . '</strong>.
        </p>'
        . blocoConsulta(['Consulta' => $quando, 'Valor' => $valor]) . '
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">' . $texto . '</p>
        ' . $extra . '
        <p style="color:#4b5563;font-size:15px;line-height:1.6;">
            Qualquer dúvida, responda este e-mail.
        </p>';
    return templateBase($conteudo);
}

