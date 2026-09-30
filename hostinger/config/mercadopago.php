<?php
/**
 * Provence — integração com o Mercado Pago (Etapa 2). REST direto, sem SDK.
 *
 * Variáveis do .env:
 *   MP_ACCESS_TOKEN    Access Token da aplicação
 *   MP_AMBIENTE        'teste' ou 'producao'. No painel novo do Mercado Pago as credenciais
 *                      de teste TAMBÉM começam com APP_USR-, então o prefixo não serve
 *                      para adivinhar. Sem esta variável, só um token TEST-... conta como teste.
 *   MP_WEBHOOK_SECRET  "Assinatura secreta" da seção Webhooks da aplicação (valida as notificações)
 *   API_PUBLIC_URL     endereço público da API (padrão https://provence.host), usado na notification_url
 *   FRONTEND_URL       endereço do site (já existe), usado nas back_urls
 *   MP_API_BASE        só para teste local (aponta para o simulador); padrão https://api.mercadopago.com
 *
 * Funções:
 *   mp_configurado()                  há Access Token?
 *   mp_ambiente()                     'teste' | 'producao' (pelo prefixo do token)
 *   mp_request()                      chamada HTTP autenticada (curl)
 *   mp_assinatura_valida()            confere o x-signature do webhook
 *   mp_aplicar_pagamento()            aplica um pagamento do MP no banco (idempotente)
 *   mp_sincronizar_por_payment_id()   busca o pagamento no MP e aplica
 *   mp_config_numero()                lê configuracoes_sistema (taxa, horas de reembolso)
 *   mp_reembolsar()                   estorna um pagamento no MP e registra no banco
 *
 * Deploy: public_html/config/mercadopago.php (arquivo novo).
 */

function mp_env(string $chave, string $padrao = ''): string
{
    if (isset($_ENV[$chave]) && $_ENV[$chave] !== '') {
        return (string) $_ENV[$chave];
    }
    $v = getenv($chave);
    return ($v !== false && $v !== '') ? (string) $v : $padrao;
}

function mp_token(): string
{
    return mp_env('MP_ACCESS_TOKEN');
}

function mp_configurado(): bool
{
    return mp_token() !== '';
}

function mp_ambiente(): string
{
    $exp = strtolower(trim(mp_env('MP_AMBIENTE')));
    if ($exp === 'teste' || $exp === 'test' || $exp === 'sandbox') {
        return 'teste';
    }
    if ($exp === 'producao' || $exp === 'produção' || $exp === 'production') {
        return 'producao';
    }
    return strpos(mp_token(), 'TEST-') === 0 ? 'teste' : 'producao';
}

/** A conta dona do token é uma conta de teste do Mercado Pago? (recebe o GET /users/me) */
function mp_conta_e_teste(array $conta): bool
{
    $email = (string) ($conta['email'] ?? '');
    if ($email !== '' && substr($email, -13) === '@testuser.com') {
        return true;
    }
    $tags = $conta['tags'] ?? [];
    return is_array($tags) && in_array('test_user', $tags, true);
}

function mp_api_base(): string
{
    return rtrim(mp_env('MP_API_BASE', 'https://api.mercadopago.com'), '/');
}

function mp_api_publica(): string
{
    return rtrim(mp_env('API_PUBLIC_URL', 'https://provence.host'), '/');
}

function mp_frontend(): string
{
    return rtrim(mp_env('FRONTEND_URL', 'https://provence-frontend.vercel.app'), '/');
}

/**
 * Chamada autenticada ao Mercado Pago.
 * Retorna ['status' => int, 'body' => array|null, 'raw' => string, 'erro' => string|null].
 */
