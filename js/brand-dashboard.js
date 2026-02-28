// Check if user is authenticated
if (!isAuthenticated() || localStorage.getItem('userType') !== 'brand') {
    window.location.href = '../index.html';
}

const brandId = localStorage.getItem('userId');
const brandName = localStorage.getItem('userName');

// Set brand name in header
document.getElementById('brandName').textContent = brandName;

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
        profile: 'Brand Profile',
        campaigns: 'My Campaigns',
        'create-campaign': 'Create Campaign',
        influencers: 'Find Influencers',
        chat: 'Messages'
    };
    document.getElementById('pageTitle').textContent = titles[tabName] || 'Dashboard';

    // Load data for specific tabs
    if (tabName === 'campaigns') {
        loadBrandCampaigns();
    } else if (tabName === 'influencers') {
        loadInfluencers();
    }
}

// Load brand profile
async function loadBrandProfile() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/brand/profile/${brandId}`);
        const profile = await response.json();

        if (response.ok) {
            // Update profile form
            document.getElementById('brandNameInput').value = profile.brand_name || '';
            document.getElementById('brandEmailInput').value = profile.email || '';
            document.getElementById('brandContactInput').value = profile.contact || '';
            document.getElementById('brandAboutInput').value = profile.about || '';
            document.getElementById('ownerNameInput').value = profile.owner_name || '';
            document.getElementById('ownerLinkedinInput').value = profile.owner_linkedin || '';
            document.getElementById('ownerInstagramInput').value = profile.owner_instagram || '';
            document.getElementById('brandInstagramInput').value = profile.instagram || '';
            document.getElementById('brandFacebookInput').value = profile.facebook || '';
            document.getElementById('brandTwitterInput').value = profile.twitter || '';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// Load brand campaigns
async function loadBrandCampaigns() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/campaign`);
        const allCampaigns = await response.json();
        
        // Filter campaigns for this brand
        const brandCampaigns = allCampaigns.filter(c => c.brand_id == brandId);

        const campaignsListBrand = document.getElementById('campaignsListBrand');
        campaignsListBrand.innerHTML = '';

        if (brandCampaigns.length === 0) {
            campaignsListBrand.innerHTML = '<p>No campaigns created yet. <a href="#" onclick="switchTab(\'create-campaign\', event)">Create your first campaign</a></p>';
            return;
        }

        brandCampaigns.forEach(campaign => {
            const campaignItem = document.createElement('div');
            campaignItem.className = 'campaign-item';
            campaignItem.innerHTML = `
                <div class="campaign-info">
                    <h3>${campaign.field}</h3>
                    <p>💰 Payout: $${campaign.payout}</p>
                    <p>⏱️ Duration: ${campaign.duration}</p>
                    <p>${campaign.overview}</p>
                    <p><strong>Status:</strong> <span class="badge badge-primary">${campaign.status}</span></p>
                </div>
                <div class="campaign-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewApplicants(${campaign.id})">View Applicants</button>
                </div>
            `;
            campaignsListBrand.appendChild(campaignItem);
        });
    } catch (error) {
        console.error('Error loading campaigns:', error);
    }
}

// View applicants for a campaign
async function viewApplicants(campaignId) {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/campaign/${campaignId}/applicants`);
        const applicants = await response.json();

        const applicantsList = document.getElementById('applicantsList');
        applicantsList.innerHTML = '';

        if (applicants.length === 0) {
            applicantsList.innerHTML = '<p>No applicants yet.</p>';
        } else {
            applicants.forEach(applicant => {
                const statusClass = `status-${applicant.status}`;
                const applicantDiv = document.createElement('div');
                applicantDiv.className = 'applicant-card';
                applicantDiv.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb;">
                        <div>
                            <h3>${applicant.name}</h3>
                            <p>💰 ${applicant.hourly_rate}$/hour | ⭐ ${applicant.rating || 0} | 📊 ${applicant.experience}</p>
                        </div>
                        <div>
                            <span class="status-badge ${statusClass}">${applicant.status.toUpperCase()}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-sm btn-success" onclick="updateApplicationStatus(${applicant.id}, 'accepted')">Accept</button>
                        <button class="btn btn-sm btn-danger" onclick="updateApplicationStatus(${applicant.id}, 'rejected')">Reject</button>
                        <button class="btn btn-sm btn-primary" onclick="viewInfluencerProfile(${applicant.influencer_id})">View Profile</button>
                    </div>
                `;
                applicantsList.appendChild(applicantDiv);
            });
        }

        document.getElementById('applicantsModal').style.display = 'flex';
    } catch (error) {
        console.error('Error loading applicants:', error);
        showNotification('Error loading applicants', 'error');
    }
}

