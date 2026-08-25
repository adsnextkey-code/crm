const crypto = require('crypto');
const store = require('../store');

const ROLES = ['team', 'manager'];
const EXPIRY_DAYS = 7;

const normalizeEmail = (email) => String(email || '').toLowerCase().trim();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const createInvite = (data = {}) => {
  const email = normalizeEmail(data.email);
  if (!isValidEmail(email)) throw Object.assign(new Error('A valid email address is required'), { name: 'ValidationError' });
  if (!ROLES.includes(data.role)) throw Object.assign(new Error('Role must be team or manager'), { name: 'ValidationError' });

  const existingUser = store.findOne('users', (u) => u.email === email);
  if (existingUser) throw Object.assign(new Error('A user with this email already exists'), { name: 'ValidationError' });

  const pending = store.findOne('invites', (i) => i.email === email);
  if (pending) throw Object.assign(new Error('An invite for this email is already pending'), { name: 'ValidationError' });

  return store.insert('invites', {
    email,
    name: typeof data.name === 'string' ? data.name.trim() : '',
    role: data.role,
    token: crypto.randomBytes(24).toString('hex'),
    invitedBy: data.invitedBy,
    invitedByName: data.invitedByName,
    expiresAt: new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
  });
};

const findValidByToken = (token) => {
  const invite = store.findOne('invites', (i) => i.token === String(token || ''));
  if (!invite) return null;
  if (new Date(invite.expiresAt).getTime() < Date.now()) return null;
  return invite;
};

const listInvites = () =>
  store.find('invites').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

const deleteInvite = (id) => store.delete('invites', id);

const rotateToken = (invite) =>
  store.update('invites', invite._id, {
    token: crypto.randomBytes(24).toString('hex'),
    expiresAt: new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
  });

module.exports = { createInvite, findValidByToken, listInvites, deleteInvite, rotateToken, ROLES, isValidEmail, normalizeEmail };
