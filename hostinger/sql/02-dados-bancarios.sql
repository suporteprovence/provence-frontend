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
