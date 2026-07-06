// Configuração centralizada da API - Hostinger
// O domínio provence.host aponta para public_html/ na Hostinger
// Então: https://provence.host/ = public_html/

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "https://provence.host"

// Estrutura de pastas das APIs na Hostinger (public_html/):
//
// /admin/                  - Painel administrativo
// /agendamento/            - APIs de agendamento
//   agendar-consulta.php
//   exibir-profissionais.php
//   get-horarios-disponiveis.php
// /auth/                   - Autenticação (login, register, etc.)
// /config/                 - Configurações do sistema
// /consultas/              - APIs de consultas
// /dashboard/              - APIs do dashboard
// /paciente/               - APIs do paciente
//   avaliar-consulta.php
//   cancel_consulta.php
//   clear_cancelled_consultas.php
//   confirmar-consulta.php
//   get_all_consultas.php
//   get_configuracoes.php
//   get_historico_pagamentos.php
//   update_configuracoes.php
// /pagamentos/             - APIs de pagamentos
//   gerar_qrcode.php
//   liberar_pagamento_profissional.php
//   webhook_pagamento.php
// /profissionais/          - APIs de horários dos profissionais
//   bloquear_data.php
//   definir_horarios.php
//   listar_dias_bloqueados.php
//   listar_horarios.php
// /profissional/           - APIs do painel do profissional
//   add-link-sessao.php
//   confirmar-consulta.php
//   get_all_consultas.php
//   get_avaliacoes.php
//   get_configuracoes.php
//   get_historico_consultas.php
//   update_configuracoes.php
// /usuarios/               - APIs de usuários
//   atualizar_perfil.php
//   get_perfil.php
// Arquivos na raiz de public_html:
//   aceitar_termos.php
//   completar_perfil.php
//   criar-preferencia.php
//   redefinir_senha.php
