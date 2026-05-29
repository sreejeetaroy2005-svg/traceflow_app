const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const SECRET = process.env.JWT_SECRET || 'traceflow-dev-secret';
const EXPIRES = '7d';

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, worker_id: user.worker_id },
    SECRET, { expiresIn: EXPIRES }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, role, worker_id } = req.body;
    if (!email || !password || !name || !role)
      return res.status(400).json({ error: 'email, password, name, role required' });
    const exists = await db.get('SELECT id FROM users WHERE email = $1', [email]);
    if (exists) return res.status(409).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await db.run('INSERT INTO users (id,email,password,name,role,worker_id) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, email, hash, name, role, worker_id || null]);
    const user = await db.get('SELECT id,email,name,role,worker_id FROM users WHERE id=$1', [id]);
    res.status(201).json({ token: makeToken(user), user });
  } catch(e) { next(e); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'email and password required' });
    const user = await db.get('SELECT * FROM users WHERE email = $1', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const { password: _, ...safe } = user;
    res.json({ token: makeToken(safe), user: safe });
  } catch(e) { next(e); }
});

// GET /api/auth/me  — verify token + return current user
router.get('/me', require('../middleware/auth')(), async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
