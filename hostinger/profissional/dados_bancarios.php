<?php
/**
 * Provence — Dados bancários do profissional (item 3).
 *  GET  -> retorna os dados bancários do profissional logado
 *  POST -> salva os dados bancários
 *
 * Requer a migração hostinger/sql/02-dados-bancarios.sql aplicada.
 * Deploy: public_html/profissional/dados_bancarios.php (arquivo novo).
 */

require_once __DIR__ . '/../config/db.php'; // $pdo + CORS + headers + OPTIONS

session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado']);
    exit;
}
if (($_SESSION['user_type'] ?? '') !== 'profissional') {
    echo json_encode(['success' => false, 'message' => 'Acesso negado']);
    exit;
}

$uid = (int) $_SESSION['user_id'];
$tiposConta = ['corrente', 'poupanca'];
$tiposPix   = ['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'];

try {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
        $stmt = $pdo->prepare(
            "SELECT banco, agencia, conta, tipo_conta, chave_pix, tipo_pix FROM profissionais WHERE id = ?"
        );
        $stmt->execute([$uid]);
        $d = $stmt->fetch() ?: [];
        echo json_encode([
            'success' => true,
            'data' => [
                'banco'      => $d['banco'] ?? '',
                'agencia'    => $d['agencia'] ?? '',
                'conta'      => $d['conta'] ?? '',
                'tipo_conta' => $d['tipo_conta'] ?? '',
                'chave_pix'  => $d['chave_pix'] ?? '',
                'tipo_pix'   => $d['tipo_pix'] ?? '',
            ],
        ]);
        exit;
    }

    // POST — salvar
    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body)) {
        $body = $_POST;
    }

    $banco      = trim((string) ($body['banco'] ?? ''));
    $agencia    = trim((string) ($body['agencia'] ?? ''));
    $conta      = trim((string) ($body['conta'] ?? ''));
    $tipo_conta = (string) ($body['tipo_conta'] ?? '');
    $chave_pix  = trim((string) ($body['chave_pix'] ?? ''));
    $tipo_pix   = (string) ($body['tipo_pix'] ?? '');

    $erros = [];
    if ($tipo_conta !== '' && !in_array($tipo_conta, $tiposConta, true)) {
        $erros['tipo_conta'] = 'Tipo de conta inválido.';
    }
    if ($tipo_pix !== '' && !in_array($tipo_pix, $tiposPix, true)) {
        $erros['tipo_pix'] = 'Tipo de chave Pix inválido.';
    }
    // Pix: se preencheu um, precisa do outro
    if ($chave_pix !== '' && $tipo_pix === '') {
        $erros['tipo_pix'] = 'Escolha o tipo da chave Pix.';
    }
    if ($tipo_pix !== '' && $chave_pix === '') {
        $erros['chave_pix'] = 'Informe a chave Pix.';
    }
    if (!empty($erros)) {
        echo json_encode(['success' => false, 'message' => 'Dados inválidos.', 'erros' => $erros]);
        exit;
    }

    $stmt = $pdo->prepare(
        "UPDATE profissionais
         SET banco = ?, agencia = ?, conta = ?, tipo_conta = ?, chave_pix = ?, tipo_pix = ?
         WHERE id = ?"
    );
    $stmt->execute([
        $banco !== '' ? $banco : null,
        $agencia !== '' ? $agencia : null,
        $conta !== '' ? $conta : null,
        $tipo_conta !== '' ? $tipo_conta : null,
        $chave_pix !== '' ? $chave_pix : null,
        $tipo_pix !== '' ? $tipo_pix : null,
        $uid,
    ]);

    echo json_encode(['success' => true, 'message' => 'Dados bancários salvos com sucesso.']);
} catch (Exception $e) {
    error_log('dados_bancarios: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
