const crypto = require('crypto');
const store = require('../store');

const VAULT_SECTIONS = ['credentials', 'cards', 'links', 'socials', 'files'];
const DEFAULT_VAULT = {
  credentials: [],
  cards: [],
  links: [],
  socials: [],
  files: []
};

const SERVICE_TYPES = ['SEO', 'GBP', 'Social Media', 'Ads', 'Development', 'Other'];
const SERVICE_PREFIXES = {
  SEO: 'C-SEO',
  GBP: 'C-GBP',
  'Social Media': 'C-SOC',
  Ads: 'C-ADS',
  Development: 'C-DEV',
  Other: 'C-OTH'
};

const OPTIONAL_FIELDS = [
  'subService',
  'startDate',
  'package',
  'monthlyFee',
  'contactPerson',
  'contactEmail',
  'contactPhone',
  'websiteUrl',
  'gbpUrl',
  'socialProfiles',
  'notes'
];

const nextClientId = (serviceType) => {
  const prefix = SERVICE_PREFIXES[serviceType] || 'C-OTH';
  let max = 0;
  store.find('clients').forEach((c) => {
    if (typeof c.clientId === 'string' && c.clientId.startsWith(`${prefix}-`)) {
      const n = parseInt(c.clientId.slice(prefix.length + 1), 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  });
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
};

const findById = (id) => store.findById('clients', id);

const createClient = (data = {}) => {
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  if (!name) throw Object.assign(new Error('Client name is required'), { name: 'ValidationError' });
  if (!SERVICE_TYPES.includes(data.serviceType)) throw Object.assign(new Error('Service type is required'), { name: 'ValidationError' });

  const doc = {
    clientId: nextClientId(data.serviceType),
    name,
    serviceType: data.serviceType,
    status: data.status || 'Active'
  };
  OPTIONAL_FIELDS.forEach((field) => {
    if (data[field] !== undefined) doc[field] = data[field];
  });
  return store.insert('clients', doc);
};

const updateClient = (id, patch = {}) => {
  const current = store.findById('clients', id);
  if (!current) return undefined;
  const clean = { ...patch };
  delete clean._id;
  delete clean.clientId;
  delete clean.createdAt;
  return store.update('clients', id, clean);
};

const getVault = (clientId) => {
  const client = store.findById('clients', clientId);
  if (!client) return undefined;
  const vault = { ...DEFAULT_VAULT, ...(client.vault || {}) };
  VAULT_SECTIONS.forEach((section) => {
    vault[section] = (Array.isArray(vault[section]) ? vault[section] : []).map((item) =>
      item && typeof item === 'object' && !Array.isArray(item)
        ? { ...item, id: item.id || crypto.randomUUID() }
        : { id: crypto.randomUUID(), value: item }
    );
  });
  return vault;
};

const updateVault = (clientId, patch = {}) => {
  const client = store.findById('clients', clientId);
  if (!client) return undefined;
  const current = getVault(clientId);
  const next = { ...current };
  VAULT_SECTIONS.forEach((section) => {
    if (Array.isArray(patch[section])) {
      next[section] = patch[section]
        .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
        .map((item) => ({ ...item, id: item.id || crypto.randomUUID() }));
    }
  });
  const updated = store.update('clients', clientId, { vault: next });
  return updated ? next : undefined;
};

module.exports = { createClient, updateClient, findById, getVault, updateVault, VAULT_SECTIONS, SERVICE_TYPES };
