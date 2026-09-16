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

-- ===== 05-reembolsos.sql =====
-- Provence — solicitações de reembolso (Etapa 4)
-- O endpoint antigo gravava numa tabela "reembolsos" que nunca foi criada.
-- Idempotente. Rodar no phpMyAdmin (banco u218657465_PROVENCE), ANTES de subir os PHP.

CREATE TABLE IF NOT EXISTS `reembolsos` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `consulta_id` INT(11) NOT NULL,
  `id_paciente` INT(11) NOT NULL,
  `motivo` VARCHAR(500) NOT NULL,
  `valor_reembolso` DECIMAL(10,2) NOT NULL,
  `status` ENUM('solicitado','aprovado','recusado','pago') NOT NULL DEFAULT 'solicitado',
  `justificativa` TEXT DEFAULT NULL,
  `data_solicitacao` TIMESTAMP NOT NULL DEFAULT current_timestamp(),
  `data_resposta` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_reembolso_consulta` (`consulta_id`),
  KEY `idx_reembolso_paciente` (`id_paciente`),
  CONSTRAINT `fk_reembolso_consulta` FOREIGN KEY (`consulta_id`) REFERENCES `consultas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reembolso_paciente` FOREIGN KEY (`id_paciente`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===== 06-seguranca-lgpd.sql =====
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

-- ===== 07-pagamento-mercadopago.sql =====
-- Provence — Etapa 2: pagamento real (Mercado Pago)
-- Idempotente. Rodar no phpMyAdmin (banco u218657465_PROVENCE).

ALTER TABLE `pagamentos`
  ADD COLUMN IF NOT EXISTS `external_reference` VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS `mp_preference_id` VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS `mp_init_point` VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS `mp_payment_id` VARCHAR(40) NULL,
  ADD COLUMN IF NOT EXISTS `mp_status_detail` VARCHAR(80) NULL,
  ADD COLUMN IF NOT EXISTS `data_repasse` TIMESTAMP NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `atualizado_em` TIMESTAMP NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp();

CREATE INDEX IF NOT EXISTS `idx_pag_consulta` ON `pagamentos` (`consulta_id`);
CREATE INDEX IF NOT EXISTS `idx_pag_mp_payment` ON `pagamentos` (`mp_payment_id`);
CREATE INDEX IF NOT EXISTS `idx_pag_extref` ON `pagamentos` (`external_reference`);

ALTER TABLE `reembolsos`
  ADD COLUMN IF NOT EXISTS `mp_refund_id` VARCHAR(40) NULL;

-- Regras de negócio ajustáveis sem mexer em código (valores iniciais; a Ana confirma).
INSERT INTO `configuracoes_sistema` (`chave`, `valor`, `descricao`, `tipo`) VALUES
  ('taxa_plataforma_percent', '20', 'Percentual de cada consulta que fica com a plataforma (o resto vai para o profissional)', 'number'),
  ('reembolso_horas_min', '24', 'Antecedência mínima, em horas, para o paciente cancelar com reembolso automático', 'number')
ON DUPLICATE KEY UPDATE `chave` = `chave`;
