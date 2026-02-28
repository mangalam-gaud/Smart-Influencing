// Check if user is authenticated
if (!isAuthenticated() || localStorage.getItem('userType') !== 'influencer') {
    window.location.href = '../index.html';
}

const influencerId = localStorage.getItem('userId');
const userName = localStorage.getItem('userName');

// Set user name in header
document.getElementById('userName').textContent = userName;

// Switch between tabs
function switchTab(tabName, event) {
    event.preventDefault();

    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected tab
    const tabElement = document.getElementById(`${tabName}-tab`);
    if (tabElement) {
        tabElement.classList.add('active');
    }

    // Add active class to clicked nav item
    event.target.closest('.nav-item').classList.add('active');

    // Update page title
    const titles = {
        overview: 'Dashboard',
        profile: 'Profile',
        campaigns: 'Available Campaigns',
        applied: 'Applied Campaigns',
        works: 'Work History',
        wallet: 'Wallet & Earnings',
        chat: 'Messages'
    };
    document.getElementById('pageTitle').textContent = titles[tabName] || 'Dashboard';

    // Load specific tab data
    if (tabName === 'works') {
        loadWorkProjects();
    }
}

// Load influencer profile
async function loadProfile() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/influencer/profile/${influencerId}`);
        const profile = await response.json();

        if (response.ok) {
            // Fetch average rating
            const ratingResponse = await fetchWithAuth(`${API_BASE_URL}/work/ratings/average/${influencerId}`);
            const ratingData = await ratingResponse.json();

            const averageRating = ratingData.average_rating || 0;
            const totalRatings = ratingData.total_ratings || 0;

            // Update overview stats
            document.getElementById('totalEarnings').textContent = `$${(profile.rating * 100).toFixed(2)}`;
            document.getElementById('userRating').textContent = `⭐ ${averageRating} (${totalRatings} reviews)`;
            document.getElementById('hourlyRate').textContent = `$${(profile.hourly_rate || 0).toFixed(2)}/hr`;

            // Update profile form
            document.getElementById('profileName').value = profile.name || '';
            document.getElementById('profileEmail').value = profile.email || '';
            document.getElementById('profileContact').value = profile.contact || '';
            document.getElementById('profileRate').value = profile.hourly_rate || '';
            document.getElementById('profileAbout').value = profile.about || '';
            document.getElementById('profileExperience').value = profile.experience || '';
            document.getElementById('profileInstagram').value = profile.instagram || '';
            document.getElementById('profileYoutube').value = profile.youtube || '';
            document.getElementById('profileFacebook').value = profile.facebook || '';
            document.getElementById('profileTwitter').value = profile.twitter || '';
            document.getElementById('profileSnapchat').value = profile.snapchat || '';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Load campaigns
async function loadCampaigns() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/campaign`);
        const campaigns = await response.json();

        const campaignsList = document.getElementById('campaignsList');
        campaignsList.innerHTML = '';

        if (campaigns.length === 0) {
            campaignsList.innerHTML = '<p>No campaigns available at the moment.</p>';
            return;
        }

        campaigns.forEach(campaign => {
            const campaignItem = document.createElement('div');
            campaignItem.className = 'campaign-item';
            campaignItem.innerHTML = `
                <div class="campaign-info">
                    <h3>${campaign.field || 'Campaign'}</h3>
                    <p>💰 Payout: $${campaign.payout}</p>
                    <p>⏱️ Duration: ${campaign.duration}</p>
                    <p>${campaign.overview}</p>
                </div>
                <div class="campaign-actions">
                    <button class="btn btn-sm btn-primary" onclick="applyCampaign(${campaign.id})">Apply Now</button>
                </div>
            `;
            campaignsList.appendChild(campaignItem);
        });
    } catch (error) {
        console.error('Error loading campaigns:', error);
    }
}

