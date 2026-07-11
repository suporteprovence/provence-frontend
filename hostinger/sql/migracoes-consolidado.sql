-- Provence — migrações do pacote (consolidado 01+02+03+04).
-- Rodar no phpMyAdmin, banco u218657465_PROVENCE. Idempotente (pode rodar 2x).
-- Rode ANTES de subir os arquivos PHP.

-- ==================================================================
-- 01-valor-maximo-1000.sql
-- ==================================================================
-- Provence — alinha o valor máximo da consulta para R$ 1.000,00
-- (a plataforma estava com 500 na config, mas o cadastro usa 1000; unifica em 1000).
-- Rodar uma vez no phpMyAdmin (banco u218657465_PROVENCE).

UPDATE configuracoes_sistema SET valor = '1000.00' WHERE chave = 'valor_maximo_consulta';

-- Garante o mínimo em 50 (caso não exista, ignore o resultado)
UPDATE configuracoes_sistema SET valor = '50.00' WHERE chave = 'valor_minimo_consulta';

-- ==================================================================
-- 02-dados-bancarios.sql
-- ==================================================================
-- Provence — dados bancários do profissional (item 3)
-- Adiciona os campos de recebimento na tabela profissionais.
-- Idempotente (IF NOT EXISTS): pode rodar mais de uma vez sem erro.
-- Rodar no phpMyAdmin (banco u218657465_PROVENCE).

ALTER TABLE `profissionais`
  ADD COLUMN IF NOT EXISTS `banco`      VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS `agencia`    VARCHAR(20)  NULL,
  ADD COLUMN IF NOT EXISTS `conta`      VARCHAR(30)  NULL,
  ADD COLUMN IF NOT EXISTS `tipo_conta` ENUM('corrente','poupanca') NULL,
  ADD COLUMN IF NOT EXISTS `chave_pix`  VARCHAR(140) NULL,
  ADD COLUMN IF NOT EXISTS `tipo_pix`   ENUM('cpf','cnpj','email','telefone','aleatoria') NULL;

-- ==================================================================
-- 03-consentimento-lgpd.sql
-- ==================================================================
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

-- ==================================================================
-- 04-confirmacao-sessao.sql
-- ==================================================================
-- Provence — confirmação de início e fim da sessão pelos dois lados (item 5)
-- Cada confirmação é uma linha (consulta + quem + fase). Idempotente.
-- Rodar no phpMyAdmin (banco u218657465_PROVENCE).

CREATE TABLE IF NOT EXISTS `confirmacoes_sessao` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `consulta_id` INT(11) NOT NULL,
  `quem` ENUM('paciente','profissional') NOT NULL,
  `fase` ENUM('inicio','fim') NOT NULL,
  `confirmado_em` DATETIME NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_conf_sessao` (`consulta_id`, `quem`, `fase`),
  KEY `idx_conf_sessao_consulta` (`consulta_id`),
  CONSTRAINT `fk_conf_sessao_consulta` FOREIGN KEY (`consulta_id`) REFERENCES `consultas` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

