const express = require('express');
const crypto = require('crypto');
const store = require('../store');
const Task = require('../models/Task');
const Client = require('../models/Client');
const User = require('../models/User');
const { logActivity } = require('../models/Activity');
const { createNotification } = require('../models/Notification');
const { auth, managerOnly } = require('../middleware/auth');
const { sendMail, userEmail } = require('../services/mailer');

const router = express.Router();

const populateTask = (task) => {
  const client = store.findById('clients', task.client);
  const assignee = store.findById('users', task.assignedTo);
  const campaign = task.campaignId ? store.findById('campaigns', task.campaignId) : null;
  const totalMinutes = Task.computeTotalMinutes(task);
  return {
    ...task,
    ...(totalMinutes > 0 ? { timeSpent: Math.round((totalMinutes / 60) * 100) / 100 } : {}),
    totalMinutes,
    client: client
      ? { _id: client._id, name: client.name, serviceType: client.serviceType, clientId: client.clientId }
      : task.client,
    assignedTo: assignee
      ? { _id: assignee._id, name: assignee.name, department: assignee.department }
      : task.assignedTo,
    ...(campaign ? { campaign: { _id: campaign._id, name: campaign.name } } : {})
  };
};

const matchesSearch = (task, search) => {
  const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return rx.test(task.title || '') || rx.test(task.clientName || '') || rx.test(task.taskId || '');
};

