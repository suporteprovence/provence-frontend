# Deploy: Etapa 1 (horários + link) e Etapa 4 (avaliação + pagamentos/reembolso)

Banco de produção: **u218657465_PROVENCE** (phpMyAdmin). Raiz do site: **public_html/**.

> ORDEM: rode a migração no phpMyAdmin ANTES de subir os PHP. E publique o frontend
> na Vercel junto (as telas novas chamam estes endpoints; sem eles, dão erro).

## Passo 1: Backup rápido dos arquivos que serão substituídos
config/db.php, auth (nenhum aqui), consultas/confirmar_sessao.php,
profissional/dados_bancarios.php, chat/enviar.php,
profissionais/listar_horarios.php, profissionais/definir_horarios.php,
profissionais/bloquear_data.php, profissionais/listar_dias_bloqueados.php,
profissional/add-link-sessao.php, agendamento/get-horarios-disponiveis.php,
paciente/avaliar-consulta.php, consultas/solicitar_reembolso.php

## Passo 2: Migração no phpMyAdmin (banco u218657465_PROVENCE, aba SQL)
Rode `sql/05-reembolsos.sql` (cria a tabela `reembolsos`; idempotente).

## Passo 3: Subir os PHP para public_html/ (mantendo as pastas)

| Arquivo | Destino | Ação |
|---|---|---|
| config/db.php | public_html/config/ | SUBSTITUI (proteção CSRF + fuso do Brasil) |
| profissionais/listar_horarios.php | public_html/profissionais/ | SUBSTITUI |
| profissionais/definir_horarios.php | public_html/profissionais/ | SUBSTITUI |
| profissionais/listar_dias_bloqueados.php | public_html/profissionais/ | SUBSTITUI |
| profissionais/bloquear_data.php | public_html/profissionais/ | SUBSTITUI |
| profissionais/desbloquear_data.php | public_html/profissionais/ | NOVO |
| profissional/add-link-sessao.php | public_html/profissional/ | SUBSTITUI |
| agendamento/get-horarios-disponiveis.php | public_html/agendamento/ | SUBSTITUI |
| paciente/avaliar-consulta.php | public_html/paciente/ | SUBSTITUI |
| paciente/get_pagamentos.php | public_html/paciente/ | NOVO |
| consultas/solicitar_reembolso.php | public_html/consultas/ | SUBSTITUI |
| consultas/confirmar_sessao.php | public_html/consultas/ | SUBSTITUI (tira brecha CSRF) |
| profissional/dados_bancarios.php | public_html/profissional/ | SUBSTITUI (tira brecha CSRF) |
| chat/enviar.php | public_html/chat/ | SUBSTITUI (tira brecha CSRF) |

## Passo 4: Frontend (Vercel)
Publicar a branch. As telas novas: aba "Horários" e campo de link (profissional),
avaliação no histórico e a tela de pagamentos/reembolso (paciente).

## Passo 5: Smoke test em produção
1. Profissional: aba Horários, ligar um dia, salvar; bloquear uma data.
2. Paciente: agendar com esse profissional (o horário aparece); a data bloqueada some.
3. Profissional: colar o link numa consulta confirmada; paciente vê "Entrar na sessão".
4. Paciente: avaliar uma consulta realizada; pedir reembolso de uma consulta paga.

## Observações
- O pagamento continua SIMULAÇÃO (o Pix não cobra de verdade). O pagamento real é a
  Etapa 2 e depende de uma conta de recebimento (Mercado Pago) verificada da Provence.
- config/db.php passa a bloquear escrita vinda de site fora da lista de origens
  conhecidas. Se um dia trocar o domínio do site, adicionar na allowlist do db.php.
