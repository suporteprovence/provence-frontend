# Deploy: Etapa 2 (pagamento real com Mercado Pago)

Pré-requisito: Etapas 1, 4 e 3 publicadas (ou tudo junto pelo LEIA-ME-PRIMEIRO.md).
O código do pagamento já vai no pacote; ele fica DESLIGADO até o `MP_ACCESS_TOKEN`
entrar no `.env` (o site mostra "pagamento online ainda não está ativo").

## O que a Ana precisa entregar

1. Access Token e Public Key de TESTE e de PRODUÇÃO da aplicação criada no painel
   https://www.mercadopago.com.br/developers/panel/app (tipo Checkout Pro).
2. A "Assinatura secreta" da seção Webhooks dessa aplicação (ou acesso ao painel para
   configurarmos).
3. As respostas: formas de pagamento, taxa da plataforma (%), horas de antecedência
   para reembolso automático, repasse manual por Pix.

## Passo 1: banco

Rodar `sql/07-pagamento-mercadopago.sql` (ou o `migracoes-consolidado.sql`, que já
inclui). Depois ajustar as regras combinadas com a Ana, no phpMyAdmin:

```sql
UPDATE configuracoes_sistema SET valor = '20' WHERE chave = 'taxa_plataforma_percent';
UPDATE configuracoes_sistema SET valor = '24' WHERE chave = 'reembolso_horas_min';
```

## Passo 2: webhook no painel do Mercado Pago

Na aplicação, seção "Webhooks" (ou "Notificações"): modo Produção, URL
`https://provence.host/pagamentos/webhook_pagamento.php`, evento "Pagamentos".
Salvar e copiar a "Assinatura secreta". Repetir para o modo Teste, se o painel pedir
URL separada (pode ser a mesma).

## Passo 3: .env (primeiro em TESTE)

```
MP_ACCESS_TOKEN=TEST-xxxxxxxx      (token de teste)
MP_WEBHOOK_SECRET=xxxxxxxx
API_PUBLIC_URL=https://provence.host
```

Conferir em `https://provence.host/admin/diagnostico.php` (logado como administrador):
deve mostrar `mercadopago.token_valido: true`, o e-mail da conta e `ambiente: teste`.
A lista `pendencias` precisa estar vazia.

## Passo 4: teste no sandbox

1. No painel do MP, em "Contas de teste", criar um comprador de teste (ou usar os
   cartões de teste da documentação: número 5031 4332 1540 6351, CVV 123, validade
   11/30, nome APRO para aprovar / OTHE para recusar).
2. Como paciente no site: agendar uma consulta, "Pagar agora", concluir no Mercado Pago,
   voltar ao site: a consulta deve aparecer como "Pago, aguardando a sessão".
3. Conferir no phpMyAdmin: `pagamentos.status = 'aprovado'` e `mp_payment_id`
   preenchido. Em `logs_sistema` deve haver `mp_pagamento_aprovado`.
4. Como paciente, na aba Pagamentos, "Solicitar reembolso" (com mais de 24h de
   antecedência): o estorno deve ser automático (`reembolsos.status = 'pago'`).
5. Como administrador: /admin/dashboard mostra Reembolsos e Repasses.

## Passo 5: produção

1. Trocar no `.env` o `MP_ACCESS_TOKEN` pelo de PRODUÇÃO (`APP_USR-...`) e a
   `MP_WEBHOOK_SECRET` pela do modo Produção, se for diferente.
2. `admin/diagnostico.php` deve mostrar `ambiente: producao`.
3. Teste real combinado com a Ana: consulta de valor baixo (o profissional de teste
   pode colocar R$ 5,00 no perfil), pagar com Pix de verdade, conferir "Pago", cancelar e
   conferir o estorno na conta do Mercado Pago. Depois restaurar o valor da consulta.

## Como funciona (para explicar à Ana)

- Paciente agenda e paga pelo Mercado Pago (Pix ou cartão; boleto desligado porque
  demora dias). O dinheiro entra na conta MP da Provence.
- Paciente que cancela com a antecedência combinada é estornado na hora. Com menos
  antecedência, o pedido vai para a administração aprovar ou recusar (com justificativa
  que o paciente vê). Profissional que cancela consulta paga gera estorno automático.
- Quando os dois confirmam o término da sessão, o valor do profissional (consulta menos
  a taxa) fica "liberado". A administração faz o Pix para a conta que o profissional
  cadastrou e marca como repassado; o profissional acompanha tudo na aba Pagamentos.
- Cada pagamento é sempre conferido no Mercado Pago (o site nunca confia só no aviso);
  o webhook exige a assinatura secreta.

## Arquivos desta etapa

Novos: `config/mercadopago.php`, `pagamentos/criar_pagamento.php`,
`pagamentos/sincronizar_pagamento.php`, `admin/reembolsos.php`, `admin/repasses.php`,
`admin/diagnostico.php`, `profissional/get_pagamentos.php`, `sql/07-pagamento-mercadopago.sql`.
Substituídos: `pagamentos/webhook_pagamento.php` (o antigo nem executava),
`consultas/solicitar_reembolso.php`, `profissional/cancelar_consulta.php`,
`paciente/get_pagamentos.php`.
