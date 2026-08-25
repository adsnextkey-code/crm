const jwt = require('jsonwebtoken');
const store = require('../store');
const User = require('../models/User');

const auth = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
    const token = header.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
    }
    const user = store.findById('users', decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Not authorized, user not found or deactivated' });
    }
    const clean = User.sanitize(user);
    // The hidden owner account passes every manager-level check automatically,
    // while keeping a frontend-visible flag for the OWNER badge.
    if (clean.role === 'superadmin') {
      req.isSuperAdmin = true;
      req.user = { ...clean, role: 'manager', _isSuperAdmin: true };
    } else {
      req.user = clean;
    }
    next();
  } catch (err) {
    next(err);
  }
};

const managerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'manager') return next();
  return res.status(403).json({ message: 'Access denied, manager role required' });
};

module.exports = { auth, managerOnly };
