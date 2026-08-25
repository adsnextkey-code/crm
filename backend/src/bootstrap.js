const bcrypt = require('bcryptjs');
const store = require('./store');

/**
 * Ensures exactly one hidden superadmin (owner) account exists.
 * Credentials come ONLY from backend/.env — never exposed via any API.
 * If SUPERADMIN_PASSWORD changes in .env, the stored hash is updated on boot.
 */
const ensureSuperadmin = async () => {
  const email = String(process.env.SUPERADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.SUPERADMIN_PASSWORD;
  if (!email || !password) return;

  let existing = store.findOne('users', (u) => u.role === 'superadmin');

  if (!existing) {
    const hash = await bcrypt.hash(password, 10);
    existing = store.insert('users', {
      name: 'Owner',
      email,
      password: hash,
      role: 'superadmin',
      isActive: true
    });
    console.log(`Owner account ready: ${email}`);
    return;
  }

  if (existing.email !== email) {
    store.update('users', existing._id, { email });
    console.log('Owner account email synced from env');
  }

  const matches = await bcrypt.compare(password, existing.password || '');
  if (!matches) {
    const hash = await bcrypt.hash(password, 10);
    store.update('users', existing._id, { password: hash });
    console.log('Owner account password synced from env');
  }
};

module.exports = { ensureSuperadmin };
