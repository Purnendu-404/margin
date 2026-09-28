const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const cookieOptions = {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
};

function setAuthCookie(res, userId) {
    const token = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        {
            expiresIn: '7d'
        }
    );

    res.cookie('token', token, cookieOptions);
}


// =========================
// SIGNUP
// =========================

router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password || password.length < 6) {
            return res.status(400).json({
                error: 'Email and a password of at least 6 characters are required'
            });
        }

        const normalizedEmail = email
            .toLowerCase()
            .trim();

        const passwordHash = await bcrypt.hash(
            password,
            10
        );

        const user = await User.create({
            email: normalizedEmail,
            passwordHash
        });

        setAuthCookie(
            res,
            user._id.toString()
        );

        return res.status(201).json({
            user: {
                id: user._id,
                email: user.email
            }
        });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({
                error: 'Email already registered'
            });
        }

        console.error('Signup error:', err);

        return res.status(500).json({
            error: 'Signup failed'
        });
    }
});


// =========================
// LOGIN
// =========================

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        const normalizedEmail = email
            .toLowerCase()
            .trim();

        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!validPassword) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        setAuthCookie(
            res,
            user._id.toString()
        );

        return res.json({
            user: {
                id: user._id,
                email: user.email
            }
        });

    } catch (err) {
        console.error('Login error:', err);

        return res.status(500).json({
            error: 'Login failed'
        });
    }
});


// =========================
// LOGOUT
// =========================

router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'none',
        secure: true
    });

    return res.json({
        message: 'Logged out'
    });
});


// =========================
// CURRENT USER
// =========================

router.get('/me', requireAuth, async (req, res) => {
    try {
        const user = await User
            .findById(req.userId)
            .select('email');

        if (!user) {
            return res.status(401).json({
                error: 'User not found'
            });
        }

        return res.json({
            user: {
                id: user._id,
                email: user.email
            }
        });

    } catch (err) {
        console.error('Auth/me error:', err);

        return res.status(500).json({
            error: 'Failed to get user'
        });
    }
});


module.exports = router;