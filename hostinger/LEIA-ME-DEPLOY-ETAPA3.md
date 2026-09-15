# Deploy: Etapa 3 (segurança + LGPD)

Este pacote precisa que a Etapa 1/4 já esteja publicada (ou suba os dois pacotes juntos,
na ordem: Etapa 1/4 primeiro, depois este).

A ordem abaixo importa. Em resumo: banco, depois .env, depois PHP, depois o site (Vercel),
depois a migração do chat.

## Passo 1: backup

No Gerenciador de Arquivos da Hostinger, compacte a pasta `public_html` inteira antes de
começar (é rápido e permite voltar atrás).

## Passo 2: migração no phpMyAdmin (banco u218657465_PROVENCE, aba SQL)

Cole e execute `sql/06-seguranca-lgpd.sql`. É idempotente (pode rodar duas vezes).
Ele cria a tabela `tentativas_login`, corrige a coluna `expira_em` de `tokens_recuperacao`
e adiciona `usuarios.excluido_em`.

## Passo 3: .env (public_html/.env)

Adicione estas linhas (o arquivo já existe, só acrescente no final):

```
# Etapa 3
CHAT_KEY=<cole aqui o resultado de: openssl rand -base64 32>
MIGRACAO_TOKEN=<qualquer texto longo e aleatório, com pelo menos 20 caracteres>
```

Para gerar a CHAT_KEY: no terminal SSH da Hostinger (ou no seu computador) rode
`openssl rand -base64 32` e cole o resultado. Precisa ter exatamente 44 caracteres
terminando em `=`. Guarde uma cópia em lugar seguro: sem essa chave as mensagens do chat
não podem ser lidas.

Confira também que `FRONTEND_URL` aponta para o endereço do site (Vercel). É esse endereço
que vai no link do e-mail de recuperação de senha.

## Passo 4: subir os PHP para public_html/ (mantendo as pastas)

Suba todos os arquivos deste pacote na mesma estrutura. Arquivos da pasta `raiz/` vão
direto em `public_html/`.

Novos:
- `config/seguranca.php`
- `validar_token.php` (raiz)
- `usuarios/exportar_dados.php`
- `usuarios/excluir_conta.php`
- `admin/cifrar_mensagens_legado.php`

Substituídos (versões endurecidas):
- `config/db.php` (cabeçalhos de segurança, sessão mais rígida)
- `config/email_templates.php` (cores verdes, templates de recuperação e de exclusão)
- `auth/login.php`, `auth/logout.php`, `auth/register.php`, `auth/completar_perfil.php`
- `verificar_email.php`, `redefinir_senha.php`, `aceitar_termos.php` (raiz)
- `chat/conexao.php`, `chat/enviar.php`, `chat/listar.php`
- `pagamentos/gerar_qrcode.php`

Desativados de propósito (respondem 410; a auditoria mostrou que eram inseguros e o site
não usa nenhum deles):
- `dashboard/upload_photo.php`
- `consultas/anexar_link_sessao.php`, `consultas/validar_codigo_confirmacao.php`,
  `consultas/agendar_consulta.php`
- `pagamentos/liberar_pagamento_profissional.php`
- `paciente/clear_cancelled_consultas.php`, `paciente/confirmar-consulta.php`,
  `profissional/confirmar-consulta.php`
- `_email_test.php` e `criar-preferência.php` (raiz). Estes dois podem simplesmente ser
  apagados do servidor em vez de substituídos, se preferir.

Atenção: assim que `chat/enviar.php` for substituído, o chat só grava mensagens se a
`CHAT_KEY` estiver no .env (por isso o Passo 3 vem antes).

## Passo 4b: correções da varredura geral (mesmo pacote)

Depois da Etapa 3 foi feita uma varredura de todos os botões e caminhos do site. Entraram
no pacote mais estes arquivos (todos substituem o de mesmo caminho):

- `agendamento/agendar-consulta.php`: o original não gravava a duração da consulta
  (coluna obrigatória) e, no modo estrito do MariaDB, o agendamento falhava mostrando o
  erro SQL na tela. Agora grava 50 minutos e só aceita data e hora futuras.
- `auth/register.php`: CPF e telefone passam a ser validados (antes "123" era aceito) e
  um cadastro feito num navegador já logado em outra conta não mistura as duas contas.
- `auth/completar_perfil.php`: profissional pode deixar data de nascimento e gênero em
  branco (antes dava "Erro interno").
- `aceitar_termos.php`: idem ao anterior quanto à sessão de cadastro.

- `contato.php` (raiz, novo) + `config/mailer.php` (substituído): o formulário "Entre em
  Contato" da página inicial passa a enviar a mensagem por e-mail para a caixa da
  plataforma (o remetente configurado no .env, `MAIL_FROM`), com "responder para" apontando
  para quem escreveu. Opcional: `CONTATO_DESTINO=outro@email` no .env para mudar o destino.
  Limite de 5 mensagens por hora por IP.

No site (Vercel): formulário de contato funcionando, aba "Consultas" do profissional passa a mostrar as consultas reais
(era uma tela vazia fixa), painel do paciente ganhou menu para celular, agenda do
profissional mostra "Ver detalhes" e não erra o dia após as 21h, chat não estoura com
mensagens longas, termos podem ser lidos antes do cadastro, botão Cancelar do painel
administrativo fecha a janela, textos antigos ("PsicoOnline") e sobras de debug removidos.

## Passo 5: site (Vercel)

Avise que os PHP subiram. O push da branch `main` publica o site com a nova tela de
"Esqueci minha senha" (link por e-mail), a área "Meus dados e privacidade" e as demais
mudanças. A tela antiga de recuperação (e-mail + CPF) para de funcionar com o backend
novo, então este passo deve vir logo depois do Passo 4.

## Passo 6: cifrar as mensagens antigas do chat (uma vez só)

As mensagens novas já nascem cifradas. Para cifrar as que já existem no banco, rode uma
das opções:

Opção A (terminal SSH da Hostinger, dentro de public_html):
```
php admin/cifrar_mensagens_legado.php
```

Opção B (de qualquer computador):
```
curl -X POST https://provence.host/admin/cifrar_mensagens_legado.php \
     -H "Content-Type: application/json" \
     -d '{"token":"<o MIGRACAO_TOKEN do .env>"}'
```

A resposta mostra quantas foram cifradas e quantas restaram em claro (deve ser 0).
Depois disso, apague a linha `MIGRACAO_TOKEN` do .env.

## Passo 7: conferência rápida em produção

1. Login com senha errada: a mensagem deve ser "E-mail ou senha incorretos." (sem dizer
   se o e-mail existe). Seis erros seguidos: "Muitas tentativas de login...".
2. "Esqueci minha senha": informar o e-mail, receber o link, trocar a senha, entrar.
3. Chat: enviar uma mensagem e ler o histórico (se aparecer "[mensagem indisponível]", a
   CHAT_KEY do .env está errada ou diferente da usada na migração).
4. Meu Perfil, "Baixar meus dados": deve baixar um arquivo .json.
5. Cadastro novo: cadastrar, completar perfil, aceitar termos, entrar.

## O que mudou para a Ana explicar aos usuários

- Recuperação de senha agora é por link enviado ao e-mail cadastrado (vale 1 hora).
- Senha nova precisa ter pelo menos 8 caracteres (contas antigas continuam entrando).
- Depois de 5 tentativas erradas, o login trava por 15 minutos (redefinir a senha destrava).
- Em "Meu Perfil" a pessoa pode baixar todos os seus dados ou excluir a conta.
- Pedidos de correção de dados ou dúvidas de privacidade: contato@provence.host.