// Update application status
async function updateApplicationStatus(appId, status) {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/campaign/application/${appId}`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(`Application ${status}!`);
            // Reload applicants
            document.getElementById('applicantsModal').style.display = 'none';
            loadBrandCampaigns();
        } else {
            showNotification(data.message || 'Error updating status', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error updating status', 'error');
    }
}

// Close modal
function closeApplicantsModal() {
    document.getElementById('applicantsModal').style.display = 'none';
}

// Load influencers
async function loadInfluencers() {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/campaign/influencers`);
        const influencers = await response.json();

        const influencersList = document.getElementById('influencersList');
        influencersList.innerHTML = '';

        if (influencers.length === 0) {
            influencersList.innerHTML = '<p>No influencers available.</p>';
            return;
        }

        influencers.forEach(influencer => {
            const influencerItem = document.createElement('div');
            influencerItem.className = 'campaign-item';
            influencerItem.innerHTML = `
                <div class="campaign-info">
                    <h3>${influencer.name}</h3>
                    <p>💰 ${influencer.hourly_rate}$/hour | ⭐ ${influencer.rating || 0}</p>
                    <p>📊 ${influencer.experience || 'No experience listed'}</p>
                    <p>${influencer.about || 'No bio available'}</p>
                </div>
                <div class="campaign-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewInfluencerProfile(${influencer.id})">View Profile</button>
                </div>
            `;
            influencersList.appendChild(influencerItem);
        });
    } catch (error) {
        console.error('Error loading influencers:', error);
    }
}

// View influencer profile
function viewInfluencerProfile(influencerId) {
    // Could open a modal or navigate to profile page
    console.log('View profile:', influencerId);
    showNotification('Feature coming soon');
}

// Handle brand profile update
document.getElementById('brandProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const profileData = {
        brand_name: document.getElementById('brandNameInput').value,
        email: document.getElementById('brandEmailInput').value,
        contact: document.getElementById('brandContactInput').value,
        about: document.getElementById('brandAboutInput').value,
        owner_name: document.getElementById('ownerNameInput').value,
        owner_linkedin: document.getElementById('ownerLinkedinInput').value,
        owner_instagram: document.getElementById('ownerInstagramInput').value,
        instagram: document.getElementById('brandInstagramInput').value,
        facebook: document.getElementById('brandFacebookInput').value,
        twitter: document.getElementById('brandTwitterInput').value
    };

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/brand/profile/${brandId}`, {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Brand profile updated successfully!');
        } else {
            showNotification(data.message || 'Error updating profile', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error updating profile', 'error');
    }
});

// Handle campaign creation
document.getElementById('createCampaignForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const campaignData = {
        brand_id: brandId,
        field: document.getElementById('campaignField').value,
        duration: document.getElementById('campaignDuration').value,
        payout: document.getElementById('campaignPayout').value,
        work_details: document.getElementById('campaignWorkDetails').value,
        overview: document.getElementById('campaignOverview').value
    };

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/campaign`, {
            method: 'POST',
            body: JSON.stringify(campaignData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Campaign created successfully!');
            document.getElementById('createCampaignForm').reset();
            // Switch to campaigns tab
            const link = document.querySelector('[onclick*="campaigns"]');
            if (link) link.click();
        } else {
            showNotification(data.message || 'Error creating campaign', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error creating campaign', 'error');
    }
});

// Logout
function logout() {
    clearAuthData();
    window.location.href = '../index.html';
}

// Load initial data
loadBrandProfile();

