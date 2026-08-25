const express = require('express');
const store = require('../store');
const { auth } = require('../middleware/auth');

const router = express.Router();

const isActiveTask = (t) => !['Completed', 'Cancelled'].includes(t.status);

router.get('/stats', auth, (req, res, next) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const isTeam = req.user.role === 'team';

    const clients = store.find('clients');
    const allTasks = store.find('tasks');
    const activities = store.find('activities');

    const tasks = isTeam
      ? allTasks.filter((t) => String(t.assignedTo) === String(req.user._id))
      : allTasks;

    // Team members only see clients they have tasks with (same as their
    // Clients page), so the dashboard card matches the list for both roles.
    let visibleClients = clients;
    if (isTeam) {
      const myClientIds = new Set(tasks.map((t) => String(t.client)));
      visibleClients = clients.filter((c) => myClientIds.has(String(c._id)));
    }
    const totalClients = visibleClients.filter((c) => c.status === 'Active').length;

    const scopedClients = isTeam ? clients.filter((c) =>
      tasks.some((t) => String(t.client) === String(c._id))
    ) : clients;

    const clientsByServiceType = Object.entries(
      scopedClients.reduce((acc, c) => {
        acc[c.serviceType] = (acc[c.serviceType] || 0) + 1;
        return acc;
      }, {})
    ).map(([serviceType, count]) => ({ serviceType, count }));

    let teamWorkload = [];
    if (!isTeam) {
      const members = store.find('users', (u) => u.isActive && u.role === 'team');
      teamWorkload = members.map((member) => {
        const mine = tasks.filter((t) => String(t.assignedTo) === String(member._id));
        return {
          id: member._id,
          name: member.name,
          department: member.department,
          designation: member.designation,
          assigned: mine.filter(isActiveTask).length,
          pending: mine.filter((t) => t.status === 'Pending').length,
          inProgress: mine.filter((t) => t.status === 'In Progress').length,
          completed: mine.filter((t) => t.status === 'Completed').length,
          overdue: mine.filter((t) => isActiveTask(t) && new Date(t.dueDate) < now).length
        };
      });
    }

    let recentActivity = activities
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (isTeam) {
      recentActivity = recentActivity.filter(
        (a) => a.user != null && String(a.user) === String(req.user._id)
      );
    }
    recentActivity = recentActivity.slice(0, 20);

    const upcomingTasks = tasks
      .filter((t) => isActiveTask(t) && new Date(t.dueDate) >= now)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 8)
      .map((t) => {
        const client = store.findById('clients', t.client);
        const assignee = store.findById('users', t.assignedTo);
        return {
          ...t,
          client: client ? { _id: client._id, name: client.name } : t.client,
          assignedTo: assignee ? { _id: assignee._id, name: assignee.name } : t.assignedTo
        };
      });

    res.json({
      totalClients,
      clientsByServiceType,
      totalTasks: tasks.length,
      pendingTasks: tasks.filter((t) => t.status === 'Pending').length,
      inProgressTasks: tasks.filter((t) => t.status === 'In Progress').length,
      reviewTasks: tasks.filter((t) => t.status === 'Review').length,
      completedTasks: tasks.filter((t) => t.status === 'Completed').length,
      highPriorityTasks: tasks.filter((t) => t.priority === 'High' && isActiveTask(t)).length,
      overdueTasks: tasks.filter((t) => isActiveTask(t) && new Date(t.dueDate) < now).length,
      completedThisWeek: tasks.filter(
        (t) => t.status === 'Completed' && t.completedAt && new Date(t.completedAt) >= weekAgo
      ).length,
      teamWorkload,
      recentActivity,
      upcomingTasks
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
