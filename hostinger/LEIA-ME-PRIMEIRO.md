# Pacote completo de deploy (Etapas 1, 4, 3 e 2 + varredura geral)

Este pacote junta tudo que ainda não está em produção. Todo arquivo aqui SUBSTITUI o de
mesmo caminho em public_html (ou é novo). Pode subir a pasta `public_html/` inteira por
cima da atual, mantendo a estrutura.

Ordem (resumo; detalhes nos dois LEIA-ME de cada etapa):

1. Backup: compactar a pasta public_html atual no Gerenciador de Arquivos da Hostinger.
2. phpMyAdmin, banco u218657465_PROVENCE, aba SQL: rodar `sql/migracoes-consolidado.sql`
   (idempotente: contém as migrações 02 a 07; as que já rodaram não fazem nada).
3. `.env` (public_html/.env): acrescentar `CHAT_KEY=` (openssl rand -base64 32) e
   `MIGRACAO_TOKEN=` (texto aleatório com 20+ caracteres). Ver LEIA-ME-DEPLOY-ETAPA3.md.
   Opcional: `CONTATO_DESTINO=` se as mensagens do formulário de contato devem ir para
   outro e-mail que não o remetente padrão (`MAIL_FROM`). Modelo completo em `env-exemplo.txt`.
   Pagamento (Etapa 2): `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` e `API_PUBLIC_URL`, ver
   LEIA-ME-DEPLOY-ETAPA2.md. Sem o token o pagamento online fica desligado, o resto funciona.
4. Subir a pasta `public_html/` deste pacote por cima da atual.
5. Avisar para fazer o push da branch main (Vercel publica o site).
6. Rodar a migração das mensagens antigas do chat (Passo 6 do LEIA-ME-DEPLOY-ETAPA3.md)
   e depois apagar a linha MIGRACAO_TOKEN do .env.
7. Conferência rápida: abrir `https://provence.host/admin/diagnostico.php` logado como
   administrador (lista o que falta) e seguir o Passo 7 do LEIA-ME-DEPLOY-ETAPA3.md e o
   Passo 5 do LEIA-ME-DEPLOY-ETAPA1-ETAPA4.md.
8. Etapa 2: LEIA-ME-DEPLOY-ETAPA2.md (teste no sandbox, depois produção).

Os arquivos `public_html/_email_test.php` e `public_html/criar-preferência.php` deste
pacote são versões desativadas (respondem 410). Se preferir, apague os dois do servidor
em vez de substituí-los.

## Avisos por e-mail (cortesia, fora do orçamento)

O pacote inclui `config/notificacoes.php` (novo) e um `config/email_templates.php` com
seis modelos a mais. Com eles, o site passa a avisar automaticamente:

- profissional: quando alguém agenda um horário com ele, e quando o pagamento entra
- paciente: pagamento confirmado, link da sessão, consulta cancelada, e cada mudança
  do reembolso (pedido recebido, dinheiro devolvido ou pedido recusado)

Não é preciso configurar nada: usa o mesmo e-mail que já envia o cadastro e a
recuperação de senha. O envio acontece depois que a tela responde, então nada fica
lento para quem está usando, e o sistema não repete o mesmo aviso se o evento chegar
por dois caminhos. Se o e-mail falhar, a ação continua valendo e a falha fica no log
do servidor.
