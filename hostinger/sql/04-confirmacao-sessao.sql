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
