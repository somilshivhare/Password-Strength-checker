const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Password databases
let breachedPasswords = new Set();
let commonPasswords = new Set();

// Load password files
async function loadPasswordFiles() {
    try {
        console.log('Loading password databases...');
        
        // Load breached passwords
        const breachedData = await fs.readFile(path.join(__dirname, 'breachpassword.txt'), 'utf8');
        const breachedLines = breachedData.split('\n');
        breachedLines.forEach(password => {
            const cleanPassword = password.trim().toLowerCase();
            if (cleanPassword) {
                breachedPasswords.add(cleanPassword);
            }
        });
        console.log(`Loaded ${breachedPasswords.size} breached passwords`);
        
        // Load common passwords
        try {
            const commonData = await fs.readFile(path.join(__dirname, 'commonpassword_manageable.txt'), 'utf8');
            const commonLines = commonData.split('\n');
            commonLines.forEach(password => {
                const cleanPassword = password.trim().toLowerCase();
                if (cleanPassword) {
                    commonPasswords.add(cleanPassword);
                }
            });
            console.log(`Loaded ${commonPasswords.size} common passwords`);
        } catch (error) {
            console.log('Using dictionary.txt as fallback for common passwords');
            const dictData = await fs.readFile(path.join(__dirname, 'dictionary.txt'), 'utf8');
            const dictLines = dictData.split('\n');
            dictLines.forEach(password => {
                const cleanPassword = password.trim().toLowerCase();
                if (cleanPassword) {
                    commonPasswords.add(cleanPassword);
                }
            });
            console.log(`Loaded ${commonPasswords.size} dictionary passwords`);
        }
        
    } catch (error) {
        console.error('Error loading password files:', error);
        breachedPasswords = new Set();
        commonPasswords = new Set();
    }
}

// Check if email is valid
function isValidEmail(email) {
    const emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email);
}

// Check password strength
function checkPasswordStrength(password) {
    // Convert password to lowercase for checking
    const passwordLower = password.toLowerCase();
    
    // Check each requirement
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(password),
        notBreached: !breachedPasswords.has(passwordLower),
        notCommon: !commonPasswords.has(passwordLower)
    };
    
    // Count how many requirements are met
    let score = 0;
    for (let requirement in requirements) {
        if (requirements[requirement]) {
            score++;
        }
    }

    // If password is too short, force very weak and score 0
    if (!requirements.length) {
        score = 0;
    }
    
    // Check for repeated characters
    let hasRepeatedChars = false;
    for (let i = 0; i < password.length - 2; i++) {
        if (password[i] === password[i + 1] && password[i] === password[i + 2]) {
            hasRepeatedChars = true;
            break;
        }
    }
    
    // Reduce score if repeated characters found
    if (hasRepeatedChars) {
        score--;
    }
    
    // Determine strength level
    let strengthLevel;
    if (!requirements.notBreached) {
        strengthLevel = 'Breached Password';
        score = 0;
    } else if (!requirements.notCommon) {
        strengthLevel = 'Common Password';
        score = 0;
    } else if (!requirements.length) {
        strengthLevel = 'Very Weak';
        score = 0;
    } else if (score <= 2) {
        strengthLevel = 'Very Weak';
    } else if (score <= 4) {
        strengthLevel = 'Weak';
    } else if (score <= 6) {
        strengthLevel = 'Medium';
    } else {
        strengthLevel = 'Strong';
    }
    
    return {
        score: score,
        level: strengthLevel,
        rules: requirements,
        hasRepeatedChars: hasRepeatedChars
    };
}

// API endpoint to validate credentials
app.post('/api/validate-credentials', (req, res) => {
    const { email, password } = req.body;
    
    // Check if both email and password are provided
    if (!email || !password) {
        return res.status(400).json({ 
            error: 'Email and password are required' 
        });
    }
    
    // Validate email
    const emailValid = isValidEmail(email);
    const emailMessage = emailValid ? '' : 'Please enter a valid email address';
    
    // Check password strength
    const passwordResult = checkPasswordStrength(password);
    
    // Send response
    res.json({
        email: {
            isValid: emailValid,
            message: emailMessage
        },
        password: passwordResult
    });
});



// Start server
async function startServer() {
    await loadPasswordFiles();
    app.listen(PORT, () => {
        console.log(`Password Strength Checker running on http://localhost:${PORT}`);
        console.log('Ready to check passwords!');
    });
}

startServer();