// Apply for campaign
async function applyCampaign(campaignId) {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/campaign/apply`, {
            method: 'POST',
            body: JSON.stringify({
                campaign_id: campaignId,
                influencer_id: influencerId
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Application submitted successfully!');
            loadAppliedCampaigns();
        } else {
            showNotification(data.message || 'Error applying for campaign', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error applying for campaign', 'error');
    }
}

// Load applied campaigns
async function loadAppliedCampaigns() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/influencer/campaigns/applied/${influencerId}`);
        const appliedCampaigns = await response.json();

        const appliedList = document.getElementById('appliedList');
        appliedList.innerHTML = '';

        if (appliedCampaigns.length === 0) {
            appliedList.innerHTML = '<p>No applications yet.</p>';
            return;
        }

        appliedCampaigns.forEach(campaign => {
            const statusClass = `status-${campaign.status}`;
            const appliedItem = document.createElement('div');
            appliedItem.className = 'campaign-item';
            appliedItem.innerHTML = `
                <div class="campaign-info">
                    <h3>${campaign.field || 'Campaign'}</h3>
                    <p>💰 Payout: $${campaign.payout}</p>
                    <p>⏱️ Duration: ${campaign.duration}</p>
                    <p><strong>Status:</strong> <span class="status-badge ${statusClass}">${campaign.status.toUpperCase()}</span></p>
                </div>
            `;
            appliedList.appendChild(appliedItem);
        });

        document.getElementById('activeCampaigns').textContent = appliedCampaigns.filter(c => c.status === 'accepted').length;
    } catch (error) {
        console.error('Error loading applied campaigns:', error);
    }
}

// Load wallet
async function loadWallet() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/influencer/wallet/${influencerId}`);
        const wallet = await response.json();

        document.getElementById('walletBalance').textContent = `$${(wallet.total_earnings || 0).toFixed(2)}`;
        document.getElementById('accountNumber').value = wallet.account_number || '';
        document.getElementById('ifscCode').value = wallet.ifsc_code || '';
    } catch (error) {
        console.error('Error loading wallet:', error);
    }
}

// Handle profile update
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const profileData = {
        name: document.getElementById('profileName').value,
        email: document.getElementById('profileEmail').value,
        contact: document.getElementById('profileContact').value,
        hourly_rate: document.getElementById('profileRate').value,
        about: document.getElementById('profileAbout').value,
        experience: document.getElementById('profileExperience').value,
        instagram: document.getElementById('profileInstagram').value,
        youtube: document.getElementById('profileYoutube').value,
        facebook: document.getElementById('profileFacebook').value,
        twitter: document.getElementById('profileTwitter').value,
        snapchat: document.getElementById('profileSnapchat').value
    };

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/influencer/profile/${influencerId}`, {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Profile updated successfully!');
        } else {
            showNotification(data.message || 'Error updating profile', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error updating profile', 'error');
    }
});

