// Get all the HTML elements we need
const emailInput = document.getElementById('email');
const emailError = document.getElementById('emailError');
const passwordInput = document.getElementById('password');
const passwordError = document.getElementById('passwordError');
const togglePassword = document.getElementById('togglePassword');
const passwordRules = document.getElementById('passwordRules');
const strengthMeter = document.getElementById('strengthMeter');
const strengthText = document.getElementById('strengthText');
const form = document.getElementById('passwordForm');

// Get all the rule elements
const ruleElements = {
    length: document.getElementById('lengthRule'),
    uppercase: document.getElementById('uppercaseRule'),
    lowercase: document.getElementById('lowercaseRule'),
    number: document.getElementById('numberRule'),
    special: document.getElementById('specialRule'),
    notBreached: document.getElementById('notBreachedRule'),
    notCommon: document.getElementById('notCommonRule')
};

// Password databases
let breachedPasswords = new Set();
let commonPasswords = new Set();

// Load password databases from text files
async function loadPasswordDatabases() {
    try {
        // Load breached passwords
        const breachedResponse = await fetch('breachpassword.txt');
        const breachedText = await breachedResponse.text();
        const breachedLines = breachedText.split('\n');
        breachedLines.forEach(password => {
            const cleanPassword = password.trim().toLowerCase();
            if (cleanPassword) {
                breachedPasswords.add(cleanPassword);
            }
        });
        console.log(`Loaded ${breachedPasswords.size} breached passwords`);

        // Load common passwords
        const commonResponse = await fetch('commonpassword_manageable.txt');
        const commonText = await commonResponse.text();
        const commonLines = commonText.split('\n');
        commonLines.forEach(password => {
            const cleanPassword = password.trim().toLowerCase();
            if (cleanPassword) {
                commonPasswords.add(cleanPassword);
            }
        });
        console.log(`Loaded ${commonPasswords.size} common passwords`);
    } catch (error) {
        console.error('Error loading password databases:', error);
    }
}

// Load databases when page loads
loadPasswordDatabases();

// Toggle password visibility
togglePassword.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        togglePassword.classList.remove('fa-eye');
        togglePassword.classList.add('fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        togglePassword.classList.remove('fa-eye-slash');
        togglePassword.classList.add('fa-eye');
    }
});

// Show password rules when user clicks on password field
passwordInput.addEventListener('focus', () => {
    passwordRules.classList.add('show');
});

// Hide password rules when user clicks elsewhere
passwordInput.addEventListener('blur', (e) => {
    if (!e.relatedTarget || !e.relatedTarget.closest('.password-rules')) {
        passwordRules.classList.remove('show');
    }
});

// Function to check password strength locally
function checkPasswordStrength(password) {
    const rules = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
        notBreached: !breachedPasswords.has(password.toLowerCase()),
        notCommon: !commonPasswords.has(password.toLowerCase())
    };

    let score = Object.values(rules).filter(Boolean).length;
    const repeatedChars = /(.)\1{2,}/.test(password); // Check for 3+ repeated chars
    if (repeatedChars) score--;

    let level;
    if (!rules.notBreached) {
        level = "Breached Password";
        score = 0;
    } else if (!rules.notCommon) {
        level = "Common Password";
        score = 0;
    } else if (score <= 2) {
        level = "Very Weak";
    } else if (score <= 4) {
        level = "Weak";
    } else if (score <= 6) {
        level = "Medium";
    } else {
        level = "Strong";
    }

    return {
        score,
        level,
        rules,
        hasRepeatedChars: repeatedChars
    };
}

// Function to update the UI with validation results
function updateUI(validationResult) {
    if (!validationResult) return;

    // Email validation (basic format check)
    const email = emailInput.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email)) {
        emailError.textContent = '';
        emailInput.classList.remove('invalid');
    } else if (email) {
        emailError.textContent = 'Please enter a valid email address.';
        emailInput.classList.add('invalid');
    } else {
        emailError.textContent = '';
        emailInput.classList.remove('invalid');
    }

    const passwordResult = checkPasswordStrength(passwordInput.value);

    // Update password error message
    let passwordErrorMsg = '';
    if (passwordResult.level === 'Breached Password') {
        passwordErrorMsg = 'This password has been found in data breaches. Please choose a different password.';
    } else if (passwordResult.level === 'Common Password') {
        passwordErrorMsg = 'This is a commonly used password. Please choose a more unique password.';
    }
    passwordError.textContent = passwordErrorMsg;
    
    if (passwordErrorMsg !== '') {
        passwordInput.classList.add('invalid');
    } else {
        passwordInput.classList.remove('invalid');
    }

    // Update strength meter
    strengthMeter.className = 'meter-bar';
    if (passwordResult.score > 0) {
        const levelClass = passwordResult.level.toLowerCase().replace(' ', '-');
        strengthMeter.classList.add(levelClass);
    }
    strengthText.querySelector('span').textContent = `${passwordResult.level} (${passwordResult.score}/7)`; // Update score

    // Update rule indicators
    for (const [rule, element] of Object.entries(ruleElements)) {
        if (passwordResult.rules[rule]) {
            element.classList.add('valid');
        } else {
            element.classList.remove('valid');
        }
    }
}


// Function to reset UI when inputs are empty
function resetUI() {
    emailError.textContent = '';
    emailInput.classList.remove('invalid');
    passwordError.textContent = '';
    passwordInput.classList.remove('invalid');

    strengthMeter.className = 'meter-bar';
    strengthText.querySelector('span').textContent = 'None';
    
    for (const element of Object.values(ruleElements)) {
        element.classList.remove('valid');
    }
}

// Check password strength when user types (with delay)
let typingTimer;

function debounceCheck() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
        if (passwordInput.value) {
            const validationResult = {}; // Empty object for UI consistency
            updateUI(validationResult);
        } else {
            resetUI();
        }
    }, 300); // Wait 300ms after user stops typing
}

// Add event listeners for real-time checking
passwordInput.addEventListener('input', debounceCheck);
    
// Handle form submission
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
        alert('Please enter both email and password!');
        updateUI({});  // Trigger UI update with no validation
        return;
    }

    const validationResult = {}; // Empty object as we do client-side only
    updateUI(validationResult);

    if (emailError.textContent !== "" || passwordError.textContent !== "") {
    }

    if (!validationResult.email.isValid) {
        alert('Please enter a valid email address!');
        return;
    }

    const passwordResult = checkPasswordStrength(passwordInput.value);

    if (passwordResult.score < 3 || passwordResult.level.includes('Password')) {
        alert('Password is too short. It must be at least 8 characters.');
    }
    if (validationResult.password.score < 3 || 
        validationResult.password.level.includes('Password')) {
        alert('Please fix the password issues before submitting!');
        return;
    }

    // Show success message
    alert('Password is strong! Form submitted successfully.');
    
    // Reset form and UI
            form.reset();
    resetUI();
});