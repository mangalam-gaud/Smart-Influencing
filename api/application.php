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
    case 'apply':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        applyCampaign($conn, $data);
        break;
    case 'get_applications':
        getApplications($conn, $data);
        break;
    case 'update_status':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        updateApplicationStatus($conn, $data);
        break;
    case 'get_influencer_applications':
        getInfluencerApplications($conn);
        break;
    default:
        sendResponse(false, 'Invalid action', null, 400);
}

function applyCampaign($conn, $data) {
    $payload = requireAuth();
    
    if ($payload['user_type'] !== 'influencer') {
        sendResponse(false, 'Only influencers can apply to campaigns', null, 403);
    }
    
    if (!isset($data['campaign_id'])) {
        sendResponse(false, 'Campaign ID required', null, 400);
    }
    
    $campaign_id = intval($data['campaign_id']);
    $influencer_id = $payload['user_id'];
    
    // Check if campaign exists
    $campaign_check = $conn->prepare("SELECT id FROM campaigns WHERE id = ?");
    $campaign_check->bind_param('i', $campaign_id);
    $campaign_check->execute();
    $campaignCheck = $campaign_check->get_result();
    $campaign_check->close();
    
    if ($campaignCheck->num_rows === 0) {
        sendResponse(false, 'Campaign not found', null, 404);
    }
    
    // Check if already applied (prepared statement)
    $existing_check = $conn->prepare("SELECT id FROM campaign_applications WHERE campaign_id = ? AND influencer_id = ?");
    $existing_check->bind_param('ii', $campaign_id, $influencer_id);
    $existing_check->execute();
    $existingApp = $existing_check->get_result();
    $existing_check->close();
    
    if ($existingApp->num_rows > 0) {
        sendResponse(false, 'You have already applied to this campaign', null, 400);
    }
    
    // Insert application (prepared statement)
    $stmt = $conn->prepare("INSERT INTO campaign_applications (campaign_id, influencer_id, status) VALUES (?, ?, 'waiting')");
    $stmt->bind_param('ii', $campaign_id, $influencer_id);
    
    if ($stmt->execute()) {
        $application_id = $conn->insert_id;
        $stmt->close();
        sendResponse(true, 'Application submitted successfully', ['application_id' => $application_id]);
    } else {
        $stmt->close();
        sendResponse(false, 'Application failed: ' . $conn->error, null, 500);
    }
}

function getApplications($conn, $data) {
    $payload = requireAuth();
    
    if ($payload['user_type'] !== 'brand') {
        sendResponse(false, 'Only brands can view applications', null, 403);
    }
    
    if (!isset($data['campaign_id'])) {
        sendResponse(false, 'Campaign ID required', null, 400);
    }
    
    $campaign_id = intval($data['campaign_id']);
    $brand_id = $payload['user_id'];
    
    // Verify brand owns the campaign
    $campaign_check = $conn->prepare("SELECT id FROM campaigns WHERE id = ? AND brand_id = ?");
    $campaign_check->bind_param('ii', $campaign_id, $brand_id);
    $campaign_check->execute();
    $campaignCheck = $campaign_check->get_result();
    $campaign_check->close();
    
    if ($campaignCheck->num_rows === 0) {
        sendResponse(false, 'Campaign not found or unauthorized', null, 404);
    }
    
    $stmt = $conn->prepare("
        SELECT ca.id, ca.status, ca.applied_at, 
               i.id as influencer_id, i.name, i.photo_url, i.about, i.hourly_rate, i.rating
        FROM campaign_applications ca
        JOIN influencers i ON ca.influencer_id = i.id
        WHERE ca.campaign_id = ?
        ORDER BY ca.applied_at DESC
    ");
    $stmt->bind_param('i', $campaign_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $applications = [];
    while ($row = $result->fetch_assoc()) {
        $applications[] = $row;
    }
    $stmt->close();
    
    sendResponse(true, 'Applications retrieved', $applications);
}

function updateApplicationStatus($conn, $data) {
    $payload = requireAuth();
    
    if ($payload['user_type'] !== 'brand') {
        sendResponse(false, 'Only brands can update applications', null, 403);
    }
    
    if (!isset($data['application_id']) || !isset($data['status'])) {
        sendResponse(false, 'Application ID and status required', null, 400);
    }
    
    $application_id = intval($data['application_id']);
    $status = $data['status'];
    $brand_id = $payload['user_id'];
    
    // Verify brand owns the campaign
    $check = $conn->prepare("
        SELECT ca.id FROM campaign_applications ca
        JOIN campaigns c ON ca.campaign_id = c.id
        WHERE ca.id = ? AND c.brand_id = ?
    ");
    $check->bind_param('ii', $application_id, $brand_id);
    $check->execute();
    $checkResult = $check->get_result();
    $check->close();
    
    if ($checkResult->num_rows === 0) {
        sendResponse(false, 'Application not found or unauthorized', null, 404);
    }
    
    if (!in_array($status, ['waiting', 'accepted', 'rejected'])) {
        sendResponse(false, 'Invalid status', null, 400);
    }
    
    $stmt = $conn->prepare("UPDATE campaign_applications SET status = ? WHERE id = ?");
    $stmt->bind_param('si', $status, $application_id);
    
    if ($stmt->execute()) {
        $stmt->close();
        sendResponse(true, 'Application status updated');
    } else {
        $stmt->close();
        sendResponse(false, 'Update failed: ' . $conn->error, null, 500);
    }
}

function getInfluencerApplications($conn) {
    $payload = requireAuth();
    
    if ($payload['user_type'] !== 'influencer') {
        sendResponse(false, 'Only influencers can view their applications', null, 403);
    }
    
    $influencer_id = $payload['user_id'];
    
    $result = $conn->query("
        SELECT ca.id, ca.status, ca.applied_at,
               c.id as campaign_id, c.field, c.payout, c.overview, c.work_details,
               b.id as brand_id, b.brand_name, b.logo_url, b.about
        FROM campaign_applications ca
        JOIN campaigns c ON ca.campaign_id = c.id
        JOIN brands b ON c.brand_id = b.id
        WHERE ca.influencer_id = $influencer_id
        ORDER BY ca.applied_at DESC
    ");
    
    $applications = [];
    while ($row = $result->fetch_assoc()) {
        $applications[] = $row;
    }
    
    sendResponse(true, 'Your applications retrieved', $applications);
}
?>
