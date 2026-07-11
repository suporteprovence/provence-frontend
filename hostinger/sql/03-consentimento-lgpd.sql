-- Provence — registro de consentimento LGPD (item 4)
-- Cria o log auditável de consentimento e a versão vigente dos termos.
-- Idempotente. Rodar no phpMyAdmin (banco u218657465_PROVENCE).

-- Log de consentimentos (quem aceitou, quando, qual versão, de qual IP)
CREATE TABLE IF NOT EXISTS `consentimentos` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` INT(11) NOT NULL,
  `tipo` VARCHAR(50) NOT NULL DEFAULT 'termos_privacidade',
  `versao` VARCHAR(20) NOT NULL,
  `aceito_em` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  `ip_address` VARCHAR(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_consent_usuario` (`usuario_id`),
  CONSTRAINT `fk_consent_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Versão vigente dos termos (fonte única; bump quando os termos mudarem)
INSERT INTO `configuracoes_sistema` (`chave`, `valor`, `descricao`, `tipo`)
  VALUES ('versao_termos', '1.0', 'Versao vigente dos Termos e Politica de Privacidade', 'string')
  ON DUPLICATE KEY UPDATE `chave` = `chave`;

-- Guarda na propria conta a versao aceita (consulta rapida)
ALTER TABLE `usuarios` ADD COLUMN IF NOT EXISTS `versao_termos_aceita` VARCHAR(20) NULL;
