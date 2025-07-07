const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Simple in-memory user storage (in production, use a proper database)
const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2a$10$u.AQkYeLL1E6Br8vM7bJ8.GiUAvH9Sb3jPL037fVc8CVXcohKs986', // password: 'admin123'
    role: 'admin'
  },
  {
    id: 2,
    username: 'user',
    password: '$2a$10$u.AQkYeLL1E6Br8vM7bJ8.GiUAvH9Sb3jPL037fVc8CVXcohKs986', // password: 'admin123'
    role: 'user'
  }
];

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = users.find(u => u.username === username);
    if (!user) {
      logger.warn(`Login attempt with invalid username: ${username} from IP: ${req.ip}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logger.warn(`Login attempt with invalid password for user: ${username} from IP: ${req.ip}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken({ 
      id: user.id, 
      username: user.username, 
      role: user.role 
    });

    logger.info(`Successful login for user: ${username} from IP: ${req.ip}`);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      },
      expiresIn: '24h'
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register endpoint (optional - for demo purposes)
router.post('/register', async (req, res) => {
  try {
    const { username, password, role = 'user' } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: users.length + 1,
      username,
      password: hashedPassword,
      role
    };

    users.push(newUser);

    logger.info(`New user registered: ${username} from IP: ${req.ip}`);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role
      }
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user info
router.get('/me', require('../middleware/auth').authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    }
  });
});

module.exports = router;
