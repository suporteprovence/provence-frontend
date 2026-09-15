# Pacote completo de deploy (Etapas 1, 4 e 3 + varredura geral)

Este pacote junta tudo que ainda não está em produção. Todo arquivo aqui SUBSTITUI o de
mesmo caminho em public_html (ou é novo). Pode subir a pasta `public_html/` inteira por
cima da atual, mantendo a estrutura.

Ordem (resumo; detalhes nos dois LEIA-ME de cada etapa):

1. Backup: compactar a pasta public_html atual no Gerenciador de Arquivos da Hostinger.
2. phpMyAdmin, banco u218657465_PROVENCE, aba SQL: rodar `sql/migracoes-consolidado.sql`
   (idempotente: contém as migrações 02 a 06; as que já rodaram não fazem nada).
3. `.env` (public_html/.env): acrescentar `CHAT_KEY=` (openssl rand -base64 32) e
   `MIGRACAO_TOKEN=` (texto aleatório com 20+ caracteres). Ver LEIA-ME-DEPLOY-ETAPA3.md.
   Opcional: `CONTATO_DESTINO=` se as mensagens do formulário de contato devem ir para
   outro e-mail que não o remetente padrão (`MAIL_FROM`).
4. Subir a pasta `public_html/` deste pacote por cima da atual.
5. Avisar para fazer o push da branch main (Vercel publica o site).
6. Rodar a migração das mensagens antigas do chat (Passo 6 do LEIA-ME-DEPLOY-ETAPA3.md)
   e depois apagar a linha MIGRACAO_TOKEN do .env.
7. Conferência rápida (Passo 7 do LEIA-ME-DEPLOY-ETAPA3.md e Passo 5 do
   LEIA-ME-DEPLOY-ETAPA1-ETAPA4.md).

Os arquivos `public_html/_email_test.php` e `public_html/criar-preferência.php` deste
pacote são versões desativadas (respondem 410). Se preferir, apague os dois do servidor
em vez de substituí-los.
