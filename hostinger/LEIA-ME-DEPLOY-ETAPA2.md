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
-- taxa da plataforma (contrato, cláusula 3.3)
UPDATE configuracoes_sistema SET valor = '30' WHERE chave = 'taxa_plataforma_percent';
-- prazo para cancelar com devolução integral
UPDATE configuracoes_sistema SET valor = '24' WHERE chave = 'reembolso_horas_min';
```

Regra de cancelamento (confirmar com a Ana antes de ligar). O contrato, na cláusula 4,
está ambíguo, mas os Termos de Uso do site já dizem ao paciente: "Consultas podem ser
canceladas até 24 horas antes do horário agendado para reembolso total. Cancelamentos
com menos de 24 horas podem estar sujeitos a taxas." Somando com a cláusula 4.1 (retenção
de 30%), a regra fica: 24 horas ou mais devolve tudo, menos de 24 horas devolve 70%.
Para o sistema fazer isso sozinho:

```sql
UPDATE configuracoes_sistema SET valor = '30' WHERE chave = 'reembolso_retencao_percent';
UPDATE configuracoes_sistema SET valor = '1'  WHERE chave = 'reembolso_tardio_automatico';
```

Enquanto `reembolso_tardio_automatico` ficar em 0, o cancelamento de última hora vai para
a administração aprovar ou recusar no painel, e o estorno sai integral quando aprovado.

## Passo 2: webhook no painel do Mercado Pago

Na aplicação, seção "Webhooks" (ou "Notificações"): modo Produção, URL
`https://provence.host/pagamentos/webhook_pagamento.php`, evento "Pagamentos".
Salvar e copiar a "Assinatura secreta". Repetir para o modo Teste, se o painel pedir
URL separada (pode ser a mesma).

Se este passo não for possível agora, o pagamento continua funcionando: o aviso do
Mercado Pago é aceito mesmo sem assinatura (o sistema nunca confia no aviso, ele sempre
consulta o pagamento na API do Mercado Pago) e, no pior caso, o status é atualizado
quando o paciente volta do checkout ou clica em "Atualizar status". Aviso com assinatura
errada continua sendo recusado.

## Passo 3: .env (primeiro em TESTE)

```
MP_ACCESS_TOKEN=xxxxxxxx           (Access Token de TESTE)
MP_AMBIENTE=teste
MP_WEBHOOK_SECRET=xxxxxxxx
API_PUBLIC_URL=https://provence.host
```

Atenção ao `MP_AMBIENTE`: no painel atual do Mercado Pago o token de teste e o de
produção começam os dois com `APP_USR-`, então o site não tem como adivinhar. É essa
linha que faz aparecer (ou não) o aviso "Ambiente de teste" para o paciente. O
`admin/diagnostico.php` compara o que está no .env com a conta real do token e avisa
se estiverem trocados.

Conferir em `https://provence.host/admin/diagnostico.php` (logado como administrador):
deve mostrar `mercadopago.token_valido: true`, o e-mail da conta e `ambiente: teste`.
A lista `pendencias` precisa estar vazia.

## Passo 4: teste no sandbox

1. No painel do MP, em "Contas de teste", criar DUAS contas de teste: uma vendedora
   (é dela que saem as credenciais de teste) e uma compradora. O Mercado Pago recusa o
   pagamento com a mensagem "uma das partes é de teste" se o comprador for uma pessoa
   comum pagando numa loja de teste, por isso a conta compradora é obrigatória.
   Cartão de teste que funciona hoje: Visa 4235 6477 2802 5682, CVV 123, validade
   11/30, titular APRO (aprova) ou OTHE (recusa), CPF 12345678909. O Mastercard
   5031 4332 1540 6351 que aparece em tutoriais antigos é recusado pelo checkout.
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

## Coisas que só apareceram no teste contra a API real

- O endereço de retorno (back_urls) precisa ser público. Com o site rodando em rede
  local o Mercado Pago recusa a preferência com `invalid_auto_return`. O código agora
  refaz a preferência sem o retorno automático nesse caso, em vez de falhar.
- O antigo `sandbox.mercadopago.com.br` está fora do ar. O link de pagamento é sempre
  o `init_point` normal; com credencial de teste ele já roda em modo de teste.
- O Pix pode não aparecer entre as formas de pagamento se a conta não tiver chave Pix
  cadastrada no Mercado Pago. Vale conferir na conta da Provence antes de anunciar Pix.

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
