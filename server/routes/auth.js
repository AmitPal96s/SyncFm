const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST /api/auth/register
// @desc    Register a user
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // 1. Validation
    if (!username || !email || !password) {
      return res.status(400).json({ msg: 'Please provide all required fields' });
    }

    // 2. Check for duplicate Email
    let userByEmail = await User.findOne({ email });
    if (userByEmail) {
      return res.status(400).json({ msg: 'Email is already taken' });
    }

    // 3. Check for duplicate Username
    let userByName = await User.findOne({ username });
    if (userByName) {
      return res.status(400).json({ msg: 'Username is already taken' });
    }

    // 4. Create and Save (Hashing is now handled manually for reliability)
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ 
      username, 
      email, 
      password: hashedPassword 
    });
    
    await user.save();

    // 5. Generate Token
    const payload = { id: user.id, username: user.username };
    jwt.sign(
      payload, 
      process.env.JWT_SECRET || 'secret', 
      { expiresIn: '7d' }, 
      (err, token) => {
        if (err) throw err;
        res.json({ 
          token, 
          user: { 
            id: user.id, 
            username: user.username, 
            email: user.email 
          } 
        });
      }
    );
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ msg: `Registration failed: ${err.message}` });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

    const payload = { id: user.id, username: user.username };
    jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
