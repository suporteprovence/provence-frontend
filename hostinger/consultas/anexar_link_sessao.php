<?php
/**
 * Provence — Anexar link (antigo): DESATIVADO na Etapa 3 (auditoria de segurança).
 *
 * Motivo: sem sessão: qualquer pessoa alterava o link de qualquer consulta. Substituído por profissional/add-link-sessao.php.
 *
 * Este arquivo substitui o original de propósito (responde 410 Gone) para que a
 * rota antiga não continue acessível mesmo que alguém a conheça.
 * Deploy: substitui public_html/consultas/anexar_link_sessao.php
 */

require_once __DIR__ . '/../config/db.php';

http_response_code(410);
echo json_encode(['success' => false, 'message' => 'Esta rota foi desativada por segurança.']);