// Handle wallet update
document.getElementById('walletForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const walletData = {
        account_number: document.getElementById('accountNumber').value,
        ifsc_code: document.getElementById('ifscCode').value
    };

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/influencer/wallet/${influencerId}`, {
            method: 'PUT',
            body: JSON.stringify(walletData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Bank details saved successfully!');
        } else {
            showNotification(data.message || 'Error saving bank details', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error saving bank details', 'error');
    }
});

// Logout
function logout() {
    clearAuthData();
    window.location.href = '../index.html';
}

// ======================== WORK PROJECT FUNCTIONS ========================

// Load work projects and history
async function loadWorkProjects() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/work/influencer/${influencerId}`);
        const projects = await response.json();

        // Fetch payment history for this influencer
        const paymentResponse = await fetchWithAuth(`${API_BASE_URL}/payment/wallet/${influencerId}/transactions`);
        const paymentData = await paymentResponse.json();

        const worksList = document.getElementById('worksList');
        worksList.innerHTML = '';

        if (!Array.isArray(projects) || projects.length === 0) {
            worksList.innerHTML = '<p>No work projects yet. Accept campaigns to start working with brands!</p>';
            return;
        }

        projects.forEach(project => {
            const projectCard = document.createElement('div');
            projectCard.className = 'campaign-item';
            
            let statusBadge = `<span style="color: #10b981; font-weight: bold;">${project.status.toUpperCase()}</span>`;
            if (project.status === 'ongoing') {
                statusBadge = `<span style="color: #f59e0b; font-weight: bold;">IN PROGRESS</span>`;
            }

            let paymentStatusHTML = '';
            // Try to find payment for this project
            if (paymentData.success && Array.isArray(paymentData.transactions)) {
                const relatedTxn = paymentData.transactions.find(t => t.related_work_project_id === project.id);
                if (relatedTxn) {
                    let paymentBadge = '⏳ Pending';
                    let paymentColor = '#fbbf24';
                    
                    if (relatedTxn.transaction_type === 'credit' && relatedTxn.status === 'completed') {
                        paymentBadge = '✓ Credited';
                        paymentColor = '#10b981';
                    } else if (relatedTxn.transaction_type === 'refund' && relatedTxn.status === 'completed') {
                        paymentBadge = '↩️ Refunded';
                        paymentColor = '#6366f1';
                    }
                    
                    paymentStatusHTML = `<p><strong style="color: ${paymentColor};">Payment: ${paymentBadge}</strong></p>`;
                }
            }

            let ratingSection = '';
            if (project.rating) {
                ratingSection = `
                    <div style="margin-top: 1rem; padding: 1rem; background: #f3f4f6; border-radius: 8px;">
                        <p><strong>Rating:</strong> ${'⭐'.repeat(Math.round(project.rating))} (${project.rating}/5)</p>
                        <p><strong>Review:</strong> ${project.review_text}</p>
                        <p><small>${new Date(project.review_date).toLocaleDateString()}</small></p>
                    </div>
                `;
            }

            projectCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 0.5rem 0; color: var(--primary-color);">${project.campaign_field}</h3>
                        <p><strong>Brand:</strong> ${project.brand_name}</p>
                        <p><strong>Status:</strong> ${statusBadge}</p>
                        <p><strong>Payout:</strong> ₹${parseFloat(project.payout).toFixed(2)}</p>
                        ${paymentStatusHTML}
                        <p><strong>Campaign:</strong> ${project.campaign_overview}</p>
                        ${ratingSection}
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        ${project.status === 'ongoing' ? `
                            <button class="btn btn-primary btn-sm" onclick="openWorkUpdateModal(${project.id})">Add Update</button>
                            <button class="btn btn-secondary btn-sm" onclick="viewWorkDetails(${project.id})">View Details</button>
                            <button class="btn btn-success btn-sm" onclick="markWorkComplete(${project.id})">Mark Complete</button>
                        ` : `
                            <button class="btn btn-secondary btn-sm" onclick="viewWorkDetails(${project.id})">View Details</button>
                        `}
                    </div>
                </div>
            `;
            worksList.appendChild(projectCard);
        });
    } catch (error) {
        console.error('Error loading work projects:', error);
        showNotification('Error loading work projects', 'error');
    }
}

// Global variable to store current work project ID
let currentWorkProjectId = null;

// Open work update modal
function openWorkUpdateModal(workProjectId) {
    currentWorkProjectId = workProjectId;
    document.getElementById('updateDescription').value = '';
    document.getElementById('progressPercentage').value = '0';
    document.getElementById('workUpdateModal').style.display = 'block';
}

// Close work update modal
function closeWorkUpdateModal() {
    document.getElementById('workUpdateModal').style.display = 'none';
    currentWorkProjectId = null;
}

// Submit work update
document.getElementById('workUpdateForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const updateDescription = document.getElementById('updateDescription').value.trim();
    const progressPercentage = parseInt(document.getElementById('progressPercentage').value);

    if (!updateDescription) {
        showNotification('Please enter an update description', 'error');
        return;
    }

    if (progressPercentage < 0 || progressPercentage > 100) {
        showNotification('Progress must be between 0 and 100', 'error');
        return;
    }

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/work/updates/add`, {
            method: 'POST',
            body: JSON.stringify({
                workProjectId: currentWorkProjectId,
                influencerId: influencerId,
                updateDescription: updateDescription,
                progressPercentage: progressPercentage
            })
        });

        if (response.ok) {
            showNotification('Update posted successfully!', 'success');
            closeWorkUpdateModal();
            loadWorkProjects();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to post update', 'error');
        }
    } catch (error) {
        console.error('Error posting update:', error);
        showNotification('Error posting update', 'error');
    }
});

