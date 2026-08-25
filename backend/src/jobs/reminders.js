const store = require('../store');
const { createNotification } = require('../models/Notification');
const { sendMail, userEmail } = require('../services/mailer');

const SCAN_INTERVAL_MS = 60 * 60 * 1000;
let started = false;

const hasUnreadReminder = (taskId, userId) =>
  store.findOne(
    'notifications',
    (n) =>
      n.type === 'reminder' &&
      !n.read &&
      String(n.targetId) === String(taskId) &&
      String(n.userId) === String(userId)
  );

const scan = () => {
  const now = Date.now();
  const overdue = store.find(
    'tasks',
    (t) =>
      t.status !== 'Completed' &&
      t.status !== 'Cancelled' &&
      t.assignedTo &&
      t.dueDate &&
      new Date(t.dueDate).getTime() < now
  );

  let created = 0;
  overdue.forEach((task) => {
    if (hasUnreadReminder(task._id, task.assignedTo)) return;
    createNotification({
      userId: task.assignedTo,
      type: 'reminder',
      title: 'Task overdue',
      body: `${task.title} was due ${String(task.dueDate).slice(0, 10)}`,
      targetId: String(task._id)
    });
    const manager = store.findOne('users', (u) => u.role === 'manager' && u.isActive !== false);
    sendMail({
      to: userEmail(task.assignedTo),
      actorEmail: manager?.email,
      actorName: manager?.name,
      subject: `Overdue task: ${task.title}`,
      title: 'Task overdue reminder',
      lines: [
        ['Task', task.title],
        ['Due date', String(task.dueDate).slice(0, 10)],
        ['Status', task.status]
      ],
      actionText: 'Open Task'
    });
    created++;
  });
  return created;
};

const startReminderJob = () => {
  if (started) return scan();
  started = true;
  try {
    const count = scan();
    if (count > 0) console.log(`Reminder job: created ${count} overdue notification(s)`);
  } catch (err) {
    console.error('Reminder job failed:', err.message);
  }
  const timer = setInterval(() => {
    try {
      scan();
    } catch (err) {
      console.error('Reminder job failed:', err.message);
    }
  }, SCAN_INTERVAL_MS);
  timer.unref();
  return 0;
};

module.exports = { startReminderJob, scan };