// Add modal styles
const modalStyle = document.createElement('style');
modalStyle.textContent = `
    .modal {
        display: none;
        position: fixed;
        z-index: 999;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        align-items: center;
        justify-content: center;
    }

    .modal-content {
        background-color: #ffffff;
        padding: 2rem;
        border-radius: 12px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: var(--shadow-lg);
    }

    .close {
        color: var(--text-light);
        float: right;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
    }

    .close:hover {
        color: var(--text-dark);
    }

    .applicant-card {
        background: var(--light);
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
    }

    .work-project-card {
        background: white;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: all 0.3s ease;
    }

    .work-project-card:hover {
        box-shadow: var(--shadow);
        transform: translateY(-2px);
    }

    .project-details {
        flex: 1;
    }

    .project-details h3 {
        margin: 0.5rem 0;
        color: var(--primary-color);
    }

    .project-meta {
        display: flex;
        gap: 1.5rem;
        margin: 0.5rem 0;
        font-size: 0.9rem;
        color: var(--text-light);
    }

    .progress-bar {
        width: 100%;
        height: 6px;
        background: var(--border-color);
        border-radius: 3px;
        margin: 0.5rem 0;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
        transition: width 0.3s ease;
    }

    .project-actions {
        display: flex;
        gap: 0.5rem;
    }

    .project-actions button {
        padding: 0.5rem 1rem;
        font-size: 0.85rem;
        white-space: nowrap;
    }

    .rating-stars {
        display: flex;
        gap: 0.5rem;
        margin: 1rem 0;
    }

    .star {
        font-size: 2rem;
        cursor: pointer;
        color: #ddd;
        transition: color 0.2s ease;
    }

    .star.active {
        color: #fbbf24;
    }

    .star:hover {
        color: #fbbf24;
    }

    .updates-list {
        max-height: 400px;
        overflow-y: auto;
    }

    .update-item {
        background: var(--light);
        padding: 1rem;
        border-left: 3px solid var(--primary-color);
        margin-bottom: 1rem;
        border-radius: 4px;
    }

    .update-item p {
        margin: 0.5rem 0;
    }

    .update-date {
        font-size: 0.85rem;
        color: var(--text-light);
    }
`;
document.head.appendChild(modalStyle);

// ======================== WORK PROJECT FUNCTIONS ========================

// Load ongoing work projects for brand
async function loadWorkingProjects() {
    try {
        // Fetch ongoing work projects
        const workResponse = await fetchWithAuth(`${API_BASE_URL}/work/brand/${brandId}/ongoing`);
        const projects = await workResponse.json();

        // Fetch payment history for this brand
        const paymentResponse = await fetchWithAuth(`${API_BASE_URL}/payment/brand/${brandId}/payments`);
        const payments = await paymentResponse.json();
        
        const paymentMap = {};
        if (payments.success && Array.isArray(payments.payments)) {
            payments.payments.forEach(p => {
                paymentMap[p.work_project_id] = p;
            });
        }

        const workingList = document.getElementById('workingProjectsList');
        workingList.innerHTML = '';

        if (!Array.isArray(projects) || projects.length === 0) {
            workingList.innerHTML = '<p>No ongoing work projects. Accept influencer applications to start projects.</p>';
            return;
        }

        projects.forEach(project => {
            const projectCard = document.createElement('div');
            projectCard.className = 'work-project-card';
            
            const startDate = new Date(project.started_at).toLocaleDateString();
            const payment = paymentMap[project.id];
            
            let paymentStatusBadge = '';
            let paymentActions = '';

            if (!payment) {
                // Payment not yet made - show payment button
                paymentStatusBadge = '<span class="status-badge pending">💳 Payment Pending</span>';
                paymentActions = `<button class="btn btn-primary btn-sm" onclick="openPaymentModal(${project.id}, ${project.influencer_id}, '${project.influencer_name}', '${project.campaign_field}', 0)">💳 Process Payment</button>`;
            } else {
                // Payment made - show status
                const statusColors = {
                    'in_admin_wallet': 'warning',
                    'disputed': 'danger',
                    'refunded': 'danger',
                    'credited': 'success'
                };
                const statusColor = statusColors[payment.status] || 'info';
                const statusText = {
                    'in_admin_wallet': 'Held in Admin Wallet',
                    'disputed': 'Disputed - Awaiting Resolution',
                    'refunded': 'Refunded to You',
                    'credited': 'Credited to Influencer'
                };
                paymentStatusBadge = `<span class="status-badge ${statusColor}">💳 ${statusText[payment.status]}</span>`;

                if (payment.status === 'in_admin_wallet') {
                    paymentActions = `
                        <button class="btn btn-success btn-sm" onclick="markWorkDoneAndReleasePayment(${project.id}, ${payment.id})">✓ Mark Done & Release Payment</button>
                        <button class="btn btn-danger btn-sm" onclick="openDisputeModal(${project.id}, ${payment.id}, ${project.influencer_id}, '${project.influencer_name}')">⚠️ Work Not Done</button>
                    `;
                } else if (payment.status === 'disputed') {
                    paymentActions = `
                        <button class="btn btn-warning btn-sm" onclick="openDisputeModal(${project.id}, ${payment.id}, ${project.influencer_id}, '${project.influencer_name}')">⚠️ Review Dispute</button>
                    `;
                } else if (payment.status === 'credited') {
                    paymentActions = `<button class="btn btn-secondary btn-sm disabled">✓ Payment Released</button>`;
                }
            }
            
            projectCard.innerHTML = `
                <div class="project-details">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <img src="${project.photo_url || 'https://via.placeholder.com/50'}" alt="${project.influencer_name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
                        <div>
                            <h3>${project.campaign_field}</h3>
                            <p><strong>With:</strong> ${project.influencer_name} ⭐ ${project.influencer_rating || 'N/A'}</p>
                            ${paymentStatusBadge}
                        </div>
                    </div>
                    <div class="project-meta">
                        <span>Started: ${startDate}</span>
                        <span>Updates: ${project.total_updates || 0}</span>
                        <span>Status: <strong>${project.status.toUpperCase()}</strong></span>
                    </div>
                </div>
                <div class="project-actions">
                    <button class="btn btn-secondary btn-sm" onclick="viewProjectUpdates(${project.id})">View Updates</button>
                    ${paymentActions}
                    <button class="btn btn-warning btn-sm" onclick="openRatingModal(${project.id}, ${project.influencer_id}, '${project.influencer_name}')">Rate Work</button>
                </div>
            `;
            workingList.appendChild(projectCard);
        });
    } catch (error) {
        console.error('Error loading work projects:', error);
        showNotification('Error loading work projects', 'error');
    }
}

