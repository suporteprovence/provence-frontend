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
