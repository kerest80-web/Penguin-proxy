// Updated api/chat.js to accept multiple body formats, dynamic preflight headers, and safe logging

const express = require('express');
const router = express.Router();

// Middleware to handle different body formats
router.use(express.json()); // for json
router.use(express.urlencoded({ extended: true })); // for urlencoded

// Middleware for dynamic preflight headers
router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Safe logging
const safeLog = (message) => {
    console.log(new Date().toISOString() + ': ' + message);
};

router.post('/chat', (req, res) => {
    safeLog('Received chat request: ' + JSON.stringify(req.body));
    // Your existing handling logic here
});

module.exports = router;