// View project updates (modal)
async function viewProjectUpdates(workProjectId) {
    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/work/updates/project/${workProjectId}`);
        const updates = await response.json();

        const updatesList = document.getElementById('updatesList');
        updatesList.innerHTML = '';

        if (!Array.isArray(updates) || updates.length === 0) {
            updatesList.innerHTML = '<p>No updates yet. Waiting for influencer to share progress updates.</p>';
        } else {
            updates.forEach(update => {
                const updateItem = document.createElement('div');
                updateItem.className = 'update-item';
                
                const updateDate = new Date(update.created_at).toLocaleString();
                
                updateItem.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <img src="${update.photo_url || 'https://via.placeholder.com/30'}" alt="${update.influencer_name}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">
                        <strong>${update.influencer_name}</strong>
                    </div>
                    <p>${update.update_description}</p>
                    <p>Progress: <strong>${update.progress_percentage}%</strong></p>
                    <p class="update-date">${updateDate}</p>
                `;
                updatesList.appendChild(updateItem);
            });
        }

        document.getElementById('updatesModal').style.display = 'block';
    } catch (error) {
        console.error('Error fetching updates:', error);
        showNotification('Error loading updates', 'error');
    }
}

// Close updates modal
function closeUpdatesModal() {
    document.getElementById('updatesModal').style.display = 'none';
}

// Global variable to store work project details for rating
let currentRatingData = {};

// Open rating modal
function openRatingModal(workProjectId, influencerId, influencerName) {
    currentRatingData = {
        workProjectId: workProjectId,
        influencerId: influencerId,
        influencerName: influencerName
    };
    
    // Reset form
    document.getElementById('selectedRating').value = '0';
    document.getElementById('reviewText').value = '';
    document.querySelectorAll('.star').forEach(star => star.classList.remove('active'));
    
    document.getElementById('ratingModal').style.display = 'block';
}

// Close rating modal
function closeRatingModal() {
    document.getElementById('ratingModal').style.display = 'none';
}

// Set rating (star selection)
function setRating(rating) {
    document.getElementById('selectedRating').value = rating;
    
    // Update star display
    document.querySelectorAll('.star').forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// Submit rating
document.getElementById('ratingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rating = parseFloat(document.getElementById('selectedRating').value);
    const reviewText = document.getElementById('reviewText').value.trim();

    if (rating === 0 || rating < 1 || rating > 5) {
        showNotification('Please select a rating', 'error');
        return;
    }

    if (!reviewText) {
        showNotification('Please write a review', 'error');
        return;
    }

    try {
        const response = await fetchWithAuth(`${API_BASE_URL}/work/rate`, {
            method: 'POST',
            body: JSON.stringify({
                workProjectId: currentRatingData.workProjectId,
                brandId: brandId,
                influencerId: currentRatingData.influencerId,
                rating: rating,
                reviewText: reviewText
            })
        });

        if (response.ok) {
            showNotification('Rating submitted successfully!', 'success');
            closeRatingModal();
            loadWorkingProjects();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to submit rating', 'error');
        }
    } catch (error) {
        console.error('Error submitting rating:', error);
        showNotification('Error submitting rating', 'error');
    }
});

// Update switchTab to include titles and loading for working tab
const originalSwitchTab = switchTab;
switchTab = function(tabName, event) {
    originalSwitchTab(tabName, event);
    
    if (tabName === 'working') {
        loadWorkingProjects();
    }
};

// ==================== PAYMENT SYSTEM ====================

let currentPaymentContext = {
    workProjectId: null,
    paymentId: null,
    influencerId: null,
    amount: null
};

