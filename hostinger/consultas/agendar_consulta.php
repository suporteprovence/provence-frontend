<?php
/**
 * Provence — Agendar (antigo): DESATIVADO na Etapa 3 (auditoria de segurança).
 *
 * Motivo: quebrado (colunas inexistentes) e devolvia o erro do banco ao cliente. O site usa agendamento/agendar-consulta.php.
 *
 * Este arquivo substitui o original de propósito (responde 410 Gone) para que a
 * rota antiga não continue acessível mesmo que alguém a conheça.
 * Deploy: substitui public_html/consultas/agendar_consulta.php
 */

require_once __DIR__ . '/../config/db.php';

http_response_code(410);
echo json_encode(['success' => false, 'message' => 'Esta rota foi desativada por segurança.']);
