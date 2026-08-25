const express = require('express');
const { auth, managerOnly } = require('../middleware/auth');
const Invite = require('../models/Invite');
const { logActivity } = require('../models/Activity');
const { sendMail } = require('../services/mailer');

const router = express.Router();

const inviteLink = (token) => {
  const base = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${String(base).replace(/\/$/, '')}/invite/${token}`;
};

const sendInviteMail = (invite, { resend = false } = {}) =>
  sendMail({
    to: invite.email,
    actorName: invite.invitedByName,
    subject: resend
      ? `Reminder invitation — join Agency CRM`
      : `You're invited to join Agency CRM`,
    title: resend ? 'Reminder: Your Agency CRM Invitation' : 'Welcome to Agency CRM',
    lines: [
      ['Invited by', invite.invitedByName || 'Manager'],
      ['Your work email', invite.email],
      ['Account type', invite.role === 'manager' ? 'Manager' : 'Team Member'],
      ['This link expires', new Date(invite.expiresAt).toDateString()]
    ],
    actionText: 'Create My Password'
  });

router.use(auth, managerOnly);

router.get('/', (req, res, next) => {
  try {
    res.json(Invite.listInvites());
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const invite = Invite.createInvite({
      email: req.body.email,
      name: req.body.name,
      role: req.body.role,
      invitedBy: req.user._id,
      invitedByName: req.user.name
    });

    const mail = await sendInviteMail(invite);
    if (mail && mail.status === 'failed') {
      console.error('Invite email failed:', mail.error);
    }

    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'invited a new member',
      targetType: 'invite',
      targetId: String(invite._id),
      targetName: invite.email,
      details: `Role: ${invite.role}`
    });

    res.status(201).json({ ...invite, token: undefined, link: inviteLink(invite.token) });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/resend', async (req, res, next) => {
  try {
    const current = Invite.listInvites().find((i) => String(i._id) === String(req.params.id));
    if (!current) return res.status(404).json({ message: 'Invite not found' });

    const expired = new Date(current.expiresAt).getTime() < Date.now();
    const invite = expired ? Invite.rotateToken(current) : current;

    const mail = await sendInviteMail(invite, { resend: true });
    if (mail && mail.status === 'failed') {
      console.error('Invite email failed:', mail.error);
    }
    res.json({ message: 'Invitation email sent', link: inviteLink(invite.token) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const deleted = Invite.deleteInvite(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Invite not found' });
    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'cancelled an invite',
      targetType: 'invite',
      targetId: String(deleted._id),
      targetName: deleted.email
    });
    res.json({ message: 'Invite cancelled' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
