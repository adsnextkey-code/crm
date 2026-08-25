const express = require('express');
const { readOutbox } = require('../services/mailer');
const { auth, managerOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, managerOnly, (req, res, next) => {
  try {
    const { to, limit } = req.query;
    let emails = readOutbox();
    if (to) {
      const s = String(to).toLowerCase();
      emails = emails.filter((e) => String(e.to || '').toLowerCase().includes(s));
    }
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    res.json({ total: emails.length, emails: emails.slice(0, lim) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