function mp_request(string $metodo, string $caminho, ?array $corpo = null, ?string $idempotencia = null): array
{
    $url = mp_api_base() . $caminho;
    $headers = [
        'Authorization: Bearer ' . mp_token(),
        'Content-Type: application/json',
        'Accept: application/json',
    ];
    if ($metodo === 'POST' || $metodo === 'PUT') {
        $headers[] = 'X-Idempotency-Key: ' . ($idempotencia ?? bin2hex(random_bytes(16)));
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => $metodo,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_TIMEOUT        => 25,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    if ($corpo !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($corpo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    } elseif ($metodo === 'POST') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, '{}');
    }
    $raw = curl_exec($ch);
    $erro = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if ($raw === false) {
        error_log('mercadopago: falha de rede em ' . $metodo . ' ' . $caminho . ': ' . $erro);
        return ['status' => 0, 'body' => null, 'raw' => '', 'erro' => $erro];
    }
    $body = json_decode((string) $raw, true);
    if ($status >= 400) {
        error_log('mercadopago: ' . $metodo . ' ' . $caminho . ' -> HTTP ' . $status . ' ' . mb_substr((string) $raw, 0, 500));
    }
    return ['status' => $status, 'body' => is_array($body) ? $body : null, 'raw' => (string) $raw, 'erro' => null];
}

/**
 * Valida a assinatura da notificação (cabeçalhos x-signature e x-request-id).
 * Formato do MP: x-signature: "ts=<unix>,v1=<hmac>"; manifest "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 * com HMAC-SHA256 usando a assinatura secreta da aplicação.
 */
function mp_assinatura_valida(string $xSignature, string $xRequestId, string $dataId): bool
{
    $segredo = mp_env('MP_WEBHOOK_SECRET');
    if ($segredo === '') {
        return false;
    }
    $ts = '';
    $v1 = '';
    foreach (explode(',', $xSignature) as $parte) {
        $kv = explode('=', trim($parte), 2);
        if (count($kv) !== 2) {
            continue;
        }
        if (trim($kv[0]) === 'ts') {
            $ts = trim($kv[1]);
        } elseif (trim($kv[0]) === 'v1') {
            $v1 = trim($kv[1]);
        }
    }
    if ($ts === '' || $v1 === '') {
        return false;
    }
    // Aceita notificações de até 10 minutos (contra replay antigo)
    if (!ctype_digit($ts) || abs(time() - (int) $ts) > 600) {
        return false;
    }
    $id = ctype_alnum($dataId) && !ctype_digit($dataId) ? strtolower($dataId) : $dataId;
    $manifest = 'id:' . $id . ';request-id:' . $xRequestId . ';ts:' . $ts . ';';
    $esperado = hash_hmac('sha256', $manifest, $segredo);
    return hash_equals($esperado, $v1);
}

/** Lê um número de configuracoes_sistema (com padrão). */
function mp_config_numero(PDO $pdo, string $chave, float $padrao): float
{
    try {
        $st = $pdo->prepare('SELECT valor FROM configuracoes_sistema WHERE chave = ? LIMIT 1');
        $st->execute([$chave]);
        $v = $st->fetchColumn();
        if ($v !== false && $v !== null && is_numeric($v)) {
            return (float) $v;
        }
    } catch (Throwable $e) {
        error_log('mp_config_numero: ' . $e->getMessage());
    }
    return $padrao;
}

/** Mapeia payment_type_id / payment_method_id do MP para um rótulo curto. */
function mp_metodo_rotulo(array $p): string
{
    $tipo = (string) ($p['payment_type_id'] ?? '');
    $met  = (string) ($p['payment_method_id'] ?? '');
    if ($met === 'pix' || $tipo === 'bank_transfer') {
        return 'pix';
    }
    if ($tipo === 'credit_card') {
        return 'cartao_credito';
    }
    if ($tipo === 'debit_card') {
        return 'cartao_debito';
    }
    if ($tipo === 'ticket') {
        return 'boleto';
    }
    if ($tipo === 'account_money') {
        return 'saldo_mp';
    }
    return $met !== '' ? mb_substr($met, 0, 50) : ($tipo !== '' ? mb_substr($tipo, 0, 50) : 'mercadopago');
}

