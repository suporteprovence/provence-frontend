<?php
/**
 * Configuracao de e-mail SMTP (Hostinger)
 * Varredura geral: enviarEmail() aceita "responder para" opcional (formulario de contato).
 * Deploy: substitui public_html/config/mailer.php
 *
 * IMPORTANTE: Use uma Senha de App do Google, NAO a senha normal da conta.
 * Gere em: Conta Google > Seguranca > Senhas de app
 */

require_once __DIR__ . '/../vendor/phpmailer/Exception.php';
require_once __DIR__ . '/../vendor/phpmailer/PHPMailer.php';
require_once __DIR__ . '/../vendor/phpmailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// ============================================================
// CONFIGURACOES SMTP - ALTERAR AQUI
// ============================================================
define('MAIL_HOST', isset($_ENV['MAIL_HOST']) ? $_ENV['MAIL_HOST'] : 'smtp.hostinger.com');
define('MAIL_PORT', isset($_ENV['MAIL_PORT']) ? intval($_ENV['MAIL_PORT']) : 465);
define('MAIL_USERNAME', isset($_ENV['MAIL_USER']) ? $_ENV['MAIL_USER'] : 'contato@provence.host');
define('MAIL_PASSWORD', isset($_ENV['MAIL_PASS']) ? $_ENV['MAIL_PASS'] : '');
define('MAIL_FROM_EMAIL', isset($_ENV['MAIL_FROM']) ? $_ENV['MAIL_FROM'] : 'contato@provence.host');
define('MAIL_FROM_NAME', isset($_ENV['MAIL_FROM_NAME']) ? $_ENV['MAIL_FROM_NAME'] : 'Provence - Saude Mental');

/**
 * Envia um e-mail usando SMTP do Gmail
 *
 * @param string $para       E-mail do destinatario
 * @param string $nome       Nome do destinatario
 * @param string $assunto    Assunto do e-mail
 * @param string $corpo_html Corpo do e-mail em HTML
 * @param string $replyTo    (opcional) e-mail para "responder para" (formulário de contato)
 * @param string $replyNome  (opcional) nome de quem escreveu
 * @return array             ['success' => bool, 'message' => string]
 */
function enviarEmail($para, $nome, $assunto, $corpo_html, $replyTo = null, $replyNome = '') {
    $mail = new PHPMailer(true);

    try {
        // Configuracoes do servidor
        $mail->isSMTP();
        $mail->Host       = MAIL_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = MAIL_USERNAME;
        $mail->Password   = MAIL_PASSWORD;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port       = MAIL_PORT;
        $mail->CharSet    = 'UTF-8';

        // Remetente e destinatario
        $mail->setFrom(MAIL_FROM_EMAIL, MAIL_FROM_NAME);
        $mail->addAddress($para, $nome);
        if ($replyTo !== null && $replyTo !== '' && filter_var($replyTo, FILTER_VALIDATE_EMAIL)) {
            $mail->addReplyTo($replyTo, (string) $replyNome);
        } else {
            $mail->addReplyTo(MAIL_FROM_EMAIL, MAIL_FROM_NAME);
        }

        // Conteudo
        $mail->isHTML(true);
        $mail->Subject = $assunto;
        $mail->Body    = $corpo_html;
        $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $corpo_html));

        $mail->send();

        return ['success' => true, 'message' => 'E-mail enviado com sucesso'];

    } catch (Exception $e) {
        error_log("Erro ao enviar e-mail para {$para}: " . $mail->ErrorInfo);
        return ['success' => false, 'message' => 'Falha ao enviar e-mail: ' . $mail->ErrorInfo];
    }
}
