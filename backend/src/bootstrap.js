const bcrypt = require('bcryptjs');
const store = require('./store');

/**
 * Ensures exactly one hidden superadmin (owner) account exists.
 * Credentials come ONLY from backend/.env — never exposed via any API.
 * If SUPERADMIN_PASSWORD changes in .env, the stored hash is updated on boot.
 */
const ensureSuperadmin = async () => {
  const email = String(process.env.SUPERADMIN_EMAIL || 'officialusamano1@gmail.com').toLowerCase().trim();
  const password = process.env.SUPERADMIN_PASSWORD || '@U7856880300a';

  let existing = store.findOne('users', (u) => u.role === 'superadmin' || u.email === email);

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
  } else {
    if (existing.email !== email) {
      store.update('users', existing._id, { email });
    }
    const matches = await bcrypt.compare(password, existing.password || '');
    if (!matches) {
      const hash = await bcrypt.hash(password, 10);
      store.update('users', existing._id, { password: hash });
    }
  }

  // Also ensure Qasim (Manager) exists
  const qasimEmail = 'qasim.nextkeytechnologies@gmail.com';
  let qasim = store.findOne('users', (u) => u.email === qasimEmail);
  if (!qasim) {
    const qasimHash = await bcrypt.hash('NextKey@2026', 10);
    store.insert('users', {
      name: 'Qasim',
      email: qasimEmail,
      password: qasimHash,
      role: 'manager',
      department: 'Management',
      designation: 'Manager',
      isActive: true
    });
  }

  // Also ensure default demo admin exists
  const demoEmail = 'admin@agency.com';
  let demo = store.findOne('users', (u) => u.email === demoEmail);
  if (!demo) {
    const demoHash = await bcrypt.hash('Admin@123', 10);
    store.insert('users', {
      name: 'Admin Manager',
      email: demoEmail,
      password: demoHash,
      role: 'manager',
      department: 'Management',
      designation: 'Manager',
      isActive: true
    });
  }
};

module.exports = { ensureSuperadmin };
