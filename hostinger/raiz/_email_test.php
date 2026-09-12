<?php
/**
 * Provence — Teste de e-mail: DESATIVADO na Etapa 3 (auditoria de segurança).
 *
 * Motivo: script de diagnóstico exposto na web: mostrava host/usuário SMTP e disparava e-mails. Pode também ser apagado do servidor.
 *
 * Este arquivo substitui o original de propósito (responde 410 Gone) para que a
 * rota antiga não continue acessível mesmo que alguém a conheça.
 * Deploy: substitui public_html/_email_test.php
 */

require_once __DIR__ . '/config/db.php';

http_response_code(410);
echo json_encode(['success' => false, 'message' => 'Esta rota foi desativada por segurança.']);
