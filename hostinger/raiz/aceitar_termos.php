<?php
/**
 * Provence — Aceite dos termos (Etapa 3: corrigido).
 *
 * A versão anterior aceitava `usuario_id` no corpo (marcava o aceite de QUALQUER
 * conta) e devolvia a mensagem de erro do banco ao cliente. Agora o id vem da
 * sessão (login ou sessão de cadastro do register.php) e erros são genéricos.
 *
 * Deploy: substitui public_html/aceitar_termos.php (raiz)
 */

require_once __DIR__ . '/config/db.php';

session_start();

function logError($message, $data = null) {
    $logMessage = date('Y-m-d H:i:s') . " - ACEITAR_TERMOS - " . $message;
    if ($data) {
        $logMessage .= " - Data: " . json_encode($data);
    }
    error_log($logMessage);
}

// Verificar se é POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

// Obter dados JSON
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    logError("Erro ao decodificar JSON", $input);
    echo json_encode(['success' => false, 'message' => 'Dados JSON inválidos']);
    exit;
}

// Etapa 3: o id vem da SESSÃO, nunca do corpo da requisição.
$usuario_id = 0;
if (isset($_SESSION['user_id']) && empty($_SESSION['is_admin'])) {
    $usuario_id = (int) $_SESSION['user_id'];
} elseif (isset($_SESSION['onboarding_user_id'])) {
    $usuario_id = (int) $_SESSION['onboarding_user_id'];
}
if ($usuario_id <= 0) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Sessão não encontrada. Faça login ou refaça o cadastro.']);
    exit;
}

try {
    // Verificar se o usuário existe
    $stmt = $pdo->prepare("SELECT id, nome, email, tipo FROM usuarios WHERE id = ?");
    $stmt->execute([$usuario_id]);
    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$usuario) {
        echo json_encode(['success' => false, 'message' => 'Usuário não encontrado']);
        exit;
    }
    
    logError("Processando aceite de termos", [
        'usuario_id' => $usuario_id, 
        'nome' => $usuario['nome'],
        'tipo' => $usuario['tipo']
    ]);
    
    // Verificar se a coluna aceita_termos existe
    $stmt = $pdo->prepare("SHOW COLUMNS FROM usuarios LIKE 'aceita_termos'");
    $stmt->execute();
    $colunaExiste = $stmt->fetch();
    
    if ($colunaExiste) {
        // Se a coluna existe, verificar se já aceitou
        $stmt = $pdo->prepare("SELECT aceita_termos FROM usuarios WHERE id = ?");
        $stmt->execute([$usuario_id]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result && $result['aceita_termos']) {
            unset($_SESSION['onboarding_user_id']);
            echo json_encode([
                'success' => true, 
                'message' => 'Termos já foram aceitos anteriormente',
                'data' => [
                    'usuario_id' => $usuario_id,
                    'ja_aceito' => true
                ]
            ]);
            exit;
        }
        
        // Atualizar aceite dos termos
        $stmt = $pdo->prepare("
            UPDATE usuarios 
            SET aceita_termos = 1, 
                data_aceite_termos = NOW()
            WHERE id = ?
        ");
        
        $result = $stmt->execute([$usuario_id]);
        
        if (!$result) {
            $errorInfo = $stmt->errorInfo();
            logError("Erro ao executar query de aceite", $errorInfo);
            echo json_encode(['success' => false, 'message' => 'Erro ao salvar aceite dos termos']);
            exit;
        }
        
        logError("Termos aceitos com sucesso (com campo)", [
            'usuario_id' => $usuario_id,
            'nome' => $usuario['nome']
        ]);
        
    } else {
        // Se a coluna não existe, apenas simular o aceite
        logError("Campo aceita_termos não existe, simulando aceite", [
            'usuario_id' => $usuario_id,
            'nome' => $usuario['nome']
        ]);
    }
    
    unset($_SESSION['onboarding_user_id']);

    echo json_encode([
        'success' => true, 
        'message' => 'Termos aceitos com sucesso',
        'data' => [
            'usuario_id' => $usuario_id,
            'nome' => $usuario['nome'],
            'tipo' => $usuario['tipo'],
            'data_aceite' => date('Y-m-d H:i:s'),
            'campo_existe' => $colunaExiste ? true : false
        ]
    ]);
    
} catch (PDOException $e) {
    logError("Erro PDO ao aceitar termos", [
        'message' => $e->getMessage(),
        'code' => $e->getCode(),
        'usuario_id' => $usuario_id ?? 'N/A'
    ]);
    echo json_encode(['success' => false, 'message' => 'Erro de banco de dados']);
} catch (Exception $e) {
    logError("Erro geral ao aceitar termos", [
        'message' => $e->getMessage(),
        'usuario_id' => $usuario_id ?? 'N/A'
    ]);
    echo json_encode(['success' => false, 'message' => 'Erro interno do servidor']);
}
?>
