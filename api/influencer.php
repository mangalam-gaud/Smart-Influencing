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
    case 'register':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        registerInfluencer($conn, $data);
        break;
    case 'login':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        loginInfluencer($conn, $data);
        break;
    case 'profile':
        getInfluencerProfile($conn);
        break;
    case 'update_profile':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        updateInfluencerProfile($conn, $data);
        break;
    case 'get_all':
        getAllInfluencers($conn);
        break;
    case 'get_by_id':
        getInfluencerById($conn, isset($data['id']) ? $data['id'] : null);
        break;
    default:
        sendResponse(false, 'Invalid action', null, 400);
}

function registerInfluencer($conn, $data) {
    if (!isset($data['email']) || !isset($data['password']) || !isset($data['name'])) {
        sendResponse(false, 'Missing required fields', null, 400);
    }
    
    $email = $data['email'];
    $password = hashPassword($data['password']);
    $name = $data['name'];
    
    // Check if email already exists (prepared statement)
    $checkStmt = $conn->prepare("SELECT id FROM influencers WHERE email = ?");
    $checkStmt->bind_param('s', $email);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        sendResponse(false, 'Email already registered', null, 400);
    }
    $checkStmt->close();
    
    // Insert new influencer (prepared statement)
    $stmt = $conn->prepare("INSERT INTO influencers (email, password, name) VALUES (?, ?, ?)");
    $stmt->bind_param('sss', $email, $password, $name);
    
    if ($stmt->execute()) {
        $id = $conn->insert_id;
        $token = generateToken($id, 'influencer');
        sendResponse(true, 'Registration successful', [
            'id' => $id,
            'email' => $email,
            'name' => $name,
            'token' => $token
        ]);
    } else {
        sendResponse(false, 'Registration failed: ' . $conn->error, null, 500);
    }
    $stmt->close();
}

function loginInfluencer($conn, $data) {
    if (!isset($data['email']) || !isset($data['password'])) {
        sendResponse(false, 'Email and password required', null, 400);
    }
    
    $email = $data['email'];
    $password = $data['password'];
    
    // Get influencer by email (prepared statement)
    $stmt = $conn->prepare("SELECT id, email, password, name, photo_url FROM influencers WHERE email = ?");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(false, 'Invalid email or password', null, 401);
    }
    
    $user = $result->fetch_assoc();
    $stmt->close();
    
    if (!verifyPassword($password, $user['password'])) {
        sendResponse(false, 'Invalid email or password', null, 401);
    }
    
    $token = generateToken($user['id'], 'influencer');
    
    sendResponse(true, 'Login successful', [
        'id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['name'],
        'photo_url' => $user['photo_url'],
        'token' => $token
    ]);
}

function getInfluencerProfile($conn) {
    $payload = requireAuth();
    
    $userId = $payload['user_id'];
    $stmt = $conn->prepare("SELECT id, email, name, about, experience, contact, photo_url, instagram, snapchat, youtube, facebook, twitter, hourly_rate, rating FROM influencers WHERE id = ?");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        sendResponse(false, 'Influencer not found', null, 404);
    }
    
    $profile = $result->fetch_assoc();
    $stmt->close();
    sendResponse(true, 'Profile retrieved', $profile);
}

function updateInfluencerProfile($conn, $data) {
    $payload = requireAuth();
    $userId = $payload['user_id'];
    
    $allowed_fields = ['name', 'about', 'experience', 'contact', 'photo_url', 'instagram', 'snapchat', 'youtube', 'facebook', 'twitter', 'hourly_rate'];
    
    // Build dynamic prepared statement
    $update_fields = [];
    $params = [];
    $types = '';
    
    foreach ($allowed_fields as $field) {
        if (isset($data[$field])) {
            $update_fields[] = "$field = ?";
            $params[] = $data[$field];
            // hourly_rate is decimal, others are strings
            $types .= ($field === 'hourly_rate') ? 'd' : 's';
        }
    }
    
    if (empty($update_fields)) {
        sendResponse(false, 'No fields to update', null, 400);
    }
    
    // Add user_id and type for parameter binding
    $params[] = $userId;
    $types .= 'i';
    
    $sql = "UPDATE influencers SET " . implode(', ', $update_fields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ?";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    
    if ($stmt->execute()) {
        $stmt->close();
        sendResponse(true, 'Profile updated successfully');
    } else {
        $stmt->close();
        sendResponse(false, 'Update failed: ' . $conn->error, null, 500);
    }
}

function getAllInfluencers($conn) {
    $stmt = $conn->prepare("SELECT id, name, about, photo_url, instagram, youtube, hourly_rate, rating FROM influencers LIMIT 100");
    $stmt->execute();
    $result = $stmt->get_result();
    
    $influencers = [];
    while ($row = $result->fetch_assoc()) {
        $influencers[] = $row;
    }
    
    $stmt->close();
    sendResponse(true, 'Influencers retrieved', $influencers);
}

function getInfluencerById($conn, $id) {
    if (!$id) {
        sendResponse(false, 'Influencer ID required', null, 400);
    }
    
    $id = intval($id);
    $stmt = $conn->prepare("SELECT id, name, about, experience, contact, photo_url, instagram, snapchat, youtube, facebook, twitter, hourly_rate, rating FROM influencers WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        sendResponse(false, 'Influencer not found', null, 404);
    }
    
    $influencer = $result->fetch_assoc();
    $stmt->close();
    sendResponse(true, 'Influencer retrieved', $influencer);
}
?>
