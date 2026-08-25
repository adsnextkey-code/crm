const store = require('../store');

const CHANNELS = ['SEO', 'GBP', 'Social Media', 'Ads', 'Email', 'Content', 'Development'];
const STATUS_VALUES = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];
const EDITABLE_FIELDS = [
  'name',
  'clientId',
  'objective',
  'channels',
  'budget',
  'startDate',
  'endDate',
  'ownerId',
  'ownerName',
  'status',
  'kpis',
  'notes'
];

const validationError = (message) =>
  Object.assign(new Error(message), { name: 'ValidationError' });

const sanitizeChannels = (channels) =>
  Array.isArray(channels)
    ? [...new Set(channels.filter((c) => CHANNELS.includes(c)))]
    : [];

const sanitizeKpis = (kpis) =>
  Array.isArray(kpis)
    ? kpis
        .filter((k) => k && typeof k.label === 'string' && k.label.trim())
        .map((k) => ({
          label: k.label.trim(),
          targetValue: Number.isFinite(Number(k.targetValue)) ? Number(k.targetValue) : 0,
          unit: typeof k.unit === 'string' ? k.unit.trim() : ''
        }))
    : [];

const resolveOwner = (data) => {
  if (!data.ownerId) return { ownerId: undefined, ownerName: undefined };
  const user = store.findById('users', data.ownerId);
  if (!user) throw validationError('Owner not found');
  return { ownerId: user._id, ownerName: data.ownerName || user.name };
};

const validateClient = (clientId) => {
  if (!clientId || !store.findById('clients', clientId)) {
    throw validationError('Client not found');
  }
};

const findById = (id) => store.findById('campaigns', id);

const listForClient = (clientId) =>
  store.find('campaigns', (c) => String(c.clientId) === String(clientId));

const createCampaign = (data = {}) => {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!name) throw validationError('Name is required');
  validateClient(data.clientId);
  if (data.status && !STATUS_VALUES.includes(data.status)) {
    throw validationError('Invalid campaign status');
  }
  const owner = resolveOwner(data);

  const doc = {
    name,
    clientId: data.clientId,
    objective: typeof data.objective === 'string' ? data.objective.trim() : undefined,
    channels: sanitizeChannels(data.channels),
    budget: Number.isFinite(Number(data.budget)) && data.budget !== '' ? Number(data.budget) : undefined,
    startDate: data.startDate || undefined,
    endDate: data.endDate || undefined,
    ownerId: owner.ownerId,
    ownerName: owner.ownerName,
    status: STATUS_VALUES.includes(data.status) ? data.status : 'Planning',
    kpis: sanitizeKpis(data.kpis),
    notes: typeof data.notes === 'string' ? data.notes : undefined
  };
  return store.insert('campaigns', doc);
};

const updateCampaign = (id, patch = {}) => {
  const current = store.findById('campaigns', id);
  if (!current) return undefined;

  const clean = {};
  EDITABLE_FIELDS.forEach((field) => {
    if (patch[field] !== undefined) clean[field] = patch[field];
  });
  delete clean._id;

  if (clean.clientId !== undefined) validateClient(clean.clientId);
  if (clean.name !== undefined) {
    const name = typeof clean.name === 'string' ? clean.name.trim() : '';
    if (!name) throw validationError('Name is required');
    clean.name = name;
  }
  if (clean.status !== undefined && !STATUS_VALUES.includes(clean.status)) {
    throw validationError('Invalid campaign status');
  }
  if (clean.channels !== undefined) clean.channels = sanitizeChannels(clean.channels);
  if (clean.kpis !== undefined) clean.kpis = sanitizeKpis(clean.kpis);
  if (clean.budget !== undefined) {
    clean.budget =
      Number.isFinite(Number(clean.budget)) && clean.budget !== null && clean.budget !== ''
        ? Number(clean.budget)
        : undefined;
  }
  if (clean.ownerId !== undefined) {
    const owner = resolveOwner({ ownerId: clean.ownerId, ownerName: patch.ownerName });
    if (owner.ownerId) {
      clean.ownerId = owner.ownerId;
      clean.ownerName = owner.ownerName;
    } else {
      delete clean.ownerId;
      delete clean.ownerName;
    }
  }

  return store.update('campaigns', id, clean);
};

module.exports = {
  CHANNELS,
  STATUS_VALUES,
  createCampaign,
  updateCampaign,
  findById,
  listForClient
};
