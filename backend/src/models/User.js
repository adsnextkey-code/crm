const bcrypt = require('bcryptjs');
const store = require('../store');

const sanitize = (user) => {
  if (!user) return user;
  const { password, ...rest } = user;
  return rest;
};

const findById = (id) => store.findById('users', id);

const findByEmail = (email) => {
  const normalized = String(email || '').toLowerCase().trim();
  return store.findOne('users', (u) => u.email === normalized);
};

const createUser = async (data = {}) => {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email = String(data.email || '').toLowerCase().trim();
  if (!name) throw Object.assign(new Error('Name is required'), { name: 'ValidationError' });
  if (!email) throw Object.assign(new Error('Email is required'), { name: 'ValidationError' });
  if (!data.password || String(data.password).length < 6) {
    throw Object.assign(new Error('Password must be at least 6 characters'), { name: 'ValidationError' });
  }
  if (findByEmail(email)) throw Object.assign(new Error('User already exists'), { name: 'ValidationError' });

  const password = await bcrypt.hash(String(data.password), 10);
  return store.insert('users', {
    name,
    email,
    password,
    role: data.role === 'manager' ? 'manager' : 'team',
    department: data.department,
    designation: data.designation,
    phone: data.phone,
    avatar: data.avatar,
    isActive: data.isActive === undefined ? true : Boolean(data.isActive)
  });
};

const comparePassword = (userDoc, candidate) => {
  if (!userDoc || !userDoc.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, userDoc.password);
};

const updateUser = async (id, patch = {}) => {
  const current = store.findById('users', id);
  if (!current) return undefined;
  const allowed = ['name', 'email', 'role', 'department', 'designation', 'phone', 'avatar', 'isActive'];
  const clean = {};
  allowed.forEach((field) => {
    if (patch[field] !== undefined) clean[field] = patch[field];
  });
  // The hidden owner role can never be granted or removed through the API.
  if (clean.role === 'superadmin' || current.role === 'superadmin') delete clean.role;
  if (typeof clean.email === 'string') {
    clean.email = clean.email.toLowerCase().trim();
    const existing = store.findOne(
      'users',
      (u) => u.email === clean.email && String(u._id) !== String(id)
    );
    if (existing) throw Object.assign(new Error('A user with this email already exists'), { name: 'ValidationError' });
  }
  if (patch.password && String(patch.password).trim()) {
    clean.password = await bcrypt.hash(String(patch.password), 10);
  }
  return store.update('users', id, clean);
};

module.exports = { createUser, updateUser, comparePassword, sanitize, findById, findByEmail };
