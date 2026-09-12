<?php
/**
 * Provence — Upload de foto: DESATIVADO na Etapa 3 (auditoria de segurança).
 *
 * Motivo: aceitava qualquer arquivo (inclusive .php) validando só o tipo declarado pelo navegador: permitia executar código no servidor. O site não usa esta rota.
 *
 * Este arquivo substitui o original de propósito (responde 410 Gone) para que a
 * rota antiga não continue acessível mesmo que alguém a conheça.
 * Deploy: substitui public_html/dashboard/upload_photo.php
 */

require_once __DIR__ . '/../config/db.php';

http_response_code(410);
echo json_encode(['success' => false, 'message' => 'Esta rota foi desativada por segurança.']);
