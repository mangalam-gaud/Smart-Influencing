<?php
require_once '../config.php';

// Support both GET and POST
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Get data based on request method
if ($method === 'POST') {
    $data = getRequestData();
} elseif ($method === 'GET') {
    $data = $_GET;
} else {
    sendResponse(false, 'Method not allowed', null, 405);
}

// Route action to appropriate handler
switch ($action) {
    case 'process_payment':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        processPayment($conn, $data);
        break;
    case 'get_transaction_history':
        getTransactionHistory($conn);
        break;
    case 'get_wallet':
        getWallet($conn);
        break;
    case 'update_bank_details':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        updateBankDetails($conn, $data);
        break;
    default:
        sendResponse(false, 'Invalid action', null, 400);
}

function processPayment($conn, $data) {
    $payload = requireAuth();
    
    if (!isset($data['application_id']) || !isset($data['amount'])) {
        sendResponse(false, 'Application ID and amount required', null, 400);
    }
    
    $application_id = intval($data['application_id']);
    $amount = floatval($data['amount']);
    
    if ($amount <= 0) {
        sendResponse(false, 'Invalid amount', null, 400);
    }
    
    // Get application details
    $appQuery = $conn->query("
        SELECT ca.influencer_id, ca.campaign_id, c.payout, b.id as brand_id
        FROM campaign_applications ca
        JOIN campaigns c ON ca.campaign_id = c.id
        JOIN brands b ON c.brand_id = b.id
        WHERE ca.id = $application_id AND ca.status = 'accepted'
    ");
    
    if ($appQuery->num_rows === 0) {
        sendResponse(false, 'Application not found or not accepted', null, 404);
    }
    
    $application = $appQuery->fetch_assoc();
    $influencer_id = $application['influencer_id'];
    $brand_id = $application['brand_id'];
    
    // Check if payer is brand
    if ($payload['user_id'] !== $brand_id || $payload['user_type'] !== 'brand') {
        sendResponse(false, 'Only the brand can process payment', null, 403);
    }
    
    // Create transaction
    $transactionSql = "INSERT INTO transactions (application_id, amount, status, payer_type, payer_id, payee_id) 
                       VALUES ($application_id, $amount, 'completed', 'brand', $brand_id, $influencer_id)";
    
    if ($conn->query($transactionSql)) {
        // Update influencer wallet
        $walletQuery = $conn->query("SELECT id FROM influencer_wallets WHERE influencer_id = $influencer_id");
        
        if ($walletQuery->num_rows > 0) {
            $conn->query("UPDATE influencer_wallets SET total_earnings = total_earnings + $amount WHERE influencer_id = $influencer_id");
        } else {
            $conn->query("INSERT INTO influencer_wallets (influencer_id, total_earnings) VALUES ($influencer_id, $amount)");
        }
        
        sendResponse(true, 'Payment processed successfully', [
            'transaction_id' => $conn->insert_id,
            'amount' => $amount,
            'influencer_id' => $influencer_id
        ]);
    } else {
        sendResponse(false, 'Payment processing failed: ' . $conn->error, null, 500);
    }
}

function getTransactionHistory($conn) {
    $payload = requireAuth();
    $user_id = $payload['user_id'];
    $user_type = $payload['user_type'];
    
    if ($user_type === 'influencer') {
        $result = $conn->query("
            SELECT t.id, t.amount, t.status, t.created_at,
                   c.field, c.payout,
                   b.brand_name, b.logo_url
            FROM transactions t
            JOIN campaign_applications ca ON t.application_id = ca.id
            JOIN campaigns c ON ca.campaign_id = c.id
            JOIN brands b ON c.brand_id = b.id
            WHERE ca.influencer_id = $user_id
            ORDER BY t.created_at DESC
        ");
    } else {
        // Brand
        $result = $conn->query("
            SELECT t.id, t.amount, t.status, t.created_at,
                   c.field,
                   i.name, i.photo_url
            FROM transactions t
            JOIN campaign_applications ca ON t.application_id = ca.id
            JOIN campaigns c ON ca.campaign_id = c.id
            JOIN influencers i ON ca.influencer_id = i.id
            WHERE c.brand_id = $user_id
            ORDER BY t.created_at DESC
        ");
    }
    
    $transactions = [];
    while ($row = $result->fetch_assoc()) {
        $transactions[] = $row;
    }
    
    sendResponse(true, 'Transaction history retrieved', $transactions);
}

function getWallet($conn) {
    $payload = requireAuth();
    
    if ($payload['user_type'] !== 'influencer') {
        sendResponse(false, 'Only influencers have wallets', null, 403);
    }
    
    $influencer_id = $payload['user_id'];
    
    $result = $conn->query("
        SELECT id, total_earnings, account_number, ifsc_code
        FROM influencer_wallets
        WHERE influencer_id = $influencer_id
    ");
    
    if ($result->num_rows === 0) {
        // Create default wallet
        $conn->query("INSERT INTO influencer_wallets (influencer_id, total_earnings) VALUES ($influencer_id, 0)");
        $wallet = ['id' => $conn->insert_id, 'total_earnings' => 0, 'account_number' => null, 'ifsc_code' => null];
    } else {
        $wallet = $result->fetch_assoc();
    }
    
    sendResponse(true, 'Wallet retrieved', $wallet);
}

function updateBankDetails($conn, $data) {
    $payload = requireAuth();
    
    if ($payload['user_type'] !== 'influencer') {
        sendResponse(false, 'Only influencers can update bank details', null, 403);
    }
    
    if (!isset($data['account_number']) || !isset($data['ifsc_code'])) {
        sendResponse(false, 'Account number and IFSC code required', null, 400);
    }
    
    $influencer_id = $payload['user_id'];
    $account_number = $conn->real_escape_string($data['account_number']);
    $ifsc_code = $conn->real_escape_string($data['ifsc_code']);
    
    // Check if wallet exists
    $walletCheck = $conn->query("SELECT id FROM influencer_wallets WHERE influencer_id = $influencer_id");
    
    if ($walletCheck->num_rows > 0) {
        $sql = "UPDATE influencer_wallets SET account_number = '$account_number', ifsc_code = '$ifsc_code' WHERE influencer_id = $influencer_id";
    } else {
        $sql = "INSERT INTO influencer_wallets (influencer_id, account_number, ifsc_code) VALUES ($influencer_id, '$account_number', '$ifsc_code')";
    }
    
    if ($conn->query($sql)) {
        sendResponse(true, 'Bank details updated successfully');
    } else {
        sendResponse(false, 'Update failed: ' . $conn->error, null, 500);
    }
}
?>
