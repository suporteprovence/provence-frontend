<?php
/**
 * Provence — Criar preferência MP (antigo): DESATIVADO na Etapa 3 (auditoria de segurança).
 *
 * Motivo: quebrado (arquivos e tabela inexistentes, token de exemplo). O pagamento real entra na Etapa 2.
 *
 * Este arquivo substitui o original de propósito (responde 410 Gone) para que a
 * rota antiga não continue acessível mesmo que alguém a conheça.
 * Deploy: substitui public_html/criar-preferência.php
 */

require_once __DIR__ . '/config/db.php';

http_response_code(410);
echo json_encode(['success' => false, 'message' => 'Esta rota foi desativada por segurança.']);
