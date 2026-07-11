# Deploy do pacote (perfil, pagamentos, bancário, consentimento, confirmação) + correções

Banco de produção: **u218657465_PROVENCE** (phpMyAdmin da Hostinger).
Raiz do site: **public_html/**.

> IMPORTANTE: siga a ordem. Rodar as migrações ANTES de subir o PHP, e publicar o
> frontend na Vercel ANTES do `register.php`. Fora de ordem, quebra cadastro/telas.

## Passo 1 — Backup (rápido)
Baixe uma cópia dos arquivos que serão SUBSTITUÍDOS, para poder voltar se precisar:
- `public_html/config/db.php`
- `public_html/auth/register.php`
- `public_html/usuarios/get_perfil.php`
- `public_html/usuarios/atualizar_perfil.php`
- `public_html/profissional/get_all_consultas.php`

## Passo 2 — Migrações no phpMyAdmin (NESTA ORDEM)
Abra o phpMyAdmin no banco `u218657465_PROVENCE`, aba SQL, e rode:
1. `sql/01-valor-maximo-1000.sql`
2. `sql/02-dados-bancarios.sql`
3. `sql/03-consentimento-lgpd.sql`
4. `sql/04-confirmacao-sessao.sql`

Ou rode de uma vez `sql/migracoes-consolidado.sql` (é o 01+02+03+04 junto).
Todas são idempotentes: pode rodar de novo sem quebrar.

## Passo 3 — Publicar o frontend (Vercel)
Publique a branch nova na Vercel PRIMEIRO. Isso garante que a tela de cadastro já
envia o aceite dos termos antes de o `register.php` novo passar a exigir esse campo.
Confira em `/register` que aparece o checkbox de aceite.

## Passo 4 — Subir os PHP (public_html/)
Suba exatamente estes arquivos (mantendo as pastas):

| Arquivo do pacote | Destino | Ação |
|---|---|---|
| `config/db.php` | `public_html/config/db.php` | SUBSTITUI (corrige CORS + esconde erro) |
| `auth/register.php` | `public_html/auth/register.php` | SUBSTITUI (aceite de termos + consentimento) |
| `usuarios/get_perfil.php` | `public_html/usuarios/get_perfil.php` | SUBSTITUI (corrige colunas) |
| `usuarios/atualizar_perfil.php` | `public_html/usuarios/atualizar_perfil.php` | SUBSTITUI |
| `profissional/dados_bancarios.php` | `public_html/profissional/dados_bancarios.php` | NOVO |
| `profissional/get_all_consultas.php` | `public_html/profissional/get_all_consultas.php` | SUBSTITUI (corrige colunas) |
| `consultas/confirmar_sessao.php` | `public_html/consultas/confirmar_sessao.php` | NOVO |

Não suba a pasta inteira `hostinger/`. Suba só os 7 arquivos da tabela.
Não é preciso mexer no `.env` de produção (as credenciais continuam as mesmas).

## Passo 5 — Smoke test em produção
Com as migrações aplicadas e os arquivos no ar, teste no site real:
1. Cadastro paciente e profissional (com o checkbox de aceite marcado) → cria a conta
   e grava o consentimento (tabela `consentimentos`).
2. Login do profissional → perfil carrega e salva; valor da consulta respeita o máximo.
3. Aba Pagamentos do profissional → dados bancários salvam.
4. Agenda do profissional carrega as consultas.
5. Uma consulta paga: início/fim confirmados pelos dois lados libera o pagamento.

## Observações de segurança já corrigidas neste pacote
- `config/db.php`: o CORS não reflete mais qualquer `*.vercel.app` (evitava roubo de
  dados/PII e dos dados bancários via site malicioso). Previews novos da Vercel precisam
  ser adicionados à mão na allowlist do `db.php`.
- `confirmar_sessao.php`: não libera pagamento de consulta cancelada/reembolsada.
- `register.php` e `db.php`: não vazam mais mensagem de erro interno ao cliente.
