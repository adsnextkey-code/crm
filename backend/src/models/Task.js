const store = require('../store');
const crypto = require('crypto');

const RECURRENCE_VALUES = ['none', 'daily', 'weekly', 'monthly'];
const STATUS_VALUES = ['Pending', 'In Progress', 'Review', 'Completed', 'Cancelled', 'On Hold'];
const PRIORITY_VALUES = ['High', 'Medium', 'Low'];

const validateFields = (data = {}, { partial = false } = {}) => {
  const provided = (f) => data[f] !== undefined;
  const check = (f) => (partial ? provided(f) : true) && provided(f);
  if (check('status') && !STATUS_VALUES.includes(data.status)) {
    throw Object.assign(new Error('Invalid task status'), { name: 'ValidationError' });
  }
  if (check('priority') && !PRIORITY_VALUES.includes(data.priority)) {
    throw Object.assign(new Error('Invalid task priority'), { name: 'ValidationError' });
  }
  if (check('recurrence') && !RECURRENCE_VALUES.includes(data.recurrence)) {
    throw Object.assign(new Error('Invalid recurrence value'), { name: 'ValidationError' });
  }
  if (check('dueDate') && Number.isNaN(new Date(data.dueDate).getTime())) {
    throw Object.assign(new Error('Invalid due date'), { name: 'ValidationError' });
  }
  if (check('timeSpent') && (typeof data.timeSpent !== 'number' || data.timeSpent < 0)) {
    throw Object.assign(new Error('Time spent must be a non-negative number'), { name: 'ValidationError' });
  }
  if (partial) return;
  const client = store.findById('clients', data.client);
  if (!client) throw Object.assign(new Error('Client not found'), { name: 'ValidationError' });
  const assignee = store.findById('users', data.assignedTo);
  if (!assignee || assignee.isActive === false) {
    throw Object.assign(new Error('Assignee not found or inactive'), { name: 'ValidationError' });
  }
};

const nextTaskId = () => {
  const n = store.nextId('taskCode');
  let id = `TASK-${String(n).padStart(4, '0')}`;
  while (store.findOne('tasks', (t) => t.taskId === id)) {
    id = `TASK-${String(store.nextId('taskCode')).padStart(4, '0')}`;
  }
  return id;
};

const findById = (id) => store.findById('tasks', id);

const createTask = (data = {}) => {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!title) throw Object.assign(new Error('Title is required'), { name: 'ValidationError' });
  if (!data.client) throw Object.assign(new Error('Client is required'), { name: 'ValidationError' });
  if (!data.assignedTo) throw Object.assign(new Error('Assigned user is required'), { name: 'ValidationError' });
  if (!data.dueDate) throw Object.assign(new Error('Due date is required'), { name: 'ValidationError' });
  validateFields(data);

  const doc = {
    taskId: nextTaskId(),
    title,
    description: data.description,
    client: data.client,
    clientName: data.clientName,
    serviceType: data.serviceType,
    assignedTo: data.assignedTo,
    assignedToName: data.assignedToName,
    department: data.department,
    priority: data.priority || 'Medium',
    status: data.status || 'Pending',
    dueDate: data.dueDate instanceof Date ? data.dueDate.toISOString() : data.dueDate,
    completedAt:
      data.completedAt instanceof Date
        ? data.completedAt.toISOString()
        : data.completedAt || undefined,
    timeSpent: typeof data.timeSpent === 'number' ? data.timeSpent : 0,
    timeLogs: Array.isArray(data.timeLogs) ? data.timeLogs : [],
    recurrence: RECURRENCE_VALUES.includes(data.recurrence) ? data.recurrence : 'none',
    parentTaskId: data.parentTaskId || undefined,
    isRecurringInstance: data.isRecurringInstance ? true : undefined,
    updates: Array.isArray(data.updates) ? data.updates : [],
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    comments: Array.isArray(data.comments) ? data.comments : [],
    campaignId: data.campaignId || undefined,
    createdBy: data.createdBy
  };
  return store.insert('tasks', doc);
};

const computeTotalMinutes = (task) =>
  (task?.timeLogs || []).reduce((sum, log) => sum + (Number(log.minutes) || 0), 0);

const addTimeLog = (id, log = {}) => {
  const task = store.findById('tasks', id);
  if (!task) return undefined;
  const entry = {
    _id: crypto.randomUUID(),
    userId: log.userId,
    userName: log.userName,
    minutes: Math.round(Number(log.minutes)),
    billable: Boolean(log.billable),
    note: log.note || '',
    date: log.date instanceof Date ? log.date.toISOString() : log.date || new Date().toISOString()
  };
  const timeLogs = [...(task.timeLogs || []), entry];
  return store.update('tasks', id, {
    timeLogs,
    timeSpent: Math.round((computeTotalMinutes({ timeLogs }) / 60) * 100) / 100
  });
};

const removeTimeLog = (id, logId) => {
  const task = store.findById('tasks', id);
  if (!task) return undefined;
  const timeLogs = (task.timeLogs || []).filter((l) => l._id !== logId);
  return store.update('tasks', id, {
    timeLogs,
    timeSpent: Math.round((computeTotalMinutes({ timeLogs }) / 60) * 100) / 100
  });
};

const updateTask = (id, patch = {}) => {
  const current = store.findById('tasks', id);
  if (!current) return undefined;
  validateFields(patch, { partial: true });
  const clean = { ...patch };
  delete clean._id;
  delete clean.taskId;
  delete clean.createdAt;
  return store.update('tasks', id, clean);
};

module.exports = {
  createTask,
  updateTask,
  findById,
  computeTotalMinutes,
  addTimeLog,
  removeTimeLog
};


