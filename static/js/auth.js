// Login handling
document.getElementById('loginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            password: password
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            window.location.href = '/todos';
        } else {
            errorMessage.textContent = data.message || 'Login failed. Please try again.';
            errorMessage.style.display = 'block';
            document.getElementById('password').value = '';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        errorMessage.textContent = 'An error occurred. Please try again.';
        errorMessage.style.display = 'block';
    });
});

// Signup form handling
document.getElementById('signupForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Get form values
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Client-side validation
    const errorElement = document.getElementById('error');
    
    // Check for empty fields
    if (!firstName || !lastName || !username || !password || !confirmPassword) {
        showError('All fields are required');
        return;
    }
    
    // Check password match
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        return;
    }
    
    // Check password length
    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        return;
    }
    
    // Submit the form
    fetch('/signup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            firstName,
            lastName,
            username,
            password,
            confirmPassword
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            window.location.href = '/todos';
        } else {
            showError(data.message || 'Signup failed. Please try again.');
            clearForm();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showError('An error occurred. Please try again.');
    });
});

// Helper functions
function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.style.display = 'block';
    errorElement.textContent = message;
}

function clearForm() {
    document.getElementById('firstName').value = '';
    document.getElementById('lastName').value = '';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('confirmPassword').value = '';
}
