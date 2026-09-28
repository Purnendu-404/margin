const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function setAuthCookie(res, userId) {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, cookieOptions);
}

router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password || password.length < 6) {
            return res.status(400).json({ error: 'Email and a password of at least 6 characters are required' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ email, passwordHash });

        setAuthCookie(res, user._id);
        res.status(201).json({ user: { id: user._id, email: user.email } });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        console.error(err);
        res.status(500).json({ error: 'Signup failed' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email?.toLowerCase().trim() });
        const valid = user && (await bcrypt.compare(password || '', user.passwordHash));

        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        setAuthCookie(res, user._id);
        res.json({ user: { id: user._id, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('token', { ...cookieOptions, maxAge: undefined });
    res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, async (req, res) => {
    const user = await User.findById(req.userId).select('email');
    if (!user) {
        return res.status(401).json({ error: 'User not found' });
    }
    res.json({ user: { id: user._id, email: user.email } });
});

module.exports = router;