// View work details and reviews
async function viewWorkDetails(workProjectId) {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/work/ratings/influencer/${influencerId}`);
        const ratings = await response.json();

        // Find rating for this project (you may need to modify based on your API response)
        const content = document.getElementById('workDetailsContent');
        content.innerHTML = '<p>Work details and any reviews will appear here.</p>';
        
        document.getElementById('workDetailsModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading work details:', error);
        showNotification('Error loading details', 'error');
    }
}

// Close work details modal
function closeWorkDetailsModal() {
    document.getElementById('workDetailsModal').style.display = 'none';
}

// Mark work as complete
async function markWorkComplete(workProjectId) {
    if (!confirm('Mark this work as completed? The brand will be able to rate your work.')) {
        return;
    }

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/work/complete/${workProjectId}`, {
            method: 'PUT'
        });

        if (response.ok) {
            showNotification('Work marked as completed! Waiting for brand to rate...', 'success');
            loadWorkProjects();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to complete work', 'error');
        }
    } catch (error) {
        console.error('Error completing work:', error);
        showNotification('Error completing work', 'error');
    }
}

// ==================== WALLET & PAYMENT SYSTEM ====================

let currentInfluencerDisputeContext = {
    workProjectId: null,
    paymentId: null,
    brandId: null
};

