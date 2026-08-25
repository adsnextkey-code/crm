const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || (process.env.VERCEL ? path.join('/tmp', 'crm_data') : path.join(__dirname, '..', 'data'));
const DATA_FILE = path.join(DATA_DIR, 'db.json');
const COLLECTIONS = ['users', 'clients', 'tasks', 'activities', 'notifications', 'reports', 'campaigns', 'contents', 'announcements', 'invites'];
const SEQ_KEY_BY_COLLECTION = {
  users: 'user',
  clients: 'client',
  tasks: 'task',
  activities: 'activity',
  notifications: 'notification',
  reports: 'report',
  campaigns: 'campaign',
  contents: 'content',
  announcements: 'announcement',
  invites: 'invite'
};

let db = null;

const emptyDb = () => ({
  seq: { user: 0, client: 0, task: 0, activity: 0, notification: 0, report: 0, campaign: 0, content: 0, announcement: 0, invite: 0 },
  users: [],
  clients: [],
  tasks: [],
  activities: [],
  notifications: [],
  reports: [],
  campaigns: [],
  contents: [],
  announcements: [],
  invites: []
});

const persist = () => {
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
};

const deepCopy = (value) => JSON.parse(JSON.stringify(value));

const syncSeqCounters = () => {
  let changed = false;
  COLLECTIONS.forEach((c) => {
    const max = db[c].reduce((m, d) => {
      const n = parseInt(d && d._id, 10);
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    const key = SEQ_KEY_BY_COLLECTION[c] || c.replace(/s$/, '');
    if (max > 0 && (db.seq[key] || 0) !== max) {
      db.seq[key] = max;
      changed = true;
    }
  });
  return changed;
};

const init = () => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const fallbacks = [
      path.join(__dirname, 'data', 'db.json'),
      path.join(__dirname, '..', 'data', 'db.json'),
      path.join(process.cwd(), 'backend', 'src', 'data', 'db.json'),
      path.join(process.cwd(), 'backend', 'data', 'db.json')
    ];
    for (const fb of fallbacks) {
      if (fs.existsSync(fb)) {
        try {
          fs.copyFileSync(fb, DATA_FILE);
          break;
        } catch (e) {}
      }
    }
  }
  if (fs.existsSync(DATA_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      const fresh = emptyDb();
      db = { ...fresh, ...parsed };
      db.seq = { ...fresh.seq, ...(parsed.seq || {}) };
      COLLECTIONS.forEach((c) => {
        if (!Array.isArray(db[c])) db[c] = [];
      });
      if (syncSeqCounters()) persist();
      return;
    } catch (err) {
      db = null;
    }
  }
  db = emptyDb();
  persist();
};

const reset = () => {
  db = emptyDb();
  persist();
};

const nextId = (collection) => {
  db.seq[collection] = (db.seq[collection] || 0) + 1;
  persist();
  return db.seq[collection];
};

const insert = (collection, doc) => {
  const now = new Date().toISOString();
  const record = {
    ...doc,
    _id: String(nextId(collection)),
    createdAt: doc.createdAt || now,
    updatedAt: doc.updatedAt || now
  };
  db[collection].push(record);
  persist();
  return deepCopy(record);
};

const find = (collection, predicate) => {
  const items = predicate ? db[collection].filter(predicate) : db[collection].slice();
  return deepCopy(items);
};

const findOne = (collection, predicate) => {
  const item = db[collection].find(predicate);
  return item ? deepCopy(item) : undefined;
};

const findById = (collection, id) =>
  findOne(collection, (doc) => String(doc._id) === String(id));

const update = (collection, id, patch) => {
  const doc = db[collection].find((d) => String(d._id) === String(id));
  if (!doc) return undefined;
  Object.assign(doc, patch);
  doc.updatedAt = new Date().toISOString();
  persist();
  return deepCopy(doc);
};

const remove = (collection, id) => {
  const idx = db[collection].findIndex((d) => String(d._id) === String(id));
  if (idx === -1) return undefined;
  const [deleted] = db[collection].splice(idx, 1);
  persist();
  return deepCopy(deleted);
};

const count = (collection, predicate) =>
  predicate ? db[collection].filter(predicate).length : db[collection].length;

init();

module.exports = { init, reset, nextId, insert, find, findOne, findById, update, delete: remove, count };
