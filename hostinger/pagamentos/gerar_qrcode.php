<?php
/**
 * Provence — QR Code Pix SIMULADO (ambiente de teste). Etapa 3: passa a exigir
 * sessão de paciente. A integração real entra na Etapa 2 (Mercado Pago).
 * Deploy: substitui public_html/pagamentos/gerar_qrcode.php
 */

require_once __DIR__ . '/../config/db.php';

session_start();

if (!isset($_SESSION['user_id']) || ($_SESSION['user_type'] ?? '') !== 'paciente') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Usuário não autenticado']);
    exit;
}


$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data || !isset($data['valor']) || !isset($data['descricao'])) {
    echo json_encode(['success' => false, 'message' => 'valor e descricao são obrigatórios']);
    exit;
}

try {
    // Simular geração de QR Code PIX
    $qr_code_data = [
        'qr_code' => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'pix_key' => '00020126580014BR.GOV.BCB.PIX0136' . uniqid(),
        'valor' => $data['valor'],
        'descricao' => $data['descricao'],
        'expires_at' => date('Y-m-d H:i:s', strtotime('+30 minutes'))
    ];

    echo json_encode([
        'success' => true,
        'message' => 'QR Code gerado com sucesso',
        'data' => $qr_code_data
    ]);

} catch (Exception $e) {
    error_log("Erro ao gerar QR Code: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
?>
