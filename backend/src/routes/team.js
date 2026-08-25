const express = require('express');
const store = require('../store');
const User = require('../models/User');
const { logActivity } = require('../models/Activity');
const { auth, managerOnly } = require('../middleware/auth');

const router = express.Router();

const isActiveTask = (t) => !['Completed', 'Cancelled'].includes(t.status);

router.get('/', auth, (req, res, next) => {
  try {
    if (req.user.role === 'manager') {
      const users = store
        .find('users', (u) => u.role !== 'superadmin')
        .map((u) => User.sanitize(u))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json(users);
    }
    const users = store
      .find('users', (u) => u.isActive && u.role === 'team')
      .map((u) => ({ _id: u._id, name: u.name, department: u.department, designation: u.designation }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, managerOnly, async (req, res, next) => {
  try {
    const { name, email, password, role, department, designation, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (User.findByEmail(email)) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    let user;
    try {
      user = await User.createUser({ name, email, password, role, department, designation, phone });
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'added team member',
      targetType: 'team',
      targetId: String(user._id),
      targetName: user.name
    });

    res.status(201).json(User.sanitize(user));
  } catch (err) {
    next(err);
  }
});

router.get('/stats', auth, managerOnly, (req, res, next) => {
  try {
    const now = new Date();
    const members = store.find('users', (u) => u.isActive && u.role === 'team');
    const stats = members.map((member) => {
      const tasks = store.find('tasks', (t) => String(t.assignedTo) === String(member._id));
      return {
        id: member._id,
        name: member.name,
        department: member.department,
        designation: member.designation,
        assigned: tasks.filter(isActiveTask).length,
        pending: tasks.filter((t) => t.status === 'Pending').length,
        inProgress: tasks.filter((t) => t.status === 'In Progress').length,
        completed: tasks.filter((t) => t.status === 'Completed').length,
        overdue: tasks.filter((t) => isActiveTask(t) && new Date(t.dueDate) < now).length
      };
    });
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, managerOnly, async (req, res, next) => {
  try {
    const user = store.findById('users', req.params.id);
    if (!user) return res.status(404).json({ message: 'Team member not found' });
    if (user.role === 'superadmin') {
      return res.status(403).json({ message: 'This account cannot be modified' });
    }

    if (user.role === 'manager') {
      const losingManager =
        req.body.role === 'team' ||
        req.body.isActive === false;
      const activeManagers = store.count('users', (u) => u.role === 'manager' && u.isActive !== false);
      if (losingManager && activeManagers <= 1) {
        return res.status(400).json({ message: 'Cannot demote or deactivate the last manager' });
      }
    }

    const updated = await User.updateUser(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Team member not found' });

    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'updated team member',
      targetType: 'team',
      targetId: String(updated._id),
      targetName: updated.name
    });

    res.json(User.sanitize(updated));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, managerOnly, (req, res, next) => {
  try {
    const user = store.findById('users', req.params.id);
    if (!user) return res.status(404).json({ message: 'Team member not found' });
    if (user.role === 'superadmin') {
      return res.status(403).json({ message: 'This account cannot be deactivated' });
    }
    if (user.role === 'manager') {
      return res.status(400).json({ message: 'Cannot deactivate a manager account' });
    }

    store.update('users', req.params.id, { isActive: false });

    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'deactivated team member',
      targetType: 'team',
      targetId: String(user._id),
      targetName: user.name
    });

    res.json({ message: `${user.name} has been deactivated` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
