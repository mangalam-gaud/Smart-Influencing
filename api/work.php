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
    case 'create_task':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        createWorkTask($conn, $data);
        break;
    case 'get_tasks':
        getWorkTasks($conn, $data);
        break;
    case 'update_task':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        updateWorkTask($conn, $data);
        break;
    case 'delete_task':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        deleteWorkTask($conn, $data);
        break;
    case 'mark_complete':
        if ($method !== 'POST') sendResponse(false, 'POST required', null, 405);
        markTaskComplete($conn, $data);
        break;
    default:
        sendResponse(false, 'Invalid action', null, 400);
}

function createWorkTask($conn, $data) {
    $payload = requireAuth();
    
    if (!isset($data['title']) || !isset($data['description'])) {
        sendResponse(false, 'Title and description required', null, 400);
    }
    
    $title = $conn->real_escape_string($data['title']);
    $description = $conn->real_escape_string($data['description']);
    $priority = isset($data['priority']) ? $conn->real_escape_string($data['priority']) : 'medium';
    $due_date = isset($data['due_date']) ? $conn->real_escape_string($data['due_date']) : null;
    $user_id = $payload['user_id'];
    $user_type = $payload['user_type'];
    
    $sql = "INSERT INTO work_tasks (user_id, user_type, title, description, priority, due_date, status) 
            VALUES ($user_id, '$user_type', '$title', '$description', '$priority', " . 
            ($due_date ? "'$due_date'" : "NULL") . ", 'pending')";
    
    if ($conn->query($sql)) {
        sendResponse(true, 'Task created successfully', ['task_id' => $conn->insert_id]);
    } else {
        sendResponse(false, 'Failed to create task: ' . $conn->error, null, 500);
    }
}

function getWorkTasks($conn, $data) {
    $payload = requireAuth();
    
    $user_id = $payload['user_id'];
    $status = isset($data['status']) ? $conn->real_escape_string($data['status']) : null;
    
    $sql = "SELECT id, title, description, priority, due_date, status, created_at 
            FROM work_tasks 
            WHERE user_id = $user_id";
    
    if ($status) {
        $sql .= " AND status = '$status'";
    }
    
    $sql .= " ORDER BY created_at DESC";
    
    $result = $conn->query($sql);
    
    if ($result === false) {
        sendResponse(false, 'Query failed: ' . $conn->error, null, 500);
    }
    
    $tasks = [];
    while ($row = $result->fetch_assoc()) {
        $tasks[] = $row;
    }
    
    sendResponse(true, 'Tasks retrieved', $tasks);
}

function updateWorkTask($conn, $data) {
    $payload = requireAuth();
    
    if (!isset($data['task_id'])) {
        sendResponse(false, 'Task ID required', null, 400);
    }
    
    $task_id = intval($data['task_id']);
    $user_id = $payload['user_id'];
    
    // Check if user owns the task
    $check = $conn->query("SELECT id FROM work_tasks WHERE id = $task_id AND user_id = $user_id");
    if ($check->num_rows === 0) {
        sendResponse(false, 'Task not found or unauthorized', null, 404);
    }
    
    $updates = [];
    $fields = ['title', 'description', 'priority', 'due_date'];
    
    foreach ($fields as $field) {
        if (isset($data[$field])) {
            $value = $conn->real_escape_string($data[$field]);
            if ($field === 'due_date' && empty($value)) {
                $updates[] = "$field = NULL";
            } else {
                $updates[] = "$field = '$value'";
            }
        }
    }
    
    if (empty($updates)) {
        sendResponse(false, 'No fields to update', null, 400);
    }
    
    $sql = "UPDATE work_tasks SET " . implode(', ', $updates) . ", updated_at = CURRENT_TIMESTAMP WHERE id = $task_id";
    
    if ($conn->query($sql)) {
        sendResponse(true, 'Task updated successfully');
    } else {
        sendResponse(false, 'Update failed: ' . $conn->error, null, 500);
    }
}

function deleteWorkTask($conn, $data) {
    $payload = requireAuth();
    
    if (!isset($data['task_id'])) {
        sendResponse(false, 'Task ID required', null, 400);
    }
    
    $task_id = intval($data['task_id']);
    $user_id = $payload['user_id'];
    
    // Check if user owns the task
    $check = $conn->query("SELECT id FROM work_tasks WHERE id = $task_id AND user_id = $user_id");
    if ($check->num_rows === 0) {
        sendResponse(false, 'Task not found or unauthorized', null, 404);
    }
    
    if ($conn->query("DELETE FROM work_tasks WHERE id = $task_id")) {
        sendResponse(true, 'Task deleted successfully');
    } else {
        sendResponse(false, 'Delete failed: ' . $conn->error, null, 500);
    }
}

function markTaskComplete($conn, $data) {
    $payload = requireAuth();
    
    if (!isset($data['task_id'])) {
        sendResponse(false, 'Task ID required', null, 400);
    }
    
    $task_id = intval($data['task_id']);
    $user_id = $payload['user_id'];
    
    // Check if user owns the task
    $check = $conn->query("SELECT id FROM work_tasks WHERE id = $task_id AND user_id = $user_id");
    if ($check->num_rows === 0) {
        sendResponse(false, 'Task not found or unauthorized', null, 404);
    }
    
    $status = isset($data['status']) ? $conn->real_escape_string($data['status']) : 'completed';
    
    $sql = "UPDATE work_tasks SET status = '$status', completed_at = CURRENT_TIMESTAMP WHERE id = $task_id";
    
    if ($conn->query($sql)) {
        sendResponse(true, 'Task marked as ' . $status);
    } else {
        sendResponse(false, 'Update failed: ' . $conn->error, null, 500);
    }
}
?>
