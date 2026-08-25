const store = require('../store');

const createNotification = (data = {}) =>
  store.insert('notifications', {
    userId: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    targetId: data.targetId || undefined,
    read: false
  });

const listForUser = (userId) =>
  store
    .find('notifications', (n) => String(n.userId) === String(userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 30);

const unreadCount = (userId) =>
  store.count('notifications', (n) => String(n.userId) === String(userId) && !n.read);

const markRead = (userId, notificationId) => {
  const notification = store.findById('notifications', notificationId);
  if (!notification || String(notification.userId) !== String(userId)) return undefined;
  return store.update('notifications', notificationId, { read: true });
};

const markAllRead = (userId) => {
  const unread = store.find('notifications', (n) => String(n.userId) === String(userId) && !n.read);
  unread.forEach((n) => {
    store.update('notifications', n._id, { read: true });
  });
  return unread.length;
};

module.exports = { createNotification, listForUser, unreadCount, markRead, markAllRead };