// Load Wallet Data
async function loadWallet() {
    try {
        // Fetch wallet balance
        const walletResponse = await fetchWithAuth(`${API_BASE_URL}/payment/wallet/${influencerId}`);
        const walletData = await walletResponse.json();

        if (walletData.success) {
            const balance = walletData.balance || 0;
            document.getElementById('walletBalance').textContent = `₹${parseFloat(balance).toFixed(2)}`;
            
            // Load payout account if exists
            if (walletData.payout_account) {
                document.getElementById('accountHolderName').value = walletData.payout_account.account_holder_name || '';
                document.getElementById('accountNumber').value = walletData.payout_account.account_number || '';
                document.getElementById('ifscCode').value = walletData.payout_account.ifsc_code || '';
                document.getElementById('bankName').value = walletData.payout_account.bank_name || '';
                document.getElementById('accountType').value = walletData.payout_account.account_type || 'savings';
            }
        }

        // Fetch transaction history
        const txnResponse = await fetchWithAuth(`${API_BASE_URL}/payment/wallet/${influencerId}/transactions`);
        const txnData = await txnResponse.json();

        const transactionsList = document.getElementById('transactionsList');
        transactionsList.innerHTML = '';

        let pendingCount = 0, creditedCount = 0;

        if (txnData.success && Array.isArray(txnData.transactions) && txnData.transactions.length > 0) {
            txnData.transactions.forEach(txn => {
                const date = new Date(txn.created_at).toLocaleDateString();
                const time = new Date(txn.created_at).toLocaleTimeString();
                
                let typeIcon = '⏳';
                let statusColor = 'warning';
                if (txn.transaction_type === 'credit') {
                    typeIcon = '✅';
                    statusColor = 'success';
                    if (txn.status === 'completed') creditedCount++;
                } else if (txn.transaction_type === 'refund') {
                    typeIcon = '↩️';
                    statusColor = 'info';
                } else if (txn.transaction_type === 'debit') {
                    typeIcon = '❌';
                    statusColor = 'danger';
                } else if (txn.transaction_type === 'pending') {
                    typeIcon = '⏳';
                    statusColor = 'warning';
                    pendingCount++;
                }

                const txnItem = document.createElement('div');
                txnItem.style.cssText = 'padding: 12px; background: #f9f9f9; margin: 8px 0; border-radius: 5px; border-left: 4px solid #' + 
                    (statusColor === 'success' ? '28a745' : statusColor === 'danger' ? 'dc3545' : statusColor === 'warning' ? 'ffc107' : '17a2b8');
                
                txnItem.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span>${typeIcon}</span>
                            <strong>${txn.description}</strong>
                            <br>
                            <small>${date} ${time}</small>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 0; font-weight: bold; color: ${txn.transaction_type === 'credit' || txn.transaction_type === 'refund' ? 'green' : 'red'}">
                                ${txn.transaction_type === 'credit' || txn.transaction_type === 'refund' ? '+' : '-'} ₹${parseFloat(txn.amount).toFixed(2)}
                            </p>
                            <small style="color: #666;">Status: ${txn.status}</small>
                        </div>
                    </div>
                `;
                transactionsList.appendChild(txnItem);
            });

            document.getElementById('pendingPayments').textContent = pendingCount;
            document.getElementById('creditedPayments').textContent = creditedCount;
        } else {
            transactionsList.innerHTML = '<p>No transactions yet. Complete work to earn payments.</p>';
        }
    } catch (error) {
        console.error('Wallet loading error:', error);
    }
}

// Save Payout Account Details
document.getElementById('payoutAccountForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const accountData = {
        influencerId: influencerId,
        accountHolderName: document.getElementById('accountHolderName').value,
        accountNumber: document.getElementById('accountNumber').value,
        ifscCode: document.getElementById('ifscCode').value,
        bankName: document.getElementById('bankName').value,
        accountType: document.getElementById('accountType').value
    };

    try {
        const response = await fetchWithAuth('/api/payment/payout-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(accountData)
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Bank details saved successfully!', 'success');
        } else {
            showNotification('Error saving bank details', 'error');
        }
    } catch (error) {
        console.error('Save account error:', error);
        showNotification('Error saving bank details', 'error');
    }
});

// Open Dispute Modal for Influencer (respond to brand's dispute)
async function openInfluencerDisputeModal(workProjectId, paymentId, brandId, brandName) {
    currentInfluencerDisputeContext = {
        workProjectId: workProjectId,
        paymentId: paymentId,
        brandId: brandId
    };

    document.getElementById('dispBrandName').textContent = brandName;

    // Check dispute status
    try {
        const response = await fetchWithAuth(`/api/payment/dispute/${workProjectId}`);
        const data = await response.json();

        if (data.success && data.dispute) {
            const dispute = data.dispute;
            document.getElementById('influencerDisputeNote').style.display = 'block';
            
            if (dispute.brand_says_complete !== null && dispute.influencer_says_complete !== null) {
                if (dispute.brand_says_complete && dispute.influencer_says_complete) {
                    document.getElementById('influencerDisputeNoteText').textContent = 'Both parties confirmed work is complete. Payment is credited.';
                } else if (!dispute.brand_says_complete && !dispute.influencer_says_complete) {
                    document.getElementById('influencerDisputeNoteText').textContent = 'Both parties confirmed work is NOT complete. Payment will be refunded.';
                } else {
                    document.getElementById('influencerDisputeNoteText').textContent = 'Waiting for confirmation from both parties...';
                }
            }
        }
    } catch (error) {
        console.error('Fetch dispute error:', error);
    }

    document.getElementById('influencerDisputeModal').style.display = 'block';
}

function closeInfluencerDisputeModal() {
    document.getElementById('influencerDisputeModal').style.display = 'none';
}

// Influencer Responds to Dispute
async function respondToInfluencerDispute(isComplete) {
    const { workProjectId } = currentInfluencerDisputeContext;

    try {
        const response = await fetchWithAuth('/api/payment/dispute/respond', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workProjectId: workProjectId,
                respondedBy: 'influencer',
                isComplete: isComplete
            })
        });

        const data = await response.json();

        if (data.success) {
            if (data.resolution === 'credited') {
                showNotification('✓ Both parties confirmed work is complete. Payment credited to your account!', 'success');
            } else if (data.resolution === 'refunded') {
                showNotification('✓ Both parties confirmed work is not complete. Payment refunded to brand.', 'info');
            } else {
                showNotification('✓ Your response recorded. Waiting for brand confirmation...', 'success');
            }
            closeInfluencerDisputeModal();
            loadWorkProjects();
            loadWallet();
        } else {
            showNotification('Error: ' + (data.message || 'Failed to record response'), 'error');
        }
    } catch (error) {
        console.error('Dispute response error:', error);
        showNotification('Error recording dispute response', 'error');
    }
}

