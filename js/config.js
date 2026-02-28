// Global API base URL configuration
// For public/private subnet setup:
// - Webserver is in PUBLIC subnet (frontend)
// - Backend API is in PRIVATE subnet
// - Set this to backend's PRIVATE IP on port 80
// 
// Examples:
// window.API_BASE_URL = 'http://10.0.1.50/api';  // Private subnet IP
// window.API_BASE_URL = 'http://backend-api.internal/api';  // Internal DNS
window.API_BASE_URL = window.API_BASE_URL || 'http://BACKEND-PRIVATE-IP/api';

// For local/development
// window.API_BASE_URL = 'http://localhost/api';

var API_BASE_URL = window.API_BASE_URL;