let currentDisputeContext = {
    workProjectId: null,
    paymentId: null,
    influencerId: null
};

// Open Payment Modal (brand pays for hiring)
function openPaymentModal(workProjectId, influencerId, influencerName, campaignField, amount) {
    currentPaymentContext = {
        workProjectId: workProjectId,
        influencerId: influencerId,
        amount: amount
    };

    document.getElementById('paymentInfluencerName').textContent = influencerName;
    document.getElementById('paymentCampaignField').textContent = campaignField;
    document.getElementById('paymentAmount').textContent = `₹${parseFloat(amount).toFixed(2)}`;
    document.getElementById('paymentModal').style.display = 'block';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
    document.getElementById('paymentForm').reset();
    document.getElementById('agreePayment').checked = false;
}

// Submit Payment
document.getElementById('paymentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const { workProjectId, influencerId, amount } = currentPaymentContext;

    try {
        const response = await fetch('/api/payment/process-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workProjectId: workProjectId,
                brandId: brandId,
                influencerId: influencerId,
                amount: parseFloat(amount)
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('✓ Payment processed successfully! Amount is now held in admin wallet.');
            currentPaymentContext.paymentId = data.payment_id;
            closePaymentModal();
            loadWorkingProjects();
        } else {
            alert('Error: ' + (data.message || 'Payment processing failed'));
        }
    } catch (error) {
        console.error('Payment error:', error);
        alert('Error processing payment');
    }
});

// Mark Work as Done and Release Payment
async function markWorkDoneAndReleasePayment(workProjectId, paymentId) {
    if (!confirm('Mark this work as done and release payment to influencer?')) {
        return;
    }

    try {
        const response = await fetch('/api/payment/credit-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workProjectId: workProjectId,
                paymentId: paymentId,
                influencerId: currentPaymentContext.influencerId,
                brandId: brandId
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(`✓ Payment released! ₹${data.payment_amount} credited to influencer's account`);
            loadWorkingProjects();
        } else {
            alert('Error: ' + (data.message || 'Failed to release payment'));
        }
    } catch (error) {
        console.error('Release payment error:', error);
        alert('Error releasing payment');
    }
}

// Open Dispute Modal (brand says work not done)
async function openDisputeModal(workProjectId, paymentId, influencerId, influencerName) {
    currentDisputeContext = {
        workProjectId: workProjectId,
        paymentId: paymentId,
        influencerId: influencerId
    };

    document.getElementById('disputeInfluencerName').textContent = influencerName;

    // Check if dispute already exists
    try {
        const response = await fetch(`/api/payment/dispute/${workProjectId}`);
        const data = await response.json();

        if (data.success && data.dispute) {
            const dispute = data.dispute;
            document.getElementById('disputeNote').style.display = 'block';
            
            if (dispute.brand_says_complete !== null && dispute.influencer_says_complete !== null) {
                if (dispute.brand_says_complete && dispute.influencer_says_complete) {
                    document.getElementById('disputeNoteText').textContent = 'Both parties confirmed work is complete. Payment is credited to influencer.';
                } else if (!dispute.brand_says_complete && !dispute.influencer_says_complete) {
                    document.getElementById('disputeNoteText').textContent = 'Both parties confirmed work is NOT complete. Payment will be refunded to brand.';
                } else {
                    document.getElementById('disputeNoteText').textContent = 'Waiting for both parties to confirm work status...';
                }
            }
        }
    } catch (error) {
        console.error('Fetch dispute error:', error);
    }

    document.getElementById('disputeModal').style.display = 'block';
}

function closeDisputeModal() {
    document.getElementById('disputeModal').style.display = 'none';
}

// Respond to Work Dispute
async function respondToDispute(isComplete) {
    const { workProjectId } = currentDisputeContext;

    try {
        const response = await fetch('/api/payment/dispute/respond', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workProjectId: workProjectId,
                respondedBy: 'brand',
                isComplete: isComplete
            })
        });

        const data = await response.json();

        if (data.success) {
            if (data.resolution === 'credited') {
                alert('✓ Both parties confirmed work is complete. Payment credited to influencer.');
            } else if (data.resolution === 'refunded') {
                alert('✓ Both parties confirmed work is not complete. Payment refunded to your account.');
            } else {
                alert('✓ Your response recorded. Waiting for influencer to respond...');
            }
            closeDisputeModal();
            loadWorkingProjects();
        } else {
            alert('Error: ' + (data.message || 'Failed to record response'));
        }
    } catch (error) {
        console.error('Dispute response error:', error);
        alert('Error recording dispute response');
    }
}

// Helper function to close payment modal
function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
    document.getElementById('paymentForm').reset();
}