router.get('/', auth, (req, res, next) => {
  try {
    const { status, priority, serviceType, assignedTo, client, search } = req.query;
    let tasks = store.find('tasks');

    if (req.user.role === 'team') {
      tasks = tasks.filter((t) => String(t.assignedTo) === String(req.user._id));
    }
    if (status) tasks = tasks.filter((t) => t.status === status);
    if (priority) tasks = tasks.filter((t) => t.priority === priority);
    if (serviceType) tasks = tasks.filter((t) => t.serviceType === serviceType);
    if (assignedTo && req.user.role === 'manager') {
      tasks = tasks.filter((t) => String(t.assignedTo) === String(assignedTo));
    }
    if (client) tasks = tasks.filter((t) => String(t.client) === String(client));
    if (search) tasks = tasks.filter((t) => matchesSearch(t, search));

    tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(tasks.map(populateTask));
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, managerOnly, (req, res, next) => {
  try {
    const payload = { ...req.body, createdBy: req.user._id };

    if (!payload.serviceType && payload.client) {
      const clientDoc = Client.findById(payload.client);
      if (!clientDoc) return res.status(404).json({ message: 'Client not found' });
      payload.serviceType = clientDoc.serviceType;
    }
    if (payload.client && !payload.clientName) {
      const clientDoc = Client.findById(payload.client);
      payload.clientName = clientDoc?.name;
    }
    if (payload.assignedTo && !payload.assignedToName) {
      const userDoc = User.findById(payload.assignedTo);
      if (!userDoc) return res.status(404).json({ message: 'Assignee not found' });
      payload.assignedToName = userDoc.name;
      if (!payload.department) payload.department = userDoc.department;
    }
    if (!payload.dueDate) return res.status(400).json({ message: 'Due date is required' });
    if (!payload.title) return res.status(400).json({ message: 'Title is required' });

    const task = Task.createTask(payload);
    if (task.assignedTo && String(task.assignedTo) !== String(req.user._id)) {
      createNotification({
        userId: task.assignedTo,
        type: 'assignment',
        title: 'New task assigned',
        body: `${task.title} — due ${String(task.dueDate).slice(0, 10)}`,
        targetId: String(task._id)
      });
      sendMail({
        to: userEmail(task.assignedTo),
        actorEmail: req.user.email,
        actorName: req.user.name,
        subject: `New task assigned: ${task.title}`,
        title: 'You have a new task',
        lines: [
          ['Task', task.title],
          ['Client', task.clientName || '-'],
          ['Priority', task.priority],
          ['Due date', String(task.dueDate).slice(0, 10)],
          ['Assigned by', req.user.name]
        ],
        actionText: 'Open Task'
      });
    }
    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'created task',
      targetType: 'task',
      targetId: String(task._id),
      targetName: task.title,
      details: `Assigned to ${task.assignedToName}`
    });

    res.status(201).json(populateTask(task));
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const task = Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const oldStatus = task.status;
    const isManager = req.user.role === 'manager';
    const isAssignee = String(task.assignedTo) === String(req.user._id);
    if (!isManager && !isAssignee) {
      return res.status(403).json({ message: 'You can only update tasks assigned to you' });
    }

    const patch = {};

    if (isManager) {
      const editable = ['title', 'description', 'priority', 'status', 'dueDate', 'assignedTo', 'client', 'timeSpent', 'recurrence', 'campaignId'];
      editable.forEach((field) => {
        if (req.body[field] !== undefined) patch[field] = req.body[field];
      });
      if (patch.campaignId && !store.findById('campaigns', patch.campaignId)) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      if (req.body.assignedTo && String(req.body.assignedTo) !== String(task.assignedTo)) {
        const userDoc = User.findById(req.body.assignedTo);
        if (!userDoc) return res.status(404).json({ message: 'Assignee not found' });
        patch.assignedToName = userDoc.name;
        patch.department = req.body.department || userDoc.department;
      }
      if (req.body.client && String(req.body.client) !== String(task.client)) {
        const clientDoc = Client.findById(req.body.client);
        if (!clientDoc) return res.status(404).json({ message: 'Client not found' });
        patch.clientName = clientDoc.name;
        patch.serviceType = clientDoc.serviceType;
      }
    } else if (req.body.status !== undefined) {
      patch.status = req.body.status;
    }

    if (req.body.status === 'Completed' && oldStatus !== 'Completed') {
      patch.completedAt = new Date().toISOString();
    } else if (req.body.status && req.body.status !== 'Completed' && oldStatus === 'Completed') {
      patch.completedAt = null;
    }

    if (typeof req.body.updateNote === 'string' && req.body.updateNote.trim()) {
      patch.updates = [
        ...(task.updates || []),
        {
          date: new Date().toISOString(),
          note: req.body.updateNote.trim(),
          updatedBy: req.user._id,
          updatedByName: req.user.name
        }
      ];
    }

    const saved = Task.updateTask(req.params.id, patch);

    if (patch.status && patch.status !== oldStatus && saved.createdBy && String(saved.createdBy) !== String(req.user._id)) {
      createNotification({
        userId: saved.createdBy,
        type: 'status',
        title: `Task moved to ${saved.status}`,
        body: saved.title
      });
      if (saved.status === 'Completed') {
        sendMail({
          to: userEmail(saved.createdBy),
          actorEmail: req.user.email,
          actorName: req.user.name,
          subject: `Task completed: ${saved.title}`,
          title: 'Your task was completed',
          lines: [
            ['Task', saved.title],
            ['Completed by', req.user.name],
            ['Time logged', `${Task.computeTotalMinutes(saved)}m`]
          ],
          actionText: 'Review Task'
        });
      }
    }

    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: req.body.status ? `updated task to ${saved.status}` : 'updated task',
      targetType: 'task',
      targetId: String(saved._id),
      targetName: saved.title
    });

    res.json(populateTask(saved));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/time', auth, (req, res, next) => {
  try {
    const task = Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isManager = req.user.role === 'manager';
    const isAssignee = String(task.assignedTo) === String(req.user._id);
    if (!isManager && !isAssignee) {
      return res.status(403).json({ message: 'Only the manager or the assignee can log time' });
    }

    const minutes = Number(req.body.minutes);
    if (!Number.isInteger(minutes) || minutes <= 0) {
      return res.status(400).json({ message: 'Minutes must be a positive integer' });
    }

    const date = req.body.date ? new Date(req.body.date) : new Date();
    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }

    const saved = Task.addTimeLog(task._id, {
      userId: req.user._id,
      userName: req.user.name,
      minutes,
      billable: Boolean(req.body.billable),
      note: typeof req.body.note === 'string' ? req.body.note.trim() : '',
      date
    });

    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'logged time',
      targetType: 'task',
      targetId: String(saved._id),
      targetName: saved.title,
      details: `${minutes}m`
    });

    res.status(201).json(populateTask(saved));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/time/:logId', auth, (req, res, next) => {
  try {
    const task = Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isManager = req.user.role === 'manager';
    const log = (task.timeLogs || []).find((l) => l._id === req.params.logId);
    if (!log) return res.status(404).json({ message: 'Time log not found' });
    if (!isManager && String(log.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only delete your own time logs' });
    }

    const saved = Task.removeTimeLog(task._id, req.params.logId);
    res.json(populateTask(saved));
  } catch (err) {
    next(err);
  }
});

