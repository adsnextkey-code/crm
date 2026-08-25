const express = require('express');
const store = require('../store');
const { auth, managerOnly } = require('../middleware/auth');
const Announcement = require('../models/Announcement');
const { createNotification } = require('../models/Notification');
const { logActivity } = require('../models/Activity');
const { sendMail, userEmail } = require('../services/mailer');

const router = express.Router();

router.get('/', auth, (req, res, next) => {
  try {
    res.json(Announcement.listAnnouncements());
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, managerOnly, async (req, res, next) => {
  try {
    const announcement = Announcement.createAnnouncement({
      title: req.body.title,
      body: req.body.body,
      pinned: req.body.pinned,
      createdBy: req.user._id,
      createdByName: req.user.name
    });

    const recipients = store
      .find('users', (u) => u.isActive && u.role !== 'superadmin' && String(u._id) !== String(req.user._id))
      .filter((u) => u.role === 'team' || u.role === 'manager');

    recipients.forEach((u) => {
      createNotification({
        userId: u._id,
        type: 'announcement',
        title: announcement.title,
        body:
          announcement.body.length > 120 ? `${announcement.body.slice(0, 117)}...` : announcement.body
      });
    });

    recipients.forEach((u) => {
      sendMail({
        to: userEmail(u._id),
        actorEmail: req.user.email,
        actorName: req.user.name,
        subject: `Announcement: ${announcement.title}`,
        title: 'New Company Announcement',
        lines: [
          ['Title', announcement.title],
          ['From', req.user.name],
          ['Details', announcement.body.length > 400 ? `${announcement.body.slice(0, 397)}...` : announcement.body]
        ],
        actionText: 'Open CRM'
      });
    });

    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'posted an announcement',
      targetType: 'announcement',
      targetId: String(announcement._id),
      targetName: announcement.title
    });

    res.status(201).json(announcement);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, managerOnly, (req, res, next) => {
  try {
    const announcement = Announcement.deleteAnnouncement(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'deleted an announcement',
      targetType: 'announcement',
      targetId: String(announcement._id),
      targetName: announcement.title
    });
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
