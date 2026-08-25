const express = require('express');
const store = require('../store');
const Campaign = require('../models/Campaign');
const Task = require('../models/Task');
const { logActivity } = require('../models/Activity');
const { auth, managerOnly } = require('../middleware/auth');

const router = express.Router();

const teamClientIds = (userId) =>
  new Set(
    store
      .find('tasks', (t) => String(t.assignedTo) === String(userId))
      .map((t) => String(t.client))
  );

const populateCampaign = (campaign) => {
  const client = store.findById('clients', campaign.clientId);
  return {
    ...campaign,
    clientId: client
      ? { _id: client._id, name: client.name }
      : campaign.clientId
  };
};

const populateCampaignTask = (task) => {
  const assignee = store.findById('users', task.assignedTo);
  const client = store.findById('clients', task.client);
  return {
    ...task,
    assignedTo: assignee
      ? { _id: assignee._id, name: assignee.name, department: assignee.department }
      : task.assignedTo,
    client: client ? { _id: client._id, name: client.name } : task.client
  };
};

router.get('/', auth, (req, res, next) => {
  try {
    const { clientId, status } = req.query;
    let campaigns = store.find('campaigns');
    if (clientId) campaigns = campaigns.filter((c) => String(c.clientId) === String(clientId));
    if (status) campaigns = campaigns.filter((c) => c.status === status);
    if (req.user.role === 'team') {
      const accessible = teamClientIds(req.user._id);
      campaigns = campaigns.filter((c) => accessible.has(String(c.clientId)));
    }
    campaigns.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.json(campaigns.map(populateCampaign));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, (req, res, next) => {
  try {
    const campaign = Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (
      req.user.role === 'team' &&
      !teamClientIds(req.user._id).has(String(campaign.clientId))
    ) {
      return res.status(403).json({ message: 'You can only view campaigns you work with' });
    }
    res.json(populateCampaign(campaign));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/tasks', auth, (req, res, next) => {
  try {
    const campaign = Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    if (
      req.user.role === 'team' &&
      !teamClientIds(req.user._id).has(String(campaign.clientId))
    ) {
      return res.status(403).json({ message: 'You can only view campaigns you work with' });
    }
    let tasks = store.find('tasks', (t) => String(t.campaignId) === String(campaign._id));
    if (req.user.role === 'team') {
      tasks = tasks.filter((t) => String(t.assignedTo) === String(req.user._id));
    }
    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(tasks.map(populateCampaignTask));
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, managerOnly, (req, res, next) => {
  try {
    const campaign = Campaign.createCampaign(req.body || {});
    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'created campaign',
      targetType: 'campaign',
      targetId: String(campaign._id),
      targetName: campaign.name
    });
    res.status(201).json(populateCampaign(campaign));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, managerOnly, (req, res, next) => {
  try {
    const campaign = Campaign.updateCampaign(req.params.id, req.body || {});
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'updated campaign',
      targetType: 'campaign',
      targetId: String(campaign._id),
      targetName: campaign.name
    });
    res.json(populateCampaign(campaign));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, managerOnly, (req, res, next) => {
  try {
    const campaign = store.delete('campaigns', req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
    store.find('tasks', (t) => String(t.campaignId) === String(campaign._id)).forEach((t) => {
      Task.updateTask(t._id, { campaignId: null });
    });
    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'deleted campaign',
      targetType: 'campaign',
      targetId: String(campaign._id),
      targetName: campaign.name
    });
    res.json({ message: `Campaign ${campaign.name} deleted` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
