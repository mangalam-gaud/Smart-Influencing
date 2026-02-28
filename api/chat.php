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
    case 'send_message':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        sendMessage($conn, $data);
        break;
    case 'get_conversation':
        getConversation($conn, $data);
        break;
    case 'get_conversations':
        getUserConversations($conn);
        break;
    default:
        sendResponse(false, 'Invalid action', null, 400);
}

function sendMessage($conn, $data) {
    $payload = requireAuth();
    
    if (!isset($data['recipient_id']) || !isset($data['message'])) {
        sendResponse(false, 'Recipient ID and message required', null, 400);
    }
    
    $sender_id = $payload['user_id'];
    $sender_type = $payload['user_type'];
    $recipient_id = intval($data['recipient_id']);
    $message = $data['message'];
    
    // Create or get conversation (prepared statement)
    $conversation_check = $conn->prepare("
        SELECT id FROM chats 
        WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
        LIMIT 1
    ");
    $conversation_check->bind_param('iiii', $sender_id, $recipient_id, $recipient_id, $sender_id);
    $conversation_check->execute();
    $conversationCheck = $conversation_check->get_result();
    $conversation_check->close();
    
    if ($conversationCheck->num_rows > 0) {
        $conversation = $conversationCheck->fetch_assoc();
        $chat_id = $conversation['id'];
    } else {
        // Create new conversation (prepared statement)
        $insert_chat = $conn->prepare("INSERT INTO chats (sender_id, recipient_id, sender_type) VALUES (?, ?, ?)");
        $insert_chat->bind_param('iis', $sender_id, $recipient_id, $sender_type);
        $insert_chat->execute();
        $chat_id = $conn->insert_id;
        $insert_chat->close();
    }
    
    // Store message (prepared statement)
    $message_stmt = $conn->prepare("INSERT INTO chat_messages (chat_id, sender_id, content) VALUES (?, ?, ?)");
    $message_stmt->bind_param('iis', $chat_id, $sender_id, $message);
    
    if ($message_stmt->execute()) {
        $message_stmt->close();
        sendResponse(true, 'Message sent', ['chat_id' => $chat_id]);
    } else {
        $message_stmt->close();
        sendResponse(false, 'Failed to send message: ' . $conn->error, null, 500);
    }
}

function getConversation($conn, $data) {
    $payload = requireAuth();
    
    if (!isset($data['chat_id'])) {
        sendResponse(false, 'Chat ID required', null, 400);
    }
    
    $user_id = $payload['user_id'];
    $chat_id = intval($data['chat_id']);
    
    // Verify user is part of conversation (prepared statement)
    $chat_check = $conn->prepare("
        SELECT id FROM chats 
        WHERE id = ? AND (sender_id = ? OR recipient_id = ?)
    ");
    $chat_check->bind_param('iii', $chat_id, $user_id, $user_id);
    $chat_check->execute();
    $chatCheck = $chat_check->get_result();
    $chat_check->close();
    
    if ($chatCheck->num_rows === 0) {
        sendResponse(false, 'Chat not found or unauthorized', null, 404);
    }
    
    // Get messages (prepared statement)
    $stmt = $conn->prepare("
        SELECT m.*, 
               CASE WHEN m.sender_id = ? THEN 'sent' ELSE 'received' END as direction
        FROM chat_messages m
        WHERE m.chat_id = ?
        ORDER BY m.created_at ASC
        LIMIT 100
    ");
    $stmt->bind_param('ii', $user_id, $chat_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $messages = [];
    while ($row = $result->fetch_assoc()) {
        $messages[] = $row;
    }
    $stmt->close();
    
    sendResponse(true, 'Messages retrieved', $messages);
}

function getUserConversations($conn) {
    $payload = requireAuth();
    $user_id = $payload['user_id'];
    
    $stmt = $conn->prepare("
        SELECT c.id, c.sender_id, c.recipient_id, c.created_at,
               COALESCE(m.content, '') as last_message,
               COALESCE(m.created_at, c.created_at) as last_message_time,
               CASE 
                   WHEN c.sender_id = ? THEN c.recipient_id 
                   ELSE c.sender_id 
               END as other_user_id
        FROM chats c
        LEFT JOIN chat_messages m ON c.id = m.chat_id
        WHERE c.sender_id = ? OR c.recipient_id = ?
        GROUP BY c.id
        ORDER BY COALESCE(m.created_at, c.created_at) DESC
    ");
    $stmt->bind_param('iii', $user_id, $user_id, $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $conversations = [];
    while ($row = $result->fetch_assoc()) {
        $other_user_id = $row['other_user_id'];
        
        // Get other user's info (prepared statement)
        $user_stmt = $conn->prepare("
            SELECT id, name as name, photo_url as photo_url FROM influencers WHERE id = ?
            UNION
            SELECT id, brand_name as name, logo_url as photo_url FROM brands WHERE id = ?
        ");
        $user_stmt->bind_param('ii', $other_user_id, $other_user_id);
        $user_stmt->execute();
        $userQuery = $user_stmt->get_result();
        $user_stmt->close();
        
        if ($userQuery->num_rows > 0) {
            $otherUser = $userQuery->fetch_assoc();
            $row['other_user_name'] = $otherUser['name'];
            $row['other_user_photo'] = $otherUser['photo_url'];
        }
        
        $conversations[] = $row;
    }
    $stmt->close();
    
    sendResponse(true, 'Conversations retrieved', $conversations);
}
?>
