// Configuration
const API_BASE = (window.API_BASE_URL || '/smart-influencing/php/api');

// Get token from localStorage
function getToken() {
    return localStorage.getItem('authToken');
}

// Set token in localStorage
function setToken(token) {
    localStorage.setItem('authToken', token);
}

// Get user type from localStorage
function getUserType() {
    return localStorage.getItem('userType');
}

// Set user type
function setUserType(type) {
    localStorage.setItem('userType', type);
}

// API Call Helper
async function apiCall(endpoint, action, data = {}, method = 'POST') {
    const url = `${API_BASE}/${endpoint}.php?action=${action}`;
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    // Add authorization token if available
    const token = getToken();
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Add data for POST requests
    if (method === 'POST' && Object.keys(data).length > 0) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        // Handle 401 Unauthorized
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = '/smart-influencing/frontend/pages/brand-auth.html';
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Network error: ' + error.message };
    }
}

// Influencer Functions
async function registerInfluencer(email, password, name) {
    return await apiCall('influencer', 'register', { email, password, name });
}

async function loginInfluencer(email, password) {
    return await apiCall('influencer', 'login', { email, password });
}

async function getInfluencerProfile() {
    return await apiCall('influencer', 'profile');
}

async function updateInfluencerProfile(data) {
    return await apiCall('influencer', 'update_profile', data);
}

async function getAllInfluencers() {
    return await apiCall('influencer', 'get_all');
}

async function getInfluencerById(id) {
    return await apiCall('influencer', 'get_by_id', { id });
}

// Brand Functions
async function registerBrand(email, password, brand_name) {
    return await apiCall('brand', 'register', { email, password, brand_name });
}

async function loginBrand(email, password) {
    return await apiCall('brand', 'login', { email, password });
}

async function getBrandProfile() {
    return await apiCall('brand', 'profile');
}

async function updateBrandProfile(data) {
    return await apiCall('brand', 'update_profile', data);
}

async function getAllBrands() {
    return await apiCall('brand', 'get_all');
}

async function getBrandById(id) {
    return await apiCall('brand', 'get_by_id', { id });
}

// Campaign Functions
async function createCampaign(campaignData) {
    return await apiCall('campaign', 'create', campaignData);
}

async function getAllCampaigns(limit = 50, offset = 0, status = 'active') {
    return await apiCall('campaign', 'get_all', { limit, offset, status });
}

async function getCampaignById(id) {
    return await apiCall('campaign', 'get_by_id', { id });
}

async function getBrandCampaigns() {
    return await apiCall('campaign', 'get_brand_campaigns');
}

async function updateCampaign(id, data) {
    return await apiCall('campaign', 'update', { id, ...data });
}

async function deleteCampaign(id) {
    return await apiCall('campaign', 'delete', { id });
}

// Application Functions
async function applyCampaign(campaign_id) {
    return await apiCall('application', 'apply', { campaign_id });
}

async function getApplications(campaign_id) {
    return await apiCall('application', 'get_applications', { campaign_id });
}

async function updateApplicationStatus(application_id, status) {
    return await apiCall('application', 'update_status', { application_id, status });
}

async function getInfluencerApplications() {
    return await apiCall('application', 'get_influencer_applications');
}

// Chat Functions
async function sendMessage(recipient_id, message) {
    return await apiCall('chat', 'send_message', { recipient_id, message });
}

async function getConversation(chat_id) {
    return await apiCall('chat', 'get_conversation', { chat_id });
}

async function getUserConversations() {
    return await apiCall('chat', 'get_conversations');
}

// Payment Functions
async function processPayment(application_id, amount) {
    return await apiCall('payment', 'process_payment', { application_id, amount });
}

async function getTransactionHistory() {
    return await apiCall('payment', 'get_transaction_history');
}

async function getWallet() {
    return await apiCall('payment', 'get_wallet');
}

async function updateBankDetails(account_number, ifsc_code) {
    return await apiCall('payment', 'update_bank_details', { account_number, ifsc_code });
}

// Helper Functions
function logout() {
    localStorage.clear();
    window.location.href = '/smart-influencing/frontend/index.html';
}

function isLoggedIn() {
    return !!getToken();
}

function redirectIfNotLoggedIn(requiredUserType = null) {
    if (!isLoggedIn()) {
        window.location.href = '/smart-influencing/frontend/index.html';
        return false;
    }
    
    if (requiredUserType && getUserType() !== requiredUserType) {
        window.location.href = '/smart-influencing/frontend/index.html';
        return false;
    }
    
    return true;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}