router.get('/:id/comments', auth, (req, res, next) => {
  try {
    const task = Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isManager = req.user.role === 'manager';
    const isAssignee = String(task.assignedTo) === String(req.user._id);
    if (!isManager && !isAssignee) {
      return res.status(403).json({ message: 'Only the manager or the assignee can view comments' });
    }

    res.json({ comments: task.comments || [] });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/comments', auth, (req, res, next) => {
  try {
    const task = Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isManager = req.user.role === 'manager';
    const isAssignee = String(task.assignedTo) === String(req.user._id);
    if (!isManager && !isAssignee) {
      return res.status(403).json({ message: 'Only the manager or the assignee can comment' });
    }

    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    const mentions = Array.isArray(req.body.mentions)
      ? [...new Set(req.body.mentions.map(String))]
      : [];

    const comment = {
      _id: crypto.randomUUID(),
      text,
      userId: req.user._id,
      userName: req.user.name,
      mentions,
      createdAt: new Date().toISOString()
    };

    const saved = Task.updateTask(task._id, { comments: [...(task.comments || []), comment] });

    if (saved.assignedTo && String(saved.assignedTo) !== String(req.user._id)) {
      createNotification({
        userId: saved.assignedTo,
        type: 'comment',
        title: 'New comment on your task',
        body: text.length > 120 ? `${text.slice(0, 117)}...` : text,
        targetId: String(saved._id)
      });
      sendMail({
        to: userEmail(saved.assignedTo),
        actorEmail: req.user.email,
        actorName: req.user.name,
        subject: `New comment on: ${saved.title}`,
        title: 'New comment on your task',
        lines: [
          ['Task', saved.title],
          ['Comment by', req.user.name],
          ['Message', text.length > 200 ? `${text.slice(0, 197)}...` : text]
        ],
        actionText: 'Reply'
      });
    }
    mentions.forEach((userId) => {
      if (String(userId) === String(req.user._id)) return;
      createNotification({
        userId,
        type: 'mention',
        title: `${req.user.name} mentioned you`,
        body: text.length > 120 ? `${text.slice(0, 117)}...` : text,
        targetId: String(saved._id)
      });
      const mentioned = store.findById('users', userId);
      if (mentioned) {
        sendMail({
          to: mentioned.email,
          actorEmail: req.user.email,
          actorName: req.user.name,
          subject: `${req.user.name} mentioned you in: ${saved.title}`,
          title: 'You were mentioned in a task',
          lines: [
            ['Task', saved.title],
            ['Mentioned by', req.user.name],
            ['Message', text.length > 200 ? `${text.slice(0, 197)}...` : text]
          ],
          actionText: 'View Task'
        });
      }
    });

    res.status(201).json(populateTask(saved));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/comments/:commentId', auth, (req, res, next) => {
  try {
    const task = Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isManager = req.user.role === 'manager';
    const comment = (task.comments || []).find((c) => c._id === req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (!isManager && String(comment.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }

    const saved = Task.updateTask(
      task._id,
      { comments: task.comments.filter((c) => c._id !== req.params.commentId) }
    );
    res.json(populateTask(saved));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, managerOnly, (req, res, next) => {
  try {
    const task = store.delete('tasks', req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    logActivity({
      user: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'deleted task',
      targetType: 'task',
      targetId: String(task._id),
      targetName: task.title
    });
    res.json({ message: `Task ${task.taskId} deleted` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
