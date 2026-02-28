<?php
/**
 * Main Configuration File
 *
 * This file now uses environment variables for configuration.
 * On your production server, you should set these variables.
 * For local development, you can use a .htaccess file (if using Apache)
 * or similar methods to set these variables.
 *
 * Required Environment Variables:
 * - DB_HOST: The database host (e.g., 'localhost')
 * - DB_USER: The database username
 * - DB_PASSWORD: The database password
 * - DB_NAME: The database name
 * - JWT_SECRET: A long, random, and secret key for signing tokens.
 * - FRONTEND_URL: The full URL of your frontend (e.g., 'https://yourdomain.com') to restrict CORS.
 */

// A helper function to ensure environment variables are set
function get_env_or_die($key) {
    $value = getenv($key);
    if ($value === false) {
        // This is a critical error, so we stop execution.
        // In a real production server, this error would appear in the server logs.
        http_response_code(500);
        die("FATAL ERROR: Required environment variable '$key' is not set. Application cannot start.");
    }
    return $value;
}

// --- Production-Safe Configuration Loading ---
// The application will not start unless all these environment variables are set.
define('DB_HOST', get_env_or_die('DB_HOST'));
define('DB_USER', get_env_or_die('DB_USER'));
define('DB_PASSWORD', get_env_or_die('DB_PASSWORD'));
define('DB_NAME', get_env_or_die('DB_NAME'));

define('JWT_SECRET', get_env_or_die('JWT_SECRET'));
define('JWT_EXPIRE', 86400); // 24 hours

$frontend_url = get_env_or_die('FRONTEND_URL');

// CORS Headers
header('Access-Control-Allow-Origin: ' . $frontend_url);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // If the origin is the allowed frontend, send back the same access control headers
    if ($frontend_url !== '*' && isset($_SERVER['HTTP_ORIGIN']) && $_SERVER['HTTP_ORIGIN'] === $frontend_url) {
        http_response_code(200);
    } else if ($frontend_url === '*') {
        http_response_code(200);
    } else {
        http_response_code(403); // Forbidden
    }
    exit();
}

// Create database connection
$conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);

// Check connection
if ($conn->connect_error) {
    // Avoid leaking connection details in a production environment
    error_log('Database connection failed: ' . $conn->connect_error); // Log error instead of echoing
    die(json_encode(['success' => false, 'message' => 'Database connection failed. Please contact support.']));
}

// Set charset to UTF-8
$conn->set_charset('utf8mb4');

// Helper function to send response
function sendResponse($success, $message, $data = null, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit();
}

// Helper function to get request data
function getRequestData() {
    $contentType = isset($_SERVER['CONTENT_TYPE']) ? trim($_SERVER['CONTENT_TYPE']) : '';

    if (stripos($contentType, 'application/json') !== false) {
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);
        // Ensure json_decode was successful
        if (json_last_error() !== JSON_ERROR_NONE) {
            return [];
        }
        return $data;
    }
    
    // Fallback for form data
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST)) {
        return $_POST;
    }

    return [];
}


// JWT Token generation
function generateToken($userId, $userType) {
    $header = json_encode(['alg' => 'HS256', 'typ' => 'JWT']);
    $payload = json_encode([
        'user_id' => $userId,
        'user_type' => $userType,
        'iat' => time(),
        'exp' => time() + JWT_EXPIRE
    ]);
    
    $headerEncoded = urlsafeBase64Encode($header);
    $payloadEncoded = urlsafeBase64Encode($payload);
    $signature = hash_hmac('sha256', "$headerEncoded.$payloadEncoded", JWT_SECRET, true);
    $signatureEncoded = urlsafeBase64Encode($signature);
    
    return "$headerEncoded.$payloadEncoded.$signatureEncoded";
}

// JWT Token verification
function verifyToken($token) {
    // Check if JWT_SECRET has been changed from default
    if (JWT_SECRET === 'your-super-secret-jwt-key-change-this') {
        error_log('Security Warning: JWT_SECRET is set to the default insecure value.');
    }

    $parts = explode('.', $token);
    
    if (count($parts) !== 3) {
        return false;
    }
    
    list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;
    $signature = hash_hmac('sha256', "$headerEncoded.$payloadEncoded", JWT_SECRET, true);
    $signatureDecoded = urlsafeBase64Decode($signatureEncoded);
    
    if (!hash_equals($signature, $signatureDecoded)) {
        return false;
    }
    
    $payload = json_decode(urlsafeBase64Decode($payloadEncoded), true);
    
    if ($payload === null || !isset($payload['exp']) || $payload['exp'] < time()) {
        return false;
    }
    
    return $payload;
}


// Base64 URL-safe encoding/decoding
function urlsafeBase64Encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function urlsafeBase64Decode($data) {
    return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', 4 - (strlen($data) % 4)));
}

// Get Authorization Token
function getAuthToken() {
    $headers = getallheaders();
    
    if (isset($headers['Authorization'])) {
        $authHeader = $headers['Authorization'];
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
    }
    
    return null;
}

// Verify user is authenticated
function requireAuth() {
    $token = getAuthToken();
    
    if (!$token) {
        sendResponse(false, 'No authentication token provided', null, 401);
    }
    
    $payload = verifyToken($token);
    
    if (!$payload) {
        sendResponse(false, 'Invalid or expired token', null, 401);
    }
    
    return $payload;
}

// Hash password
function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}

// Verify password
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}
?>
