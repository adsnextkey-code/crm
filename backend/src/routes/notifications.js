const express = require('express');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, (req, res, next) => {
  try {
    res.json({
      notifications: Notification.listForUser(req.user._id),
      unreadCount: Notification.unreadCount(req.user._id)
    });
  } catch (err) {
    next(err);
  }
});

router.put('/read-all', auth, (req, res, next) => {
  try {
    Notification.markAllRead(req.user._id);
    res.json({
      notifications: Notification.listForUser(req.user._id),
      unreadCount: Notification.unreadCount(req.user._id)
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/read', auth, (req, res, next) => {
  try {
    const updated = Notification.markRead(req.user._id, req.params.id);
    if (!updated) return res.status(404).json({ message: 'Notification not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
