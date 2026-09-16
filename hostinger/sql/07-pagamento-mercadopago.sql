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
