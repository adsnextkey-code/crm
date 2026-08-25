const express = require('express');
const store = require('../store');
const Client = require('../models/Client');
const Report = require('../models/Report');
const Activity = require('../models/Activity');
const { auth, managerOnly } = require('../middleware/auth');

const router = express.Router();

const logActivity = (req, action, targetType, targetId, targetName, details) =>
  Activity.logActivity({
    user: req.user._id,
    userName: req.user.name,
    userRole: req.user.role,
    action,
    targetType,
    targetId,
    targetName,
    details
  });

const vaultManagerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'manager') return next();
  return res.status(403).json({ message: 'Manager access only' });
};

const hasOversizedFile = (items) =>
  Array.isArray(items) &&
  items.some(
    (item) => item && typeof item.fileData === 'string' && item.fileData.length > Report.MAX_FILE_CHARS
  );

const teamHasClientAccess = (userId, clientId) =>
  store.count(
    'tasks',
    (t) => String(t.assignedTo) === String(userId) && String(t.client) === String(clientId)
  ) > 0;

router.get('/', auth, (req, res, next) => {
  try {
    const { serviceType, status, search } = req.query;
    let clients = store.find('clients');
    if (serviceType) clients = clients.filter((c) => c.serviceType === serviceType);
    if (status) clients = clients.filter((c) => c.status === status);
    if (search) {
      const s = String(search).toLowerCase();
      clients = clients.filter(
        (c) =>
          (c.name || '').toLowerCase().includes(s) ||
          (c.contactPerson || '').toLowerCase().includes(s) ||
          (c.clientId || '').toLowerCase().includes(s)
      );
    }
    clients.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (req.user.role === 'team') {
      const myClientIds = new Set(
        store
          .find('tasks', (t) => String(t.assignedTo) === String(req.user._id))
          .map((t) => String(t.client))
      );
      clients = clients.filter((c) => myClientIds.has(String(c._id)));
      const SAFE_FIELDS = ['_id', 'clientId', 'name', 'serviceType', 'status', 'package'];
      clients = clients.map((c) =>
        SAFE_FIELDS.reduce((acc, f) => {
          if (c[f] !== undefined) acc[f] = c[f];
          return acc;
        }, {})
      );
    }
    res.json(clients);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, (req, res, next) => {
  try {
    const client = Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    if (req.user.role === 'team' && !teamHasClientAccess(req.user._id, client._id)) {
      return res.status(403).json({ message: 'You can only view clients you work with' });
    }
    const isTeam = req.user.role === 'team';
    const taskFilter = isTeam
      ? (t) => String(t.client) === String(client._id) && String(t.assignedTo) === String(req.user._id)
      : (t) => String(t.client) === String(client._id);
    const tasks = store
      .find('tasks', taskFilter)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    delete client.vault;
    if (req.user.role === 'team') {
      const SAFE_FIELDS = ['_id', 'clientId', 'name', 'serviceType', 'status', 'package'];
      const scoped = SAFE_FIELDS.reduce((acc, f) => {
        if (client[f] !== undefined) acc[f] = client[f];
        return acc;
      }, {});
      return res.json({ ...scoped, tasks });
    }
    res.json({ ...client, tasks });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/vault', auth, vaultManagerOnly, (req, res, next) => {
  try {
    const client = Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(Client.getVault(client._id));
  } catch (err) {
    next(err);
  }
});

router.put('/:id/vault', auth, vaultManagerOnly, (req, res, next) => {
  try {
    const client = Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    for (const section of Client.VAULT_SECTIONS) {
      if (hasOversizedFile(req.body && req.body[section])) {
        return res.status(400).json({ message: 'File too large (max 2MB)' });
      }
    }
    const vault = Client.updateVault(req.params.id, req.body || {});
    logActivity(req, 'updated client vault', 'client', String(client._id), client.name);
    res.json(vault);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/reports', auth, (req, res, next) => {
  try {
    const client = Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    if (req.user.role === 'team' && !teamHasClientAccess(req.user._id, client._id)) {
      return res.status(403).json({ message: 'You can only view reports for clients you work with' });
    }
    res.json(Report.listReports(client._id));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reports', auth, (req, res, next) => {
  try {
    const client = Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    if (req.user.role === 'team' && !teamHasClientAccess(req.user._id, client._id)) {
      return res.status(403).json({ message: 'You can only upload reports for clients you work with' });
    }
    const { title, period, note, fileName, fileType, fileSize, fileData } = req.body || {};
    if (typeof fileData === 'string' && fileData.length > Report.MAX_FILE_CHARS) {
      return res.status(400).json({ message: 'File too large (max 2MB)' });
    }
    const report = Report.createReport({
      clientId: client._id,
      title,
      period,
      note,
      fileName,
      fileType,
      fileSize,
      fileData,
      createdBy: req.user._id,
      createdByName: req.user.name
    });
    logActivity(req, 'uploaded client report', 'client', String(client._id), client.name, report.title);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/reports/:reportId', auth, (req, res, next) => {
  try {
    const client = Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    if (req.user.role === 'team' && !teamHasClientAccess(req.user._id, client._id)) {
      return res.status(403).json({ message: 'You can only manage reports for clients you work with' });
    }
    const report = Report.findById(req.params.reportId);
    if (!report || String(report.clientId) !== String(client._id)) {
      return res.status(404).json({ message: 'Report not found' });
    }
    if (req.user.role !== 'manager' && String(report.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only delete your own reports' });
    }
    Report.deleteReport(report._id);
    res.json({ message: 'Report deleted' });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, managerOnly, (req, res, next) => {
  try {
    const client = Client.createClient(req.body);
    logActivity(req, 'created client', 'client', String(client._id), client.name);
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, managerOnly, (req, res, next) => {
  try {
    const client = Client.updateClient(req.params.id, req.body);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    logActivity(req, 'updated client', 'client', String(client._id), client.name);
    res.json(client);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, managerOnly, (req, res, next) => {
  try {
    const client = store.delete('clients', req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    logActivity(req, 'deleted client', 'client', String(client._id), client.name);
    res.json({ message: `Client ${client.clientId} deleted` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
