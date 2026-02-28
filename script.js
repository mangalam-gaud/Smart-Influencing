// API Base URL (only set default if not already provided by config)
window.API_BASE_URL = window.API_BASE_URL || 'http://localhost:3000/api';
var API_BASE_URL = window.API_BASE_URL;

// Smooth scroll function
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Contact Form Handler
document.getElementById('contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const name = e.target[0].value;
    const email = e.target[1].value;
    const message = e.target[2].value;

    try {
        const response = await fetch(`${API_BASE_URL}/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, message })
        });

        const data = await response.json();
        const messageDiv = document.getElementById('formMessage');

        if (response.ok) {
            messageDiv.classList.add('success');
            messageDiv.classList.remove('error');
            messageDiv.textContent = 'Message sent successfully!';
            e.target.reset();
        } else {
            messageDiv.classList.add('error');
            messageDiv.classList.remove('success');
            messageDiv.textContent = data.message || 'Error sending message';
        }

        messageDiv.style.display = 'block';
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    } catch (error) {
        console.error('Error:', error);
        const messageDiv = document.getElementById('formMessage');
        messageDiv.classList.add('error');
        messageDiv.classList.remove('success');
        messageDiv.textContent = 'Error connecting to server';
        messageDiv.style.display = 'block';
    }
});

// Load navbar links
document.querySelectorAll('.nav-links a:not(.btn-login)').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href.startsWith('#')) {
            e.preventDefault();
            scrollToSection(href.substring(1));
        }
    });
});