/**
 * Aplica no banco o estado de um pagamento vindo do MP (objeto de GET /v1/payments/{id}).
 * Idempotente: pode ser chamado pelo webhook, pelo retorno do checkout e por sincronizações.
 * Retorna ['ok' => bool, 'motivo' => string, 'pagamento_id' => ?int, 'consulta_id' => ?int, 'status' => ?string].
 */
function mp_aplicar_pagamento(PDO $pdo, array $p): array
{
    $mpId   = isset($p['id']) ? (string) $p['id'] : '';
    $fecharPref = '';
    $extRef = isset($p['external_reference']) ? (string) $p['external_reference'] : '';
    $mpStatus = (string) ($p['status'] ?? '');
    $detalhe  = mb_substr((string) ($p['status_detail'] ?? ''), 0, 80);
    $valorMp  = isset($p['transaction_amount']) ? (float) $p['transaction_amount'] : 0.0;

    if ($mpId === '') {
        return ['ok' => false, 'motivo' => 'pagamento sem id', 'pagamento_id' => null, 'consulta_id' => null, 'status' => null];
    }

    $pdo->beginTransaction();
    try {
        // Localiza a linha: primeiro pelo id do pagamento no MP, depois pela referência externa
        $st = $pdo->prepare('SELECT * FROM pagamentos WHERE mp_payment_id = ? LIMIT 1 FOR UPDATE');
        $st->execute([$mpId]);
        $pag = $st->fetch();
        if (!$pag && $extRef !== '') {
            $st = $pdo->prepare('SELECT * FROM pagamentos WHERE external_reference = ? ORDER BY id DESC LIMIT 1 FOR UPDATE');
            $st->execute([$extRef]);
            $pag = $st->fetch();
        }
        if (!$pag) {
            $pdo->rollBack();
            error_log('mercadopago: pagamento ' . $mpId . ' sem correspondência (external_reference=' . $extRef . ')');
            return ['ok' => false, 'motivo' => 'sem correspondência no banco', 'pagamento_id' => null, 'consulta_id' => null, 'status' => null];
        }

        $pagId      = (int) $pag['id'];
        $consultaId = (int) $pag['consulta_id'];
        $atual      = (string) $pag['status'];

        // Segurança: o valor pago tem que bater com o valor cobrado
        if ($mpStatus === 'approved' && abs($valorMp - (float) $pag['valor_total']) > 0.01) {
            $pdo->prepare('UPDATE pagamentos SET mp_payment_id = ?, mp_status_detail = ? WHERE id = ?')
                ->execute([$mpId, 'valor_divergente:' . $valorMp, $pagId]);
            $pdo->commit();
            error_log('mercadopago: valor divergente no pagamento ' . $mpId . ' (' . $valorMp . ' x ' . $pag['valor_total'] . ')');
            if (function_exists('provence_log')) {
                provence_log($pdo, 'mp_valor_divergente', 'pagamento ' . $mpId . ' consulta ' . $consultaId);
            }
            return ['ok' => false, 'motivo' => 'valor divergente', 'pagamento_id' => $pagId, 'consulta_id' => $consultaId, 'status' => $atual];
        }

        $novo = $atual;
        $metodo = mp_metodo_rotulo($p);
        $idGravado = (string) ($pag['mp_payment_id'] ?? '');
        $mesmoPagamento = ($idGravado === '' || $idGravado === $mpId);

        // ------------------------------------------------------------------
        // Pagamento DIFERENTE do que a linha já acompanha
        // ------------------------------------------------------------------
        if (!$mesmoPagamento) {
            $dinheiroJaCapturado = in_array($atual, ['aprovado', 'liberado', 'reembolsado'], true);
            if ($mpStatus === 'approved' && $dinheiroJaCapturado) {
                // Duplicado (ex.: Pix pago duas vezes, ou pagamento de consulta já cancelada):
                // estorna na hora e registra para a administração. A linha não muda.
                $pdo->commit();
                $dup = mp_request('POST', '/v1/payments/' . $mpId . '/refunds', null, 'dup-' . $mpId);
                $okDup = in_array($dup['status'], [200, 201], true);
                if (function_exists('provence_log')) {
                    provence_log($pdo, $okDup ? 'mp_pagamento_duplicado_estornado' : 'mp_pagamento_duplicado_sem_estorno',
                        'consulta ' . $consultaId . ' pagamento ' . $pagId . ' ja tinha mp ' . $idGravado . '; duplicado mp ' . $mpId . ' valor ' . $valorMp . ($okDup ? '' : ' (HTTP ' . $dup['status'] . ')'));
                }
                error_log('mercadopago: pagamento duplicado ' . $mpId . ' na consulta ' . $consultaId . ($okDup ? ' estornado' : ' SEM estorno'));
                return ['ok' => true, 'motivo' => $okDup ? 'duplicado_estornado' : 'duplicado_sem_estorno', 'pagamento_id' => $pagId, 'consulta_id' => $consultaId, 'status' => $atual];
            }
            if ($mpStatus !== 'approved') {
                // Outro pagamento (pendente, recusado ou o próprio duplicado já estornado)
                // que não é o da linha: não altera nada.
                $pdo->commit();
                return ['ok' => true, 'motivo' => 'ignorado:' . $mpStatus, 'pagamento_id' => $pagId, 'consulta_id' => $consultaId, 'status' => $atual];
            }
            // approved e a linha ainda não tinha dinheiro (pendente/falhou): passa a acompanhar este.
        }

        if ($mpStatus === 'approved') {
            if (in_array($atual, ['pendente', 'falhou'], true)) {
                $novo = 'aprovado';
                $dataAprov = isset($p['date_approved']) ? date('Y-m-d H:i:s', strtotime((string) $p['date_approved'])) : date('Y-m-d H:i:s');
                $pdo->prepare('UPDATE pagamentos SET status = ?, mp_payment_id = ?, mp_status_detail = ?, metodo_pagamento = ?, data_pagamento = ? WHERE id = ?')
                    ->execute([$novo, $mpId, $detalhe, $metodo, $dataAprov, $pagId]);
                $pdo->prepare("UPDATE consultas SET status = 'paga' WHERE id = ? AND status = 'pendente'")->execute([$consultaId]);
                $fecharPref = (string) ($pag['mp_preference_id'] ?? '');
            } else {
                $pdo->prepare('UPDATE pagamentos SET mp_payment_id = ? WHERE id = ?')->execute([$mpId, $pagId]);
            }
        } elseif ($mpStatus === 'refunded' || $mpStatus === 'charged_back') {
            if ($atual !== 'reembolsado') {
                $novo = 'reembolsado';
                $pdo->prepare('UPDATE pagamentos SET status = ?, mp_payment_id = ?, mp_status_detail = ? WHERE id = ?')
                    ->execute([$novo, $mpId, $detalhe, $pagId]);
                // consulta ainda não realizada volta a cancelada
                $pdo->prepare("UPDATE consultas SET status = 'cancelada_por_nao_ocorrencia' WHERE id = ? AND status NOT IN ('realizada','cancelada_por_nao_ocorrencia')")
                    ->execute([$consultaId]);
                // registra/fecha o reembolso
                $st = $pdo->prepare("SELECT id FROM reembolsos WHERE consulta_id = ? AND status IN ('solicitado','aprovado') ORDER BY id DESC LIMIT 1");
                $st->execute([$consultaId]);
                $rid = $st->fetchColumn();
                if ($rid) {
                    $pdo->prepare("UPDATE reembolsos SET status = 'pago', data_resposta = NOW(), justificativa = COALESCE(justificativa, 'Estorno confirmado pelo Mercado Pago') WHERE id = ?")->execute([(int) $rid]);
                } else {
                    $st = $pdo->prepare('SELECT id_paciente FROM consultas WHERE id = ?');
                    $st->execute([$consultaId]);
                    $idPac = (int) $st->fetchColumn();
                    $pdo->prepare("INSERT INTO reembolsos (consulta_id, id_paciente, motivo, valor_reembolso, status, justificativa, data_resposta) VALUES (?, ?, 'Estorno registrado pelo Mercado Pago', ?, 'pago', ?, NOW())")
                        ->execute([$consultaId, $idPac, (float) $pag['valor_total'], $mpStatus === 'charged_back' ? 'Contestação (chargeback) no Mercado Pago' : 'Estorno pelo Mercado Pago']);
                }
            }
        } elseif (in_array($mpStatus, ['rejected', 'cancelled'], true)) {
            if ($atual === 'pendente') {
                $novo = 'falhou';
                $pdo->prepare('UPDATE pagamentos SET status = ?, mp_payment_id = ?, mp_status_detail = ?, metodo_pagamento = ? WHERE id = ?')
                    ->execute([$novo, $mpId, $detalhe, $metodo, $pagId]);
            }
        } else {
            // pending, in_process, authorized, in_mediation: guarda o id e o detalhe
            if ($atual === 'pendente') {
                $pdo->prepare('UPDATE pagamentos SET mp_payment_id = ?, mp_status_detail = ?, metodo_pagamento = COALESCE(metodo_pagamento, ?) WHERE id = ?')
                    ->execute([$mpId, $detalhe, $metodo, $pagId]);
            }
        }

        $pdo->commit();
        if (!empty($fecharPref)) {
            mp_fechar_preferencia($fecharPref);
        }
        if ($novo !== $atual && function_exists('provence_log')) {
            provence_log($pdo, 'mp_pagamento_' . $novo, 'pagamento ' . $pagId . ' (mp ' . $mpId . ') consulta ' . $consultaId . ' ' . $mpStatus . '/' . $detalhe);
        }
        return ['ok' => true, 'motivo' => $mpStatus, 'pagamento_id' => $pagId, 'consulta_id' => $consultaId, 'status' => $novo, 'mudou' => ($novo !== $atual)];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('mp_aplicar_pagamento: ' . $e->getMessage());
        return ['ok' => false, 'motivo' => 'erro interno', 'pagamento_id' => null, 'consulta_id' => null, 'status' => null];
    }
}

