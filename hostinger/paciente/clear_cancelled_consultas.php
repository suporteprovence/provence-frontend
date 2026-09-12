<?php
/**
 * Provence — Limpar canceladas (antigo): DESATIVADO na Etapa 3 (auditoria de segurança).
 *
 * Motivo: sem sessão assumia usuário 1 e apagava consultas; usava coluna inexistente. O site não usa esta rota.
 *
 * Este arquivo substitui o original de propósito (responde 410 Gone) para que a
 * rota antiga não continue acessível mesmo que alguém a conheça.
 * Deploy: substitui public_html/paciente/clear_cancelled_consultas.php
 */

require_once __DIR__ . '/../config/db.php';

http_response_code(410);
echo json_encode(['success' => false, 'message' => 'Esta rota foi desativada por segurança.']);
