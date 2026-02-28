// Toggle between login and register forms
function toggleAuthForm(e) {
    e.preventDefault();
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const heading = document.querySelector('.auth-box h2');
    const toggle = document.querySelector('.auth-toggle p');

    if (loginForm.style.display === 'block') {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        heading.textContent = 'Create Brand Account';
        toggle.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthForm(event)">Sign In</a>';
    } else {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        heading.textContent = 'Brand Login';
        toggle.innerHTML = "Don't have an account? <a href=\"#\" onclick=\"toggleAuthForm(event)\">Sign Up</a>";
    }
}

// Handle Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const button = e.target.querySelector('button');

    button.disabled = true;
    button.textContent = 'Signing in...';

    try {
        const result = await apiCall('brand', 'login', { email, password });

        if (result && result.success) {
            const d = result.data || {};
            storeAuthData(d.token, d.id || d.brandId, 'brand', d.brand_name || d.email);
            showNotification('Login successful!');
            setTimeout(() => {
                window.location.href = 'brand-dashboard.html';
            }, 500);
        } else {
            showNotification((result && result.message) || 'Login failed', 'error');
            button.disabled = false;
            button.textContent = 'Sign In';
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Connection error. Please try again.', 'error');
        button.disabled = false;
        button.textContent = 'Sign In';
    }
});

// Handle Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const brand_name = document.getElementById('regBrandName').value;
    const email = document.getElementById('regEmail').value;
    const contact = document.getElementById('regContact').value;
    const password = document.getElementById('regPassword').value;
    const button = e.target.querySelector('button');

    button.disabled = true;
    button.textContent = 'Creating account...';

    try {
        const result = await apiCall('brand', 'register', { brand_name, email, contact, password });

        if (result && result.success) {
            const d = result.data || {};
            storeAuthData(d.token, d.id || d.brandId, 'brand', brand_name);
            showNotification('Account created successfully!');
            setTimeout(() => {
                window.location.href = 'brand-dashboard.html';
            }, 500);
        } else {
            showNotification((result && result.message) || 'Registration failed', 'error');
            button.disabled = false;
            button.textContent = 'Create Account';
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Connection error. Please try again.', 'error');
        button.disabled = false;
        button.textContent = 'Create Account';
    }
});
