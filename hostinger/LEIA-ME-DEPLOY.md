# Deploy do Chat (PHP + MySQL) na Hostinger

Estes arquivos completam a funcionalidade de **chat** da plataforma Provence.
O frontend (Next.js na Vercel) já chama estes endpoints; falta apenas
colocá-los no servidor.

## 1. O que vai para o servidor

```
hostinger/
└── chat/
    ├── conexao.php   ← conexão com o banco + CORS + sessão (EDITAR credenciais)
    ├── listar.php    ← lista de conversas e histórico de mensagens
    └── enviar.php    ← envio de mensagem
```

Faça upload da pasta `chat/` inteira para dentro de **`public_html/`** na
Hostinger (Gerenciador de Arquivos ou FTP). O resultado final deve ser:

```
public_html/chat/conexao.php   → https://provence.host/chat/conexao.php
public_html/chat/listar.php    → https://provence.host/chat/listar.php
public_html/chat/enviar.php    → https://provence.host/chat/enviar.php
```

> Já existe uma tabela `mensagens` no banco (é parte do schema original do
> projeto). **Não é preciso criar tabela nenhuma** — o chat usa a estrutura
> que já está lá: `id_consulta`, `id_remetente`, `id_destinatario`,
> `mensagem`, `enviada_em`.

## 2. Configurar as credenciais do banco (obrigatório)

Abra `chat/conexao.php` e preencha o bloco marcado:

```php
$DB_HOST = 'localhost';              // na Hostinger, normalmente 'localhost'
$DB_NAME = 'u218657465_PROVENCE';
$DB_USER = 'u218657465_XXXXXX';      // <-- Painel Hostinger > Bancos de dados MySQL
$DB_PASS = 'XXXXXXXXXX';             // <-- senha do banco
```

Use exatamente o mesmo usuário/senha que os outros PHPs do site já usam
(veja em qualquer arquivo de `config/` ou `auth/` no servidor). Se `localhost`
não conectar, troque por `srv1199.hstgr.io`.

## 3. Ponto único a conferir: a sessão do login

O chat identifica o usuário pela **sessão PHP** criada em `auth/login.php`
(igual às telas de perfil e consultas, que já funcionam). O `conexao.php`
já tenta as chaves de sessão mais comuns automaticamente
(`usuario_id`, `user_id`, `id_usuario`, `id`, etc.).

Se ao abrir o chat aparecer "Sessão expirada" mesmo estando logado, abra o
`auth/login.php` do servidor, veja qual chave ele grava (algo como
`$_SESSION['usuario_id'] = $usuario['id'];`) e confirme que essa chave está
na lista da função `usuario_logado_id()` em `conexao.php`. É a única
adaptação que pode ser necessária.

## 4. Teste rápido (depois do upload)

1. Faça login como paciente que tenha **pelo menos uma consulta** marcada.
2. Abra o menu **Chat** — deve listar a(s) conversa(s) (uma por consulta).
3. Envie uma mensagem — ela aparece na hora.
4. Faça login como o **profissional** daquela consulta, abra o **Chat** e
   confirme que a mensagem chegou e que dá para responder.

Teste técnico opcional (logado, no console do navegador em provence.host):

```js
fetch('https://provence.host/chat/listar.php', { credentials: 'include' })
  .then(r => r.json()).then(console.log)
```

Deve retornar `{ success: true, data: [...] }`.

## Contrato dos endpoints (referência)

| Endpoint | Método | Entrada | Saída |
|---|---|---|---|
| `/chat/listar.php` | GET | — | `{success, data:[{id, nome_paciente, nome_profissional, especialidade, ultima_mensagem, data_ultima_mensagem, nao_lidas, online}]}` |
| `/chat/listar.php?consulta_id=N` | GET | query `consulta_id` | `{success, data:[{id, mensagem, enviada_em, id_remetente, tipo_remetente}]}` |
| `/chat/enviar.php` | POST | JSON `{consulta_id, mensagem}` | `{success, message, data:{...}}` |

Todos exigem usuário logado (sessão) e validam que ele participa da consulta.
