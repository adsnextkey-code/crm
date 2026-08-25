const express = require('express');
const jwt = require('jsonwebtoken');
const store = require('../store');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Invite = require('../models/Invite');
const { auth } = require('../middleware/auth');

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role, department, designation, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const managerCount = store.count('users', (u) => u.role === 'manager');
    const header = req.headers.authorization;
    let authorizedManager = null;

    if (header && header.startsWith('Bearer ')) {
      const token = header.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const requester = User.findById(decoded.id);
        const isManagerish =
          requester &&
          (requester.role === 'manager' || requester.role === 'superadmin') &&
          requester.isActive !== false;
        if (isManagerish) authorizedManager = requester;
      } catch (err) {
        // ignore invalid token, fall through to open rules
      }
    }

    let requestedRole = role === 'manager' ? 'manager' : 'team';
    if (managerCount === 0) {
      if (requestedRole !== 'manager') {
        return res.status(403).json({
          message: 'Only a manager account can be registered first. Ask your manager to add members from the Team page.'
        });
      }
    } else if (!authorizedManager) {
      return res.status(403).json({ message: 'Manager access required' });
    }

    const existing = User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = await User.createUser({
      name,
      email,
      password,
      role: requestedRole,
      department,
      designation,
      phone
    });

    res.status(201).json({
      token: signToken(user),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = User.findByEmail(email);
    if (!user || !(await User.comparePassword(user, password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated, contact your manager' });
    }

    if (user.role !== 'superadmin') {
      Activity.logActivity({
        user: user._id,
        userName: user.name,
        userRole: user.role,
        action: 'logged in',
        targetType: 'auth',
        targetId: String(user._id),
        targetName: user.name
      });
    }

    res.json({
      token: signToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role === 'superadmin' ? 'manager' : user.role,
        _isSuperAdmin: user.role === 'superadmin',
        department: user.department,
        designation: user.designation,
        phone: user.phone,
        avatar: user.avatar || ''
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', auth, (req, res) => {
  const u = req.user;
  res.json({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    _isSuperAdmin: Boolean(u._isSuperAdmin),
    department: u.department,
    designation: u.designation,
    phone: u.phone,
    avatar: u.avatar
  });
});

const MAX_AVATAR_CHARS = 400000;

router.put('/profile', auth, async (req, res, next) => {
  try {
    const patch = {
      name: req.body.name,
      phone: req.body.phone,
      designation: req.body.designation,
      password: req.body.password
    };

    if (req.body.avatar !== undefined) {
      const avatar = String(req.body.avatar);
      if (avatar === '') {
        patch.avatar = '';
      } else {
        const valid = /^data:image\/(png|jpe?g|webp|gif);base64,/.test(avatar);
        if (!valid) return res.status(400).json({ message: 'Avatar must be a PNG, JPG, WEBP or GIF image' });
        if (avatar.length > MAX_AVATAR_CHARS)
          return res.status(400).json({ message: 'Image too large — please pick one under 300KB' });
        patch.avatar = avatar;
      }
    }

    const updated = await User.updateUser(req.user._id, patch);
    if (!updated) return res.status(404).json({ message: 'User not found' });

    res.json({
      message: 'Profile updated',
      user: { id: updated._id, name: updated.name, email: updated.email, role: updated.role }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/invite-preview/:token', (req, res) => {
  const invite = Invite.findValidByToken(String(req.params.token || ''));
  if (!invite) return res.status(404).json({ message: 'This invitation is invalid or has expired' });
  res.json({ email: invite.email, role: invite.role, invitedByName: invite.invitedByName });
});

router.post('/accept-invite', async (req, res, next) => {
  try {
    const token = String(req.body.token || '');
    const invite = Invite.findValidByToken(token);
    if (!invite) {
      return res.status(400).json({ message: 'This invitation is invalid or has expired' });
    }

    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name) return res.status(400).json({ message: 'Name is required' });
    if (!req.body.password || String(req.body.password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const user = await User.createUser({
      name,
      email: invite.email,
      password: req.body.password,
      role: invite.role
    });

    store.delete('invites', invite._id);
    Activity.logActivity({
      user: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'accepted an invite and joined',
      targetType: 'auth',
      targetId: String(user._id),
      targetName: user.name
    });

    res.status(201).json({
      token: signToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role === 'superadmin' ? 'manager' : user.role,
        _isSuperAdmin: user.role === 'superadmin',
        department: user.department,
        designation: user.designation,
        phone: user.phone,
        avatar: user.avatar || ''
      },
      message: 'Account created — welcome aboard!'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
