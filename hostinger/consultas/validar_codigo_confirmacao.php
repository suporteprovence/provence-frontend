<?php
/**
 * Provence — Validar código (antigo): DESATIVADO na Etapa 3 (auditoria de segurança).
 *
 * Motivo: sem sessão: marcava consulta como realizada e liberava pagamento. Substituído por consultas/confirmar_sessao.php.
 *
 * Este arquivo substitui o original de propósito (responde 410 Gone) para que a
 * rota antiga não continue acessível mesmo que alguém a conheça.
 * Deploy: substitui public_html/consultas/validar_codigo_confirmacao.php
 */

require_once __DIR__ . '/../config/db.php';

http_response_code(410);
echo json_encode(['success' => false, 'message' => 'Esta rota foi desativada por segurança.']);
