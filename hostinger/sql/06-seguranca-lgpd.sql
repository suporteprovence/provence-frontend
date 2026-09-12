-- Provence — Etapa 3: segurança + LGPD
-- Idempotente (IF NOT EXISTS / MODIFY): pode rodar mais de uma vez sem erro.
-- Rodar no phpMyAdmin (banco u218657465_PROVENCE) ANTES de subir os PHP da Etapa 3.

-- A2: registro de tentativas de login (bloqueio de força bruta).
-- Guarda só e-mail + IP + resultado; expurgo automático após 30 dias (config/seguranca.php).
CREATE TABLE IF NOT EXISTS `tentativas_login` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(100) NOT NULL,
  `ip` VARCHAR(45) NOT NULL,
  `sucesso` TINYINT(1) NOT NULL DEFAULT 0,
  `criado_em` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_tent_email` (`email`, `criado_em`),
  KEY `idx_tent_ip` (`ip`, `criado_em`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- A1: a coluna veio com ON UPDATE current_timestamp(): qualquer UPDATE na linha
-- (ex.: marcar usado = 1) renovaria a validade do token. Remove o ON UPDATE.
ALTER TABLE `tokens_recuperacao`
  MODIFY `expira_em` TIMESTAMP NOT NULL DEFAULT current_timestamp();

-- B2: marca de exclusão (anonimização) da conta pelo titular.
ALTER TABLE `usuarios` ADD COLUMN IF NOT EXISTS `excluido_em` TIMESTAMP NULL DEFAULT NULL;
