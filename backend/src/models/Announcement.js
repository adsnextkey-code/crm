const store = require('../store');

const MAX_BODY_CHARS = 5000;

const createAnnouncement = (data = {}) => {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const body = typeof data.body === 'string' ? data.body.trim() : '';
  if (!title) throw Object.assign(new Error('Announcement title is required'), { name: 'ValidationError' });
  if (!body) throw Object.assign(new Error('Announcement body is required'), { name: 'ValidationError' });
  if (body.length > MAX_BODY_CHARS)
    throw Object.assign(new Error(`Announcement body must be under ${MAX_BODY_CHARS} characters`), {
      name: 'ValidationError'
    });

  return store.insert('announcements', {
    title,
    body,
    pinned: Boolean(data.pinned),
    createdBy: data.createdBy,
    createdByName: data.createdByName
  });
};

const listAnnouncements = () =>
  store
    .find('announcements')
    .sort((a, b) => {
      if (Boolean(b.pinned) !== Boolean(a.pinned)) return b.pinned ? 1 : -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    })
    .slice(0, 50);

const findById = (id) => store.findById('announcements', id);

const deleteAnnouncement = (id) => store.delete('announcements', id);

module.exports = { createAnnouncement, listAnnouncements, findById, deleteAnnouncement, MAX_BODY_CHARS };
