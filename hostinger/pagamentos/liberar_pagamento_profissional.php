<?php
/**
 * Provence — Liberar pagamento (antigo): DESATIVADO na Etapa 3 (auditoria de segurança).
 *
 * Motivo: sem sessão nem papel: qualquer pessoa liberava pagamentos. A liberação entra com o pagamento real (Etapa 2).
 *
 * Este arquivo substitui o original de propósito (responde 410 Gone) para que a
 * rota antiga não continue acessível mesmo que alguém a conheça.
 * Deploy: substitui public_html/pagamentos/liberar_pagamento_profissional.php
 */

require_once __DIR__ . '/../config/db.php';

http_response_code(410);
echo json_encode(['success' => false, 'message' => 'Esta rota foi desativada por segurança.']);
