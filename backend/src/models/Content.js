const store = require('../store');
const Report = require('./Report');

const CONTENT_TYPES = ['Post', 'Blog', 'Ad', 'Video', 'Email'];
const PLATFORMS = ['Facebook', 'Instagram', 'LinkedIn', 'Google', 'TikTok', 'Website'];
const STATUSES = ['Brief', 'Production', 'Internal Review', 'Approved', 'Scheduled', 'Published'];
const EDITABLE_FIELDS = [
  'title',
  'caption',
  'contentType',
  'platform',
  'scheduledDate',
  'campaignId',
  'assignedTo',
  'creativeFile'
];
const MAX_FILE_CHARS = Report.MAX_FILE_CHARS;

const TRANSITIONS = {
  Brief: ['Production'],
  Production: ['Internal Review'],
  'Internal Review': ['Approved', 'Production'],
  Approved: ['Scheduled', 'Production'],
  Scheduled: ['Published', 'Production']
};

const validationError = (message) =>
  Object.assign(new Error(message), { name: 'ValidationError' });

const findById = (id) => store.findById('contents', id);

const isLocked = (item) => Boolean(item && item.locked);

const validateClient = (clientId) => {
  if (!clientId || !store.findById('clients', clientId)) {
    throw validationError('Client not found');
  }
};

const validateCampaign = (campaignId) => {
  if (campaignId && !store.findById('campaigns', campaignId)) {
    throw validationError('Campaign not found');
  }
};

const resolveAssignee = (data) => {
  if (!data.assignedTo) return { assignedTo: undefined, assignedToName: undefined };
  const user = store.findById('users', data.assignedTo);
  if (!user) throw validationError('Assignee not found');
  return { assignedTo: user._id, assignedToName: user.name };
};

const sanitizeCreative = (file) => {
  if (file === null || file === undefined || file === '') return null;
  if (typeof file !== 'object' || Array.isArray(file)) {
    throw validationError('Invalid creative file');
  }
  const fileData = typeof file.fileData === 'string' ? file.fileData : '';
  if (fileData.length > MAX_FILE_CHARS) {
    throw validationError('Creative file exceeds the 2MB limit');
  }
  return {
    name: typeof file.name === 'string' ? file.name.slice(0, 200) : '',
    type: typeof file.type === 'string' ? file.type.slice(0, 100) : '',
    size: Number(file.size) || 0,
    fileData
  };
};

const createContent = (data = {}, actor = {}) => {
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  if (!title) throw validationError('Title is required');
  validateClient(data.clientId);
  if (data.campaignId) validateCampaign(data.campaignId);
  if (!CONTENT_TYPES.includes(data.contentType)) {
    throw validationError('Invalid content type');
  }
  if (!PLATFORMS.includes(data.platform)) {
    throw validationError('Invalid platform');
  }
  const assignee = resolveAssignee(data);
  const now = new Date().toISOString();

  return store.insert('contents', {
    title,
    clientId: data.clientId,
    campaignId: data.campaignId || null,
    contentType: data.contentType,
    platform: data.platform,
    caption: typeof data.caption === 'string' ? data.caption : '',
    creativeFile: sanitizeCreative(data.creativeFile),
    scheduledDate: data.scheduledDate || undefined,
    status: 'Brief',
    assignedTo: assignee.assignedTo,
    assignedToName: assignee.assignedToName,
    revisions: 1,
    locked: false,
    history: [
      {
        status: 'Brief',
        userId: actor.userId,
        userName: actor.userName,
        note: 'Created',
        at: now
      }
    ],
    feedback: []
  });
};

const updateContent = (id, patch = {}) => {
  const current = store.findById('contents', id);
  if (!current) return undefined;
  if (isLocked(current)) {
    throw validationError('Approved version is locked and cannot be edited');
  }

  const clean = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (patch[field] !== undefined) clean[field] = patch[field];
  });
  delete clean._id;

  if (clean.title !== undefined) {
    const title = typeof clean.title === 'string' ? clean.title.trim() : '';
    if (!title) throw validationError('Title is required');
    clean.title = title;
  }
  if (clean.clientId !== undefined) validateClient(clean.clientId);
  if (clean.campaignId !== undefined) validateCampaign(clean.campaignId);
  if (clean.contentType !== undefined && !CONTENT_TYPES.includes(clean.contentType)) {
    throw validationError('Invalid content type');
  }
  if (clean.platform !== undefined && !PLATFORMS.includes(clean.platform)) {
    throw validationError('Invalid platform');
  }
  if (clean.scheduledDate !== undefined && !clean.scheduledDate) delete clean.scheduledDate;
  if (clean.creativeFile !== undefined) clean.creativeFile = sanitizeCreative(clean.creativeFile);
  if (clean.assignedTo !== undefined) {
    const assignee = resolveAssignee({ assignedTo: clean.assignedTo });
    if (assignee.assignedTo) {
      clean.assignedTo = assignee.assignedTo;
      clean.assignedToName = assignee.assignedToName;
    } else {
      delete clean.assignedTo;
      delete clean.assignedToName;
    }
  }

  return store.update('contents', id, clean);
};

const applyTransition = (id, { toStatus, userId, userName, note, scheduledDate } = {}) => {
  const item = store.findById('contents', id);
  if (!item) throw validationError('Content not found');
  if (!STATUSES.includes(toStatus)) throw validationError('Invalid status');
  const allowed = TRANSITIONS[item.status] || [];
  if (!allowed.includes(toStatus)) {
    throw validationError(`Cannot move from ${item.status} to ${toStatus}`);
  }

  const rejection = item.status === 'Internal Review' && toStatus === 'Production';
  const rework = ['Approved', 'Scheduled'].includes(item.status) && toStatus === 'Production';
  const patch = { status: toStatus };

  if (rejection || rework) {
    const reason = typeof note === 'string' ? note.trim() : '';
    if (reason.length < 5) {
      throw validationError(rejection ? 'A rejection reason is required' : 'A rework reason is required');
    }
    patch.revisions = (Number(item.revisions) || 1) + 1;
    patch.locked = false;
  } else if (['Approved', 'Scheduled', 'Published'].includes(toStatus)) {
    patch.locked = true;
  }

  if (toStatus === 'Scheduled') {
    const date = scheduledDate || item.scheduledDate;
    if (!date) {
      throw validationError('A scheduled date is required before moving to Scheduled');
    }
    patch.scheduledDate = date;
  }

  patch.history = [
    ...(item.history || []),
    {
      status: toStatus,
      userId,
      userName,
      note: (typeof note === 'string' && note.trim()) || '',
      at: new Date().toISOString()
    }
  ];

  return store.update('contents', id, patch);
};

module.exports = {
  CONTENT_TYPES,
  PLATFORMS,
  STATUSES,
  TRANSITIONS,
  MAX_FILE_CHARS,
  createContent,
  updateContent,
  applyTransition,
  findById,
  isLocked
};
