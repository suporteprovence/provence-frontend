<?php
/**
 * Provence — Migração única: cifra as mensagens de chat antigas (Etapa 3).
 *
 * Depois que CHAT_KEY entra no .env, as mensagens novas já nascem cifradas
 * (chat/enviar.php). Este script pega as que ainda estão em claro no banco e
 * cifra com a mesma chave. Pode rodar mais de uma vez: só toca linhas sem o
 * prefixo "enc:v1:".
 *
 * Como rodar (uma das duas formas):
 *   1) Terminal SSH da Hostinger, na pasta public_html:
 *        php admin/cifrar_mensagens_legado.php
 *   2) Pelo navegador/curl, com o token definido no .env (MIGRACAO_TOKEN):
 *        curl -X POST https://provence.host/admin/cifrar_mensagens_legado.php \
 *             -H "Content-Type: application/json" -d '{"token":"<MIGRACAO_TOKEN>"}'
 *      Depois de migrar, apague a linha MIGRACAO_TOKEN do .env.
 *
 * Deploy: public_html/admin/cifrar_mensagens_legado.php (arquivo novo).
 */

$cli = (PHP_SAPI === 'cli');

if ($cli) {
    // Sem servidor web não há CORS/sessão; só precisamos do $pdo e do .env
    $_SERVER['REQUEST_METHOD'] = 'GET';
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/seguranca.php';

if (!$cli) {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        provence_responder(405, ['success' => false, 'message' => 'Método não permitido.']);
    }
    $esperado = '';
    if (isset($_ENV['MIGRACAO_TOKEN'])) {
        $esperado = (string) $_ENV['MIGRACAO_TOKEN'];
    } elseif (getenv('MIGRACAO_TOKEN') !== false) {
        $esperado = (string) getenv('MIGRACAO_TOKEN');
    }
    $b = provence_corpo_json();
    $recebido = is_array($b) ? (string) ($b['token'] ?? '') : '';
    if (strlen($esperado) < 20 || $recebido === '' || !hash_equals($esperado, $recebido)) {
        provence_responder(403, ['success' => false, 'message' => 'Acesso negado.']);
    }
}

if (provence_chave_chat() === null) {
    $msg = 'CHAT_KEY ausente ou inválida no .env. Gere com: openssl rand -base64 32';
    if ($cli) {
        fwrite(STDERR, $msg . "\n");
        exit(1);
    }
    provence_responder(500, ['success' => false, 'message' => $msg]);
}

$cifradas = 0;
$falhas   = 0;

try {
    $sel = $pdo->prepare("SELECT id, mensagem FROM mensagens WHERE mensagem NOT LIKE 'enc:v1:%' ORDER BY id LIMIT 500");
    $upd = $pdo->prepare('UPDATE mensagens SET mensagem = ? WHERE id = ? AND mensagem NOT LIKE \'enc:v1:%\'');

    do {
        $sel->execute();
        $lote = $sel->fetchAll();
        foreach ($lote as $linha) {
            $c = provence_cifrar((string) $linha['mensagem']);
            if ($c === null) {
                $falhas++;
                continue;
            }
            $upd->execute([$c, (int) $linha['id']]);
            $cifradas++;
        }
        // Se nada foi cifrado no lote (só falhas), pára para não entrar em loop.
    } while (count($lote) === 500 && $falhas === 0);

    $st = $pdo->query("SELECT COUNT(*) FROM mensagens WHERE mensagem NOT LIKE 'enc:v1:%'");
    $restantes = (int) $st->fetchColumn();

    provence_log($pdo, 'chat_migracao_cifra', "cifradas={$cifradas} falhas={$falhas} restantes={$restantes}");

    $out = ['success' => $falhas === 0, 'cifradas' => $cifradas, 'falhas' => $falhas, 'restantes_em_claro' => $restantes];
    if ($cli) {
        echo json_encode($out) . "\n";
        exit($falhas === 0 ? 0 : 1);
    }
    provence_responder(200, $out);
} catch (PDOException $e) {
    error_log('cifrar_mensagens_legado: ' . $e->getMessage());
    if ($cli) {
        fwrite(STDERR, "Erro no banco\n");
        exit(1);
    }
    provence_responder(500, ['success' => false, 'message' => 'Erro no banco']);
}
