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
    case 'create':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        createCampaign($conn, $data);
        break;
    case 'get_all':
        getAllCampaigns($conn, $data);
        break;
    case 'get_by_id':
        getCampaignById($conn, isset($data['id']) ? $data['id'] : null);
        break;
    case 'get_brand_campaigns':
        getBrandCampaigns($conn);
        break;
    case 'update':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        updateCampaign($conn, $data);
        break;
    case 'delete':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        deleteCampaign($conn, isset($data['id']) ? $data['id'] : null);
        break;
    default:
        sendResponse(false, 'Invalid action', null, 400);
}

function createCampaign($conn, $data) {
    $payload = requireAuth();
    
    if ($payload['user_type'] !== 'brand') {
        sendResponse(false, 'Only brands can create campaigns', null, 403);
    }
    
    if (!isset($data['field']) || !isset($data['payout']) || !isset($data['work_details'])) {
        sendResponse(false, 'Missing required fields', null, 400);
    }
    
    $brand_id = $payload['user_id'];
    $field = $data['field'];
    $duration = $data['duration'] ?? '';
    $payout = floatval($data['payout']);
    $work_details = $data['work_details'];
    $overview = $data['overview'] ?? '';
    
    // Insert campaign (prepared statement)
    $stmt = $conn->prepare("INSERT INTO campaigns (brand_id, field, duration, payout, work_details, overview, status) VALUES (?, ?, ?, ?, ?, ?, 'active')");
    $stmt->bind_param('issdsss', $brand_id, $field, $duration, $payout, $work_details, $overview);
    
    if ($stmt->execute()) {
        $campaignId = $conn->insert_id;
        $stmt->close();
        sendResponse(true, 'Campaign created successfully', ['id' => $campaignId]);
    } else {
        $stmt->close();
        sendResponse(false, 'Failed to create campaign: ' . $conn->error, null, 500);
    }
}

function getAllCampaigns($conn, $data) {
    $limit = isset($data['limit']) ? intval($data['limit']) : 50;
    $offset = isset($data['offset']) ? intval($data['offset']) : 0;
    $status = isset($data['status']) ? $data['status'] : 'active';
    
    // Use prepared statement to avoid SQL injection
    $stmt = $conn->prepare("
        SELECT c.id, c.brand_id, c.field, c.duration, c.payout, c.work_details, c.overview, c.status, c.created_at,
               b.brand_name, b.logo_url
        FROM campaigns c
        JOIN brands b ON c.brand_id = b.id
        WHERE c.status = ?
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->bind_param('sii', $status, $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $campaigns = [];
    while ($row = $result->fetch_assoc()) {
        $campaigns[] = $row;
    }
    $stmt->close();
    
    sendResponse(true, 'Campaigns retrieved', $campaigns);
}

function getCampaignById($conn, $id) {
    if (!$id) {
        sendResponse(false, 'Campaign ID required', null, 400);
    }
    
    $id = intval($id);
    
    $stmt = $conn->prepare("
        SELECT c.*, b.brand_name, b.logo_url, b.about, b.contact
        FROM campaigns c
        JOIN brands b ON c.brand_id = b.id
        WHERE c.id = ?
    ");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        sendResponse(false, 'Campaign not found', null, 404);
    }
    
    $campaign = $result->fetch_assoc();
    $stmt->close();
    sendResponse(true, 'Campaign retrieved', $campaign);
}

function getBrandCampaigns($conn) {
    $payload = requireAuth();
    
    if ($payload['user_type'] !== 'brand') {
        sendResponse(false, 'Only brands can view their campaigns', null, 403);
    }
    
    $brand_id = $payload['user_id'];
    
    $stmt = $conn->prepare("
        SELECT id, field, duration, payout, work_details, overview, status, created_at
        FROM campaigns
        WHERE brand_id = ?
        ORDER BY created_at DESC
    ");
    $stmt->bind_param('i', $brand_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $campaigns = [];
    while ($row = $result->fetch_assoc()) {
        $campaigns[] = $row;
    }
    $stmt->close();
    
    sendResponse(true, 'Brand campaigns retrieved', $campaigns);
}

function updateCampaign($conn, $data) {
    $payload = requireAuth();
    
    if ($payload['user_type'] !== 'brand') {
        sendResponse(false, 'Only brands can update campaigns', null, 403);
    }
    
    if (!isset($data['id'])) {
        sendResponse(false, 'Campaign ID required', null, 400);
    }
    
    $campaign_id = intval($data['id']);
    $brand_id = $payload['user_id'];
    
    // Verify brand owns the campaign
    $check_stmt = $conn->prepare("SELECT id FROM campaigns WHERE id = ? AND brand_id = ?");
    $check_stmt->bind_param('ii', $campaign_id, $brand_id);
    $check_stmt->execute();
    $check = $check_stmt->get_result();
    $check_stmt->close();
    
    if ($check->num_rows === 0) {
        sendResponse(false, 'Campaign not found or unauthorized', null, 404);
    }
    
    $allowed_fields = ['field', 'duration', 'payout', 'work_details', 'overview', 'status'];
    $update_fields = [];
    $params = [];
    $types = '';
    
    foreach ($allowed_fields as $field) {
        if (isset($data[$field])) {
            $update_fields[] = "$field = ?";
            $params[] = $data[$field];
            // payout is decimal/double, others are strings
            $types .= ($field === 'payout') ? 'd' : 's';
        }
    }
    
    if (empty($update_fields)) {
        sendResponse(false, 'No fields to update', null, 400);
    }
    
    // Add campaign_id for WHERE clause
    $params[] = $campaign_id;
    $types .= 'i';
    
    $sql = "UPDATE campaigns SET " . implode(', ', $update_fields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        $stmt->close();
        sendResponse(true, 'Campaign updated successfully');
    } else {
        $stmt->close();
        sendResponse(false, 'Update failed: ' . $conn->error, null, 500);
    }
}

function deleteCampaign($conn, $id) {
    if (!$id) {
        sendResponse(false, 'Campaign ID required', null, 400);
    }
    
    $payload = requireAuth();
    
    if ($payload['user_type'] !== 'brand') {
        sendResponse(false, 'Only brands can delete campaigns', null, 403);
    }
    
    $campaign_id = intval($id);
    $brand_id = $payload['user_id'];
    
    // Verify brand owns the campaign
    $check_stmt = $conn->prepare("SELECT id FROM campaigns WHERE id = ? AND brand_id = ?");
    $check_stmt->bind_param('ii', $campaign_id, $brand_id);
    $check_stmt->execute();
    $check = $check_stmt->get_result();
    $check_stmt->close();
    
    if ($check->num_rows === 0) {
        sendResponse(false, 'Campaign not found or unauthorized', null, 404);
    }
    
    $delete_stmt = $conn->prepare("DELETE FROM campaigns WHERE id = ?");
    $delete_stmt->bind_param('i', $campaign_id);
    
    if ($delete_stmt->execute()) {
        $delete_stmt->close();
        sendResponse(true, 'Campaign deleted successfully');
    } else {
        $delete_stmt->close();
        sendResponse(false, 'Delete failed: ' . $conn->error, null, 500);
    }
}
?>