/** Busca o pagamento no MP (fonte da verdade) e aplica no banco. */
function mp_sincronizar_por_payment_id(PDO $pdo, string $mpId): array
{
    if (!preg_match('/^[0-9]{1,30}$/', $mpId)) {
        return ['ok' => false, 'motivo' => 'id inválido', 'pagamento_id' => null, 'consulta_id' => null, 'status' => null];
    }
    $r = mp_request('GET', '/v1/payments/' . $mpId);
    if ($r['status'] !== 200 || !is_array($r['body'])) {
        return ['ok' => false, 'motivo' => 'mp indisponível (' . $r['status'] . ')', 'pagamento_id' => null, 'consulta_id' => null, 'status' => null, 'http' => $r['status']];
    }
    return mp_aplicar_pagamento($pdo, $r['body']);
}

/**
 * Estorna um pagamento aprovado no MP e fecha o reembolso no banco.
 * $reembolsoId: linha de reembolsos a marcar como 'pago'.
 * $valorParcial: quando informado e menor que o total, devolve só essa parte (usado
 * quando o cancelamento é tardio e o contrato prevê retenção de uma porcentagem).
 * Retorna ['ok'=>bool,'message'=>string,'valor'=>float].
 */
function mp_reembolsar(PDO $pdo, int $pagamentoId, int $reembolsoId, string $justificativa, ?float $valorParcial = null): array
{
    $st = $pdo->prepare('SELECT id, consulta_id, mp_payment_id, status, valor_total FROM pagamentos WHERE id = ?');
    $st->execute([$pagamentoId]);
    $pag = $st->fetch();
    if (!$pag) {
        return ['ok' => false, 'message' => 'Pagamento não encontrado.'];
    }
    if ($pag['status'] === 'reembolsado') {
        $pdo->prepare("UPDATE reembolsos SET status = 'pago', data_resposta = COALESCE(data_resposta, NOW()) WHERE id = ?")->execute([$reembolsoId]);
        return ['ok' => true, 'message' => 'Esse pagamento já estava estornado.'];
    }
    if (!in_array($pag['status'], ['aprovado', 'liberado'], true) || empty($pag['mp_payment_id'])) {
        return ['ok' => false, 'message' => 'Esse pagamento não tem um pagamento aprovado no Mercado Pago para estornar.'];
    }
    if (!mp_configurado()) {
        return ['ok' => false, 'message' => 'Mercado Pago não configurado no servidor.'];
    }
    $total   = (float) $pag['valor_total'];
    $devolve = ($valorParcial !== null && $valorParcial > 0 && $valorParcial < $total - 0.01)
        ? round($valorParcial, 2)
        : $total;
    $parcial = $devolve < $total - 0.01;

    $r = mp_request('POST', '/v1/payments/' . $pag['mp_payment_id'] . '/refunds',
        $parcial ? ['amount' => $devolve] : null,
        'reembolso-' . $reembolsoId . ($parcial ? '-p' : ''));
    $corpo = $r['body'] ?? [];
    $okMp = in_array($r['status'], [200, 201], true) && in_array((string) ($corpo['status'] ?? ''), ['approved', 'in_process', 'pending'], true);
    if (!$okMp) {
        $msg = (string) ($corpo['message'] ?? ('HTTP ' . $r['status']));
        error_log('mp_reembolsar: falha no pagamento ' . $pag['mp_payment_id'] . ': ' . $msg);
        return ['ok' => false, 'message' => 'O Mercado Pago não aceitou o estorno agora (' . mb_substr($msg, 0, 120) . ').'];
    }
    $refundId = isset($corpo['id']) ? mb_substr((string) $corpo['id'], 0, 40) : null;
    $pdo->prepare("UPDATE pagamentos SET status = 'reembolsado', mp_status_detail = ? WHERE id = ?")
        ->execute([$parcial ? 'refunded_parcial' : 'refunded', $pagamentoId]);
    $pdo->prepare("UPDATE reembolsos SET status = 'pago', valor_reembolso = ?, mp_refund_id = ?, justificativa = ?, data_resposta = NOW() WHERE id = ?")
        ->execute([$devolve, $refundId, mb_substr($justificativa, 0, 1000), $reembolsoId]);
    $pdo->prepare("UPDATE consultas SET status = 'cancelada_por_nao_ocorrencia' WHERE id = ? AND status NOT IN ('realizada','cancelada_por_nao_ocorrencia')")
        ->execute([(int) $pag['consulta_id']]);
    if (function_exists('provence_log')) {
        provence_log($pdo, 'mp_reembolso', 'pagamento ' . $pagamentoId . ' reembolso ' . $reembolsoId . ' valor ' . $devolve . ($parcial ? ' (parcial de ' . $total . ')' : '') . ' mp_refund ' . $refundId);
    }
    $quanto = $parcial
        ? 'Estorno de R$ ' . number_format($devolve, 2, ',', '.') . ' feito (retenção de R$ ' . number_format($total - $devolve, 2, ',', '.') . ' conforme o contrato).'
        : 'Estorno feito.';
    return ['ok' => true, 'valor' => $devolve, 'message' => $quanto . ' O valor volta pelo mesmo meio de pagamento (Pix em minutos; cartão em até 2 faturas).'];
}

/**
 * Expira uma preferência já paga para o link de checkout não aceitar um segundo pagamento
 * (melhor esforço: se o MP recusar, o pagamento duplicado ainda é estornado ao chegar).
 */
function mp_fechar_preferencia(string $preferenceId): void
{
    if ($preferenceId === '' || !mp_configurado()) {
        return;
    }
    $agora = date('Y-m-d\TH:i:s') . substr_replace(date('O'), ':', 3, 0);
    $r = mp_request('PUT', '/checkout/preferences/' . rawurlencode($preferenceId), ['expires' => true, 'expiration_date_to' => $agora]);
    if ($r['status'] !== 200) {
        error_log('mercadopago: não foi possível expirar a preferência ' . $preferenceId . ' (HTTP ' . $r['status'] . ')');
    }
}
