const store = require('../store');

const logActivity = (data = {}) => {
  // The hidden owner account leaves no trace in activity feeds.
  const actor = data.user && store.findById('users', data.user);
  if (actor && actor.role === 'superadmin') return null;
  return store.insert('activities', {
    user: data.user,
    userName: data.userName,
    userRole: data.userRole,
    action: data.action,
    targetType: data.targetType,
    targetId: data.targetId,
    targetName: data.targetName,
    details: data.details,
    createdAt: new Date().toISOString()
  });
};

module.exports = { logActivity };
