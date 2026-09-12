<?php
/**
 * Provence — LGPD: exportar os dados do titular (Etapa 3).
 *
 *  GET /usuarios/exportar_dados.php   (usuário logado: paciente ou profissional)
 *
 * Devolve um arquivo JSON (download) com tudo que a plataforma guarda sobre a
 * pessoa: cadastro, perfil, dados bancários (profissional), consultas,
 * pagamentos, avaliações, reembolsos, mensagens do chat (decifradas),
 * consentimentos, horários/bloqueios (profissional) e trilha de auditoria.
 * Atende ao direito de acesso/portabilidade (LGPD art. 18, II e V).
 *
 * Deploy: public_html/usuarios/exportar_dados.php (arquivo novo).
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/seguranca.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    provence_responder(401, ['success' => false, 'message' => 'Usuário não autenticado']);
}
if (!empty($_SESSION['is_admin']) || (($_SESSION['user_type'] ?? '') !== 'paciente' && ($_SESSION['user_type'] ?? '') !== 'profissional')) {
    provence_responder(403, ['success' => false, 'message' => 'Disponível apenas para pacientes e profissionais.']);
}

$uid = (int) $_SESSION['user_id'];

/** Executa uma consulta preparada e devolve todas as linhas. */
$todas = function (string $sql, array $params) use ($pdo): array {
    $st = $pdo->prepare($sql);
    $st->execute($params);
    return $st->fetchAll();
};

try {
    $st = $pdo->prepare(
        'SELECT id, nome, email, telefone, cpf, tipo, aprovado, ultimo_login, aceita_termos,
                data_aceite_termos, criado_em
           FROM usuarios WHERE id = ? AND ativo = 1'
    );
    $st->execute([$uid]);
    $usuario = $st->fetch();
    if (!$usuario) {
        provence_responder(404, ['success' => false, 'message' => 'Usuário não encontrado']);
    }
    $tipo = $usuario['tipo'];

    $export = [
        'gerado_em'   => date('Y-m-d H:i:s'),
        'plataforma'  => 'Provence',
        'observacao'  => 'Este arquivo contém os dados pessoais que a Provence guarda sobre você (LGPD, art. 18).',
        'cadastro'    => $usuario,
    ];

    if ($tipo === 'paciente') {
        $export['perfil'] = $todas(
            'SELECT data_nascimento, endereco, cep, cidade, estado, genero, profissao, como_conheceu, objetivos, created_at, updated_at
               FROM pacientes WHERE id = ?', [$uid]
        )[0] ?? null;
    } else {
        $export['perfil'] = $todas(
            'SELECT crp, especialidade, valor_consulta, bio, foto_perfil, data_nascimento, endereco, cep, cidade, estado, genero, created_at, updated_at
               FROM profissionais WHERE id = ?', [$uid]
        )[0] ?? null;
        $export['dados_bancarios'] = $todas(
            'SELECT banco, agencia, conta, tipo_conta, chave_pix, tipo_pix FROM profissionais WHERE id = ?', [$uid]
        )[0] ?? null;
        $export['horarios_atendimento'] = $todas(
            'SELECT dia_semana, horario_inicio, horario_fim FROM horarios_trabalho WHERE id_profissional = ? ORDER BY id', [$uid]
        );
        $export['dias_bloqueados'] = $todas(
            'SELECT data_bloqueada, motivo, criado_em FROM dias_bloqueados WHERE id_profissional = ? ORDER BY data_bloqueada', [$uid]
        );
    }

    // Consultas: a outra parte aparece só pelo nome (é com quem a pessoa se consultou)
    $export['consultas'] = $todas(
        'SELECT c.id, c.data_hora, c.duracao_minutos, c.valor_pago, c.status, c.link_sessao, c.criado_em,
                CASE WHEN c.id_paciente = ? THEN upr.nome ELSE up.nome END AS outra_parte
           FROM consultas c
           JOIN usuarios up  ON up.id  = c.id_paciente
           JOIN usuarios upr ON upr.id = c.id_profissional
          WHERE c.id_paciente = ? OR c.id_profissional = ?
          ORDER BY c.data_hora DESC', [$uid, $uid, $uid]
    );

    $export['pagamentos'] = $todas(
        'SELECT p.id, p.consulta_id, p.valor_total, p.valor_profissional, p.valor_plataforma, p.metodo_pagamento,
                p.status, p.data_pagamento, p.data_liberacao
           FROM pagamentos p
           JOIN consultas c ON c.id = p.consulta_id
          WHERE c.id_paciente = ? OR c.id_profissional = ?
          ORDER BY p.data_pagamento DESC', [$uid, $uid]
    );

    $export['confirmacoes_sessao'] = $todas(
        'SELECT cs.consulta_id, cs.quem, cs.fase, cs.confirmado_em
           FROM confirmacoes_sessao cs
           JOIN consultas c ON c.id = cs.consulta_id
          WHERE c.id_paciente = ? OR c.id_profissional = ?
          ORDER BY cs.confirmado_em', [$uid, $uid]
    );

    if ($tipo === 'paciente') {
        $export['avaliacoes_feitas'] = $todas(
            'SELECT consulta_id, nota, comentario, criado_em FROM avaliacoes WHERE id_paciente = ? ORDER BY criado_em', [$uid]
        );
        $export['reembolsos'] = $todas(
            'SELECT id, consulta_id, motivo, valor_reembolso, status, justificativa, data_solicitacao, data_resposta
               FROM reembolsos WHERE id_paciente = ? ORDER BY data_solicitacao DESC', [$uid]
        );
    } else {
        $export['avaliacoes_recebidas'] = $todas(
            'SELECT consulta_id, nota, comentario, criado_em FROM avaliacoes WHERE id_profissional = ? ORDER BY criado_em', [$uid]
        );
    }

    $mensagens = $todas(
        'SELECT id_consulta, id_remetente, mensagem, enviada_em
           FROM mensagens
          WHERE id_remetente = ? OR id_destinatario = ?
          ORDER BY enviada_em, id', [$uid, $uid]
    );
    foreach ($mensagens as &$m) {
        $m['enviada_por_mim'] = ((int) $m['id_remetente'] === $uid);
        $m['mensagem']        = provence_decifrar($m['mensagem']);
        unset($m['id_remetente']);
    }
    unset($m);
    $export['mensagens_chat'] = $mensagens;

    $export['consentimentos'] = $todas(
        'SELECT tipo, versao, aceito_em, ip_address FROM consentimentos WHERE usuario_id = ? ORDER BY aceito_em', [$uid]
    );

    $export['registros_de_acesso'] = $todas(
        'SELECT acao, descricao, ip_address, criado_em FROM logs_sistema WHERE usuario_id = ? ORDER BY criado_em DESC LIMIT 500', [$uid]
    );

    provence_log($pdo, 'dados_exportados', 'exportação LGPD', $uid);

    $nomeArquivo = 'provence-meus-dados-' . $uid . '-' . date('Y-m-d') . '.json';
    header('Content-Disposition: attachment; filename="' . $nomeArquivo . '"');
    http_response_code(200);
    echo json_encode($export, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
} catch (PDOException $e) {
    error_log('exportar_dados: ' . $e->getMessage());
    provence_responder(500, ['success' => false, 'message' => 'Erro ao gerar a exportação']);
}
