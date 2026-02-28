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
        registerBrand($conn, $data);
        break;
    case 'login':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        loginBrand($conn, $data);
        break;
    case 'profile':
        getBrandProfile($conn);
        break;
    case 'update_profile':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        updateBrandProfile($conn, $data);
        break;
    case 'get_all':
        getAllBrands($conn);
        break;
    case 'get_by_id':
        getBrandById($conn, isset($data['id']) ? $data['id'] : null);
        break;
    default:
        sendResponse(false, 'Invalid action', null, 400);
}

function registerBrand($conn, $data) {
    if (!isset($data['email']) || !isset($data['password']) || !isset($data['brand_name'])) {
        sendResponse(false, 'Missing required fields', null, 400);
    }
    
    $email = $data['email'];
    $password = hashPassword($data['password']);
    $brand_name = $data['brand_name'];
    
    // Check if email already exists (prepared statement)
    $checkStmt = $conn->prepare("SELECT id FROM brands WHERE email = ?");
    $checkStmt->bind_param('s', $email);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows > 0) {
        sendResponse(false, 'Email already registered', null, 400);
    }
    $checkStmt->close();
    
    // Insert new brand (prepared statement)
    $stmt = $conn->prepare("INSERT INTO brands (email, password, brand_name) VALUES (?, ?, ?)");
    $stmt->bind_param('sss', $email, $password, $brand_name);
    
    if ($stmt->execute()) {
        $id = $conn->insert_id;
        $token = generateToken($id, 'brand');
        sendResponse(true, 'Registration successful', [
            'id' => $id,
            'email' => $email,
            'brand_name' => $brand_name,
            'token' => $token
        ]);
    } else {
        sendResponse(false, 'Registration failed: ' . $conn->error, null, 500);
    }
    $stmt->close();
}

function loginBrand($conn, $data) {
    if (!isset($data['email']) || !isset($data['password'])) {
        sendResponse(false, 'Email and password required', null, 400);
    }
    
    $email = $data['email'];
    $password = $data['password'];
    
    // Get brand by email (prepared statement)
    $stmt = $conn->prepare("SELECT id, email, password, brand_name, logo_url FROM brands WHERE email = ?");
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
    
    $token = generateToken($user['id'], 'brand');
    
    sendResponse(true, 'Login successful', [
        'id' => $user['id'],
        'email' => $user['email'],
        'brand_name' => $user['brand_name'],
        'logo_url' => $user['logo_url'],
        'token' => $token
    ]);
}

function getBrandProfile($conn) {
    $payload = requireAuth();
    
    $userId = $payload['user_id'];
    $stmt = $conn->prepare("SELECT id, email, brand_name, contact, logo_url, instagram, facebook, twitter, about, owner_name, owner_linkedin, owner_instagram, owner_twitter FROM brands WHERE id = ?");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        sendResponse(false, 'Brand not found', null, 404);
    }
    
    $profile = $result->fetch_assoc();
    $stmt->close();
    sendResponse(true, 'Profile retrieved', $profile);
}

function updateBrandProfile($conn, $data) {
    $payload = requireAuth();
    $userId = $payload['user_id'];
    
    $allowed_fields = ['brand_name', 'contact', 'logo_url', 'instagram', 'facebook', 'twitter', 'about', 'owner_name', 'owner_linkedin', 'owner_instagram', 'owner_twitter'];
    
    // Build dynamic prepared statement
    $update_fields = [];
    $params = [];
    $types = '';
    
    foreach ($allowed_fields as $field) {
        if (isset($data[$field])) {
            $update_fields[] = "$field = ?";
            $params[] = $data[$field];
            $types .= 's'; // All are strings
        }
    }
    
    if (empty($update_fields)) {
        sendResponse(false, 'No fields to update', null, 400);
    }
    
    // Add user_id and type for parameter binding
    $params[] = $userId;
    $types .= 'i';
    
    $sql = "UPDATE brands SET " . implode(', ', $update_fields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ?";
    
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

function getAllBrands($conn) {
    $stmt = $conn->prepare("SELECT id, brand_name, about, logo_url, instagram, facebook, contact FROM brands LIMIT 100");
    $stmt->execute();
    $result = $stmt->get_result();
    
    $brands = [];
    while ($row = $result->fetch_assoc()) {
        $brands[] = $row;
    }
    
    $stmt->close();
    sendResponse(true, 'Brands retrieved', $brands);
}

function getBrandById($conn, $id) {
    if (!$id) {
        sendResponse(false, 'Brand ID required', null, 400);
    }
    
    $id = intval($id);
    $stmt = $conn->prepare("SELECT id, brand_name, about, contact, logo_url, instagram, facebook, twitter, owner_name, owner_linkedin FROM brands WHERE id = ?");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        $stmt->close();
        sendResponse(false, 'Brand not found', null, 404);
    }
    
    $brand = $result->fetch_assoc();
    $stmt->close();
    sendResponse(true, 'Brand retrieved', $brand);
}
?>
