const express = require('express');
const store = require('../store');
const Content = require('../models/Content');
const { logActivity } = require('../models/Activity');
const { createNotification } = require('../models/Notification');
const { sendMail, userEmail } = require('../services/mailer');
const { auth, managerOnly } = require('../middleware/auth');

const router = express.Router();

const teamClientIds = (userId) =>
  new Set(
    store
      .find('tasks', (t) => String(t.assignedTo) === String(userId))
      .map((t) => String(t.client))
  );

const populateContent = (item) => {
  const client = store.findById('clients', item.clientId);
  const campaign = item.campaignId ? store.findById('campaigns', item.campaignId) : null;
  return {
    ...item,
    clientId: client ? { _id: client._id, name: client.name } : item.clientId,
    campaignId: campaign ? { _id: campaign._id, name: campaign.name } : null
  };
};

const canSee = (item, user) => {
  if (user.role === 'manager') return true;
  const accessible = teamClientIds(user._id);
  return (
    accessible.has(String(item.clientId)) &&
    String(item.assignedTo) === String(user._id)
  );
};

router.get('/', auth, (req, res, next) => {
  try {
    const { clientId, campaignId, status, month } = req.query;
    let items = store.find('contents');
    if (req.user.role === 'team') {
      const accessible = teamClientIds(req.user._id);
      items = items.filter(
        (c) =>
          accessible.has(String(c.clientId)) &&
          String(c.assignedTo) === String(req.user._id)
      );
    }
    if (clientId) items = items.filter((c) => String(c.clientId) === String(clientId));
    if (campaignId) items = items.filter((c) => String(c.campaignId) === String(campaignId));
    if (status) items = items.filter((c) => c.status === status);
    if (month) {
      items = items.filter(
        (c) => c.scheduledDate && String(c.scheduledDate).slice(0, 7) === month
      );
    }
    items.sort((a, b) => {
      if (!a.scheduledDate && !b.scheduledDate) return 0;
      if (!a.scheduledDate) return 1;
      if (!b.scheduledDate) return -1;
      return String(a.scheduledDate).localeCompare(String(b.scheduledDate));
    });
    res.json(items.map(populateContent));
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, (req, res, next) => {
  try {
    const body = { ...(req.body || {}) };
    if (req.user.role === 'team') {
      body.assignedTo = req.user._id;
      if (!body.clientId || !teamClientIds(req.user._id).has(String(body.clientId))) {
        return res.status(403).json({ message: 'You can only add content for your own clients' });
      }
    }
    const content = Content.createContent(body, {
      userId: req.user._id,
      userName: req.user.name
    });
    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'created content',
      targetType: 'content',
      targetId: String(content._id),
      targetName: content.title
    });
    res.status(201).json(populateContent(content));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, (req, res, next) => {
  try {
    const content = Content.findById(req.params.id);
    if (!content) return res.status(404).json({ message: 'Content not found' });
    if (!canSee(content, req.user)) {
      return res.status(403).json({ message: 'You do not have access to this content' });
    }
    res.json(populateContent(content));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, (req, res, next) => {
  try {
    const existing = Content.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Content not found' });
    if (Content.isLocked(existing)) {
      return res.status(403).json({ message: 'Approved version is locked' });
    }
    if (req.user.role !== 'manager' && String(existing.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only edit content assigned to you' });
    }
    const content = Content.updateContent(req.params.id, req.body || {});
    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'updated content',
      targetType: 'content',
      targetId: String(content._id),
      targetName: content.title
    });
    res.json(populateContent(content));
  } catch (err) {
    next(err);
  }
});

router.put('/:id/status', auth, (req, res, next) => {
  try {
    const existing = Content.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Content not found' });
    if (req.user.role !== 'manager' && String(existing.assignedTo) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only update content assigned to you' });
    }
    if (
      ['Approved', 'Scheduled'].includes(existing.status) &&
      req.user.role !== 'manager'
    ) {
      return res
        .status(403)
        .json({ message: 'Access denied, manager role required for this transition' });
    }
    const { status, note, scheduledDate } = req.body || {};
    const content = Content.applyTransition(req.params.id, {
      toStatus: status,
      userId: req.user._id,
      userName: req.user.name,
      note,
      scheduledDate
    });
    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: `content moved to ${content.status}`,
      targetType: 'content',
      targetId: String(content._id),
      targetName: content.title
    });
    res.json(populateContent(content));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/feedback', auth, (req, res, next) => {
  try {
    const content = Content.findById(req.params.id);
    if (!content) return res.status(404).json({ message: 'Content not found' });
    if (!canSee(content, req.user)) {
      return res.status(403).json({ message: 'You do not have access to this content' });
    }
    const text = typeof (req.body || {}).text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ message: 'Feedback text is required' });

    const entry = {
      userId: req.user._id,
      userName: req.user.name,
      text,
      at: new Date().toISOString()
    };
    const updated = store.update('contents', content._id, {
      feedback: [...(content.feedback || []), entry]
    });

    if (
      content.assignedTo &&
      String(content.assignedTo) !== String(req.user._id)
    ) {
      createNotification({
        userId: content.assignedTo,
        type: 'comment',
        title: 'New content feedback',
        body: `${req.user.name} commented on "${content.title}"`,
        targetId: String(content._id)
      });
      sendMail({
        to: userEmail(content.assignedTo),
        actorEmail: userEmail(req.user._id),
        actorName: req.user.name,
        subject: `New content feedback: ${content.title}`,
        title: 'New content feedback',
        lines: [
          ['Content', content.title],
          ['From', req.user.name],
          ['Feedback', text.slice(0, 300)]
        ],
        actionText: 'Open CRM'
      }).catch(() => {});
    }

    res.status(201).json(populateContent(updated));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, managerOnly, (req, res, next) => {
  try {
    const content = store.delete('contents', req.params.id);
    if (!content) return res.status(404).json({ message: 'Content not found' });
    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'deleted content',
      targetType: 'content',
      targetId: String(content._id),
      targetName: content.title
    });
    res.json({ message: `Content "${content.title}" deleted` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
