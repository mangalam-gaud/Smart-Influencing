// Navigation functions
function goToAuth(userType) {
    if (userType === 'influencer') {
        window.location.href = 'pages/influencer-auth.html';
    } else {
        window.location.href = 'pages/brand-auth.html';
    }
}

// Get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Check if user is authenticated
function isAuthenticated() {
    return !!getAuthToken();
}

// Store auth data
function storeAuthData(token, userId, userType, userName) {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('userType', userType);
    localStorage.setItem('userName', userName);
}

// Clear auth data
function clearAuthData() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userType');
    localStorage.removeItem('userName');
}

// Fetch with auth token
async function fetchWithAuth(url, options = {}) {
    // Compatibility layer: if URL is built against API_BASE_URL with REST-like paths,
    // translate to centralized `apiCall()` which targets the PHP endpoints.
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const apiBase = (window.API_BASE_URL || '');
    try {
        if (typeof apiCall === 'function' && apiBase && url.startsWith(apiBase)) {
            // Extract path after base
            const path = url.substring(apiBase.length).replace(/^\/+/, '');
            const parts = path.split('/').filter(Boolean);
            // Default method
            const method = (options.method || 'GET').toUpperCase();
            let resultPromise = null;

            // Map common REST-like paths to apiCall actions
            if (parts[0] === 'brand' && parts[1] === 'profile') {
                if (method === 'PUT') {
                    const body = options.body ? JSON.parse(options.body) : {};
                    resultPromise = apiCall('brand', 'update_profile', body, 'POST');
                } else {
                    resultPromise = apiCall('brand', 'profile', {}, 'POST');
                }
            } else if (parts[0] === 'influencer' && parts[1] === 'profile') {
                resultPromise = apiCall('influencer', 'profile', {}, 'POST');
            } else if (parts[0] === 'campaign' && parts.length === 1) {
                if (method === 'POST') {
                    const body = options.body ? JSON.parse(options.body) : {};
                    resultPromise = apiCall('campaign', 'create', body, 'POST');
                } else {
                    resultPromise = apiCall('campaign', 'get_all', {}, 'POST');
                }
            } else if (parts[0] === 'campaign' && parts[2] === 'applicants') {
                const campaignId = parseInt(parts[1]);
                resultPromise = apiCall('application', 'get_applications', { campaign_id: campaignId }, 'POST');
            } else if (parts[0] === 'campaign' && parts[1] === 'application') {
                // /campaign/application/{appId}
                const appId = parseInt(parts[2]);
                const body = options.body ? JSON.parse(options.body) : {};
                resultPromise = apiCall('application', 'update_status', { application_id: appId, ...(body || {}) }, 'POST');
            } else if (parts[0] === 'campaign' && parts[1] === 'influencers') {
                resultPromise = apiCall('influencer', 'get_all', {}, 'POST');
            }

            if (resultPromise) {
                const result = await resultPromise;
                // Build a Response-like object
                return {
                    ok: !!(result && result.success),
                    status: result && result.success ? 200 : 400,
                    json: async () => (result && (result.data !== undefined ? result.data : { message: result.message }))
                };
            }
        }
    } catch (e) {
        console.error('Compatibility fetchWithAuth error:', e);
    }

    // Fallback to normal fetch when no mapping applies
    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        clearAuthData();
        window.location.href = '/index.html';
    }

    return response;
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
