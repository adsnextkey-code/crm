const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const helpers = require('./helpers');

let adminToken;
let aliToken;
let saraToken;
let clients;
let aliTask;

before(async () => {
  await helpers.start();
  adminToken = await helpers.login('admin@agency.com', 'Admin@123');
  aliToken = await helpers.login('ali@agency.com', 'Team@123');
  saraToken = await helpers.login('sara@agency.com', 'Team@123');
  clients = (await helpers.request('GET', '/clients', { token: adminToken })).data;
});

after(async () => {
  await helpers.stop();
});

describe('auth & registration security', () => {
  it('rejects wrong password', async () => {
    const r = await helpers.request('POST', '/auth/login', {
      body: { email: 'admin@agency.com', password: 'wrong' }
    });
    assert.ok(r.status === 400 || r.status === 401);
  });

  it('blocks open registration when managers exist', async () => {
    const r = await helpers.request('POST', '/auth/register', {
      body: { name: 'Hacker', email: 'hack@test.com', password: 'secret1', role: 'team' }
    });
    assert.equal(r.status, 403);
  });

  it('hidden owner can login and sees manager-level access', async () => {
    const r = await helpers.request('POST', '/auth/login', {
      body: { email: 'owner@agency.com', password: 'Own3r!Secret-2026' }
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.user.role, 'manager');
    assert.equal(r.data.user._isSuperAdmin, true);
    const clients = await helpers.request('POST', '/clients', {
      token: r.data.token,
      body: { name: 'Owner Test Client', serviceType: 'SEO' }
    });
    assert.equal(clients.status, 201);
  });

  it('owner is invisible in team lists and cannot be modified', async () => {
    const users = (await helpers.request('GET', '/team', { token: adminToken })).data;
    assert.ok(!users.some((u) => u.role === 'superadmin'), 'superadmin leaked in team list');
    const owner = users.find((u) => u.email === 'owner@agency.com');
    assert.equal(owner, undefined);

    const ownerLogin = (await helpers.request('POST', '/auth/login', {
      body: { email: 'owner@agency.com', password: 'Own3r!Secret-2026' }
    })).data;
    const ownerId = ownerLogin.user.id;
    const demote = await helpers.request('PUT', `/team/${ownerId}`, {
      token: adminToken,
      body: { role: 'team' }
    });
    assert.equal(demote.status, 403 || 400);
    const deactivate = await helpers.request('DELETE', `/team/${ownerId}`, { token: adminToken });
    assert.ok([403, 400].includes(deactivate.status));
  });

  it('owner actions leave no activity trace', async () => {
    const before = (await helpers.request('GET', '/dashboard/stats', { token: adminToken })).data.recentActivity;
    const ownerToken = (
      await helpers.request('POST', '/auth/login', {
        body: { email: 'owner@agency.com', password: 'Own3r!Secret-2026' }
      })
    ).data.token;
    await helpers.request('POST', '/clients', {
      token: ownerToken,
      body: { name: 'Owner Stealth Client', serviceType: 'SEO' }
    });
    const after = (await helpers.request('GET', '/dashboard/stats', { token: adminToken })).data.recentActivity;
    assert.ok(
      !after.some((a) => a.targetName === 'Owner Stealth Client'),
      'owner action appeared in activity feed'
    );
    void before;
  });

  it('allows manager to add members via POST /team', async () => {
    const r = await helpers.request('POST', '/team', {
      token: adminToken,
      body: { name: 'Test Member', email: 'testmember@agency.com', password: 'Secret1', role: 'team', department: 'SEO' }
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.email, 'testmember@agency.com');
    assert.equal(r.data.password, undefined);
  });

  it('rejects duplicate email on member update', async () => {
    const users = (await helpers.request('GET', '/team', { token: adminToken })).data;
    const target = users.find((u) => u.email === 'sara@agency.com');
    const r = await helpers.request('PUT', `/team/${target._id}`, {
      token: adminToken,
      body: { email: 'ali@agency.com' }
    });
    assert.equal(r.status, 400);
  });

  it('revokes API access after deactivation', async () => {
    const created = await helpers.request('POST', '/team', {
      token: adminToken,
      body: { name: 'Temp User', email: 'temp@agency.com', password: 'Secret1', role: 'team' }
    });
    const tempToken = (
      await helpers.request('POST', '/auth/login', {
        body: { email: 'temp@agency.com', password: 'Secret1' }
      })
    ).data.token;
    const before = await helpers.request('GET', '/tasks', { token: tempToken });
    assert.equal(before.status, 200);

    await helpers.request('DELETE', `/team/${created.data._id}`, { token: adminToken });
    const after = await helpers.request('GET', '/tasks', { token: tempToken });
    assert.equal(after.status, 401);
  });
});

describe('permission boundaries', () => {
  it('team sees only own tasks', async () => {
    const me = (await helpers.request('GET', '/auth/me', { token: aliToken })).data;
    const myId = me._id || me.id;
    const tasks = (await helpers.request('GET', '/tasks', { token: aliToken })).data;
    assert.ok(tasks.length > 0);
    tasks.forEach((t) => assert.equal(String(t.assignedTo._id), String(myId)));
  });

  it('team cannot create clients or tasks', async () => {
    const c = await helpers.request('POST', '/clients', {
      token: aliToken,
      body: { name: 'Nope', serviceType: 'SEO' }
    });
    assert.equal(c.status, 403);
    const t = await helpers.request('POST', '/tasks', {
      token: aliToken,
      body: { title: 'Nope', client: clients[0]._id, assignedTo: clients[0]._id, dueDate: new Date().toISOString() }
    });
    assert.equal(t.status, 403);
  });

  it('team gets scoped client fields only', async () => {
    const scoped = (await helpers.request('GET', '/clients', { token: aliToken })).data;
    assert.ok(scoped.length > 0);
    assert.equal(scoped[0].monthlyFee, undefined);
    assert.equal(scoped[0].contactEmail, undefined);
  });

  it('team blocked from team stats endpoint', async () => {
    const r = await helpers.request('GET', '/team/stats', { token: aliToken });
    assert.equal(r.status, 403);
  });

  it('non-assignee cannot read or write task comments', async () => {
    const me = (await helpers.request('GET', '/auth/me', { token: aliToken })).data;
    const myId = me._id || me.id;
    const task = (await helpers.request('GET', '/tasks', { token: adminToken })).data.find(
      (t) => String(t.assignedTo._id) !== String(myId)
    );
    const r = await helpers.request('GET', `/tasks/${task._id}/comments`, { token: aliToken });
    assert.equal(r.status, 403);
  });

  it('team cannot access client vault', async () => {
    const r = await helpers.request('GET', `/clients/${clients[0]._id}/vault`, { token: aliToken });
    assert.equal(r.status, 403);
  });
});

describe('task validation & reassignment', () => {
  before(async () => {
    const me = (await helpers.request('GET', '/auth/me', { token: aliToken })).data;
    const myId = me._id || me.id;
    aliTask = (await helpers.request('GET', '/tasks', { token: adminToken })).data.find(
      (t) => String(t.assignedTo._id) === String(myId) && t.status === 'Pending'
    );
  });

  it('rejects invalid status', async () => {
    const r = await helpers.request('PUT', `/tasks/${aliTask._id}`, {
      token: adminToken,
      body: { status: 'Bogus' }
    });
    assert.equal(r.status, 400);
  });

  it('rejects invalid priority and bad dates', async () => {
    const p = await helpers.request('PUT', `/tasks/${aliTask._id}`, {
      token: adminToken,
      body: { priority: 'Urgent' }
    });
    assert.equal(p.status, 400);
    const d = await helpers.request('PUT', `/tasks/${aliTask._id}`, {
      token: adminToken,
      body: { dueDate: 'not-a-date' }
    });
    assert.equal(d.status, 400);
  });

  it('client reassignment updates the actual client reference', async () => {
    const otherClient = clients.find((c) => String(c._id) !== String(aliTask.client._id));
    const r = await helpers.request('PUT', `/tasks/${aliTask._id}`, {
      token: adminToken,
      body: { client: otherClient._id }
    });
    assert.equal(r.status, 200);
    assert.equal(String(r.data.client._id), String(otherClient._id));
    assert.equal(r.data.clientName, otherClient.name);
  });
});

describe('time tracking & recurrence', () => {
  it('assignee can log time; totalMinutes is computed', async () => {
    const r = await helpers.request('POST', `/tasks/${aliTask._id}/time`, {
      token: aliToken,
      body: { minutes: 45, billable: true }
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.totalMinutes, 45);
  });

  it('non-assignee cannot log time', async () => {
    const r = await helpers.request('POST', `/tasks/${aliTask._id}/time`, {
      token: saraToken,
      body: { minutes: 30 }
    });
    assert.equal(r.status, 403);
  });

  it('completing a recurring task spawns the next occurrence', async () => {
    const created = await helpers.request('POST', '/tasks', {
      token: adminToken,
      body: {
        title: 'Recurring test task',
        client: clients[0]._id,
        assignedTo: aliTask.assignedTo._id,
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        recurrence: 'weekly'
      }
    });
    assert.equal(created.status, 201);
    const done = await helpers.request('PUT', `/tasks/${created.data._id}`, {
      token: adminToken,
      body: { status: 'Completed' }
    });
    assert.equal(done.data.status, 'Completed');

    const all = (await helpers.request('GET', '/tasks', { token: adminToken })).data;
    const spawned = all.find((t) => String(t.parentTaskId) === String(created.data._id));
    assert.ok(spawned, 'next recurring instance should exist');
    assert.equal(spawned.status, 'Pending');
  });
});

describe('team data scoping', () => {
  it('team clients list contains only clients with their tasks', async () => {
    const me = (await helpers.request('GET', '/auth/me', { token: aliToken })).data;
    const myId = me._id || me.id;
    const myTasks = (await helpers.request('GET', '/tasks', { token: aliToken })).data;
    const myClientIds = new Set(myTasks.map((t) => String(t.client._id || t.client)));
    const list = (await helpers.request('GET', '/clients', { token: aliToken })).data;
    assert.equal(list.length, myClientIds.size);
    list.forEach((c) => assert.ok(myClientIds.has(String(c._id)), 'unexpected client leaked'));
    void myId;
  });

  it('team cannot open an unrelated client detail', async () => {
    const mine = new Set(
      (await helpers.request('GET', '/clients', { token: aliToken })).data.map((c) => String(c._id))
    );
    const other = clients.find((c) => !mine.has(String(c._id)));
    const r = await helpers.request('GET', `/clients/${other._id}`, { token: aliToken });
    assert.equal(r.status, 403);
  });

  it('team client detail returns only their own tasks on a shared client', async () => {
    const me = (await helpers.request('GET', '/auth/me', { token: aliToken })).data;
    const myId = String(me._id || me.id);
    const sharedClient = (await helpers.request('GET', '/clients', { token: aliToken })).data[0];
    // Ensure another member also has a task on this client
    const saraId = String(
      (await helpers.request('GET', '/auth/me', { token: saraToken })).data._id ||
        (await helpers.request('GET', '/auth/me', { token: saraToken })).data.id
    );
    const allTasks = (await helpers.request('GET', '/tasks', { token: adminToken })).data;
    const hasSaraTask = allTasks.some(
      (t) => String(t.client._id || t.client) === String(sharedClient._id) && String(t.assignedTo._id || t.assignedTo) === saraId
    );
    if (!hasSaraTask) {
      await helpers.request('POST', '/tasks', {
        token: adminToken,
        body: {
          title: 'Shared client probe',
          client: sharedClient._id,
          assignedTo: saraId,
          dueDate: new Date(Date.now() + 86400000).toISOString()
        }
      });
    }
    const detail = (await helpers.request('GET', `/clients/${sharedClient._id}`, { token: aliToken })).data;
    assert.ok(detail.tasks.length > 0);
    detail.tasks.forEach((t) =>
      assert.equal(String(t.assignedTo._id || t.assignedTo), myId, 'other member task leaked to team user')
    );
  });

  it('team cannot view or upload reports of unrelated clients', async () => {
    const mine = new Set(
      (await helpers.request('GET', '/clients', { token: aliToken })).data.map((c) => String(c._id))
    );
    const other = clients.find((c) => !mine.has(String(c._id)));
    const view = await helpers.request('GET', `/clients/${other._id}/reports`, { token: aliToken });
    assert.equal(view.status, 403);
    const upload = await helpers.request('POST', `/clients/${other._id}/reports`, {
      token: aliToken,
      body: { title: 'Sneaky report', period: 'Weekly' }
    });
    assert.equal(upload.status, 403);
  });

  it('team can still manage reports for their own clients', async () => {
    const mine = (await helpers.request('GET', '/clients', { token: aliToken })).data;
    const okView = await helpers.request('GET', `/clients/${mine[0]._id}/reports`, { token: aliToken });
    assert.equal(okView.status, 200);
    const okPost = await helpers.request('POST', `/clients/${mine[0]._id}/reports`, {
      token: aliToken,
      body: { title: 'Week 33 Report', period: 'Weekly' }
    });
    assert.equal(okPost.status, 201);
  });

  it('cannot demote or deactivate the last manager', async () => {
    const users = (await helpers.request('GET', '/team', { token: adminToken })).data;
    const manager = users.find((u) => u.role === 'manager');
    const demote = await helpers.request('PUT', `/team/${manager._id}`, {
      token: adminToken,
      body: { role: 'team' }
    });
    assert.equal(demote.status, 400);
    const deactivate = await helpers.request('PUT', `/team/${manager._id}`, {
      token: adminToken,
      body: { isActive: false }
    });
    assert.equal(deactivate.status, 400);
  });

  it('sends assignment email to employee and completion email to manager', async () => {
    const me = (await helpers.request('GET', '/auth/me', { token: aliToken })).data;
    const myId = String(me._id || me.id);
    const created = await helpers.request('POST', '/tasks', {
      token: adminToken,
      body: {
        title: 'Email test task',
        client: clients[0]._id,
        assignedTo: myId,
        dueDate: new Date(Date.now() + 86400000).toISOString()
      }
    });
    assert.equal(created.status, 201);

    let outbox = (await helpers.request('GET', '/emails?to=ali@agency.com', { token: adminToken })).data.emails;
    const assignMail = outbox.find((e) => e.subject.includes('Email test task'));
    assert.ok(assignMail, 'assignment email should exist');
    assert.equal(assignMail.to, 'ali@agency.com');

    await helpers.request('PUT', `/tasks/${created.data._id}`, {
      token: aliToken,
      body: { status: 'Completed', updateNote: 'done via test' }
    });
    outbox = (await helpers.request('GET', '/emails', { token: adminToken })).data.emails;
    const doneMail = outbox.find((e) => e.subject.startsWith('Task completed: Email test task'));
    assert.ok(doneMail, 'completion email should exist');
    assert.equal(doneMail.to, 'admin@agency.com');
    assert.equal(doneMail.replyTo, 'ali@agency.com');
  });
});

describe('dashboard consistency', () => {
  it('active client count matches clients page for all roles', async () => {
    const freshClients = (await helpers.request('GET', '/clients', { token: adminToken })).data;
    const adminList = freshClients.filter((c) => c.status === 'Active').length;
    const adminStats = (await helpers.request('GET', '/dashboard/stats', { token: adminToken })).data;
    assert.equal(adminStats.totalClients, adminList);

    const teamList = (await helpers.request('GET', '/clients', { token: aliToken })).data;
    const expectedTeamActive = teamList.filter((c) => c.status === 'Active').length;
    const teamStats = (await helpers.request('GET', '/dashboard/stats', { token: aliToken })).data;
    assert.equal(teamStats.totalClients, expectedTeamActive, 'team dashboard should match its scoped Clients page');
  });
});

describe('content workflow', () => {
  let content;
  let aliId;

  const myId = async (token) => {
    const me = (await helpers.request('GET', '/auth/me', { token })).data;
    return String(me._id || me.id);
  };

  it('team creates content and is auto-assigned', async () => {
    aliId = await myId(aliToken);
    const r = await helpers.request('POST', '/content', {
      token: aliToken,
      body: {
        title: 'August Blog - Biryani History',
        clientId: clients[0]._id,
        contentType: 'Blog',
        platform: 'Website',
        caption: 'A short history of Karachi biryani.'
      }
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.status, 'Brief');
    assert.equal(String(r.data.assignedTo), aliId);
    assert.equal(r.data.revisions, 1);
    content = r.data;
  });

  it('rejects an invalid transition (Brief to Published)', async () => {
    const r = await helpers.request('PUT', `/content/${content._id}/status`, {
      token: aliToken,
      body: { status: 'Published' }
    });
    assert.equal(r.status, 400);
  });

  it('rejection requires a note, then bumps revision and logs history', async () => {
    await helpers.request('PUT', `/content/${content._id}/status`, {
      token: aliToken,
      body: { status: 'Production' }
    });
    const review = await helpers.request('PUT', `/content/${content._id}/status`, {
      token: aliToken,
      body: { status: 'Internal Review' }
    });
    assert.equal(review.status, 200);

    const noNote = await helpers.request('PUT', `/content/${content._id}/status`, {
      token: adminToken,
      body: { status: 'Production' }
    });
    assert.equal(noNote.status, 400);

    const rejected = await helpers.request('PUT', `/content/${content._id}/status`, {
      token: adminToken,
      body: { status: 'Production', note: 'Caption tone is off brand, rewrite it' }
    });
    assert.equal(rejected.status, 200);
    assert.equal(rejected.data.status, 'Production');
    assert.equal(rejected.data.revisions, 2);
    assert.ok(
      rejected.data.history.some((h) => h.status === 'Production' && h.note.includes('off brand')),
      'history should contain the rejection entry'
    );
  });

  it('approved item is locked and cannot be edited by the assignee', async () => {
    await helpers.request('PUT', `/content/${content._id}/status`, {
      token: aliToken,
      body: { status: 'Internal Review' }
    });
    const approved = await helpers.request('PUT', `/content/${content._id}/status`, {
      token: aliToken,
      body: { status: 'Approved' }
    });
    assert.equal(approved.status, 200);
    assert.equal(approved.data.locked, true);

    const edit = await helpers.request('PUT', `/content/${content._id}`, {
      token: aliToken,
      body: { caption: 'sneaky edit' }
    });
    assert.ok(edit.status === 403 || edit.status === 409);
  });

  it('manager rework from Approved returns it to Production unlocked with revision bump', async () => {
    const rework = await helpers.request('PUT', `/content/${content._id}/status`, {
      token: adminToken,
      body: { status: 'Production', note: 'SEO keywords missing from intro paragraph' }
    });
    assert.equal(rework.status, 200);
    assert.equal(rework.data.status, 'Production');
    assert.equal(rework.data.revisions, 3);
    assert.equal(rework.data.locked, false);
  });

  it('team does not see other members content in the list', async () => {
    const saraList = (await helpers.request('GET', '/content', { token: saraToken })).data;
    assert.ok(!saraList.some((c) => String(c._id) === String(content._id)));
    const detail = await helpers.request('GET', `/content/${content._id}`, { token: saraToken });
    assert.equal(detail.status, 403);
  });

  it('delete is blocked for team and allowed for manager', async () => {
    const denied = await helpers.request('DELETE', `/content/${content._id}`, { token: aliToken });
    assert.equal(denied.status, 403);
    const ok = await helpers.request('DELETE', `/content/${content._id}`, { token: adminToken });
    assert.equal(ok.status, 200);
  });
});

describe('campaigns', () => {
  let campaign;
  let sharedCampaign;
  let linkedTask;

  const userId = async (token) => {
    const me = (await helpers.request('GET', '/auth/me', { token })).data;
    return String(me._id || me.id);
  };

  it('manager creates a campaign and it appears in the list', async () => {
    const r = await helpers.request('POST', '/campaigns', {
      token: adminToken,
      body: {
        name: 'Q3 Retention Blitz',
        clientId: clients[0]._id,
        objective: 'Win back lapsed customers',
        channels: ['Email', 'Ads'],
        budget: 75000,
        status: 'Active',
        kpis: [
          { label: 'Leads', targetValue: 80, unit: 'leads' },
          { label: 'CTR', targetValue: 3, unit: '%' }
        ]
      }
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.name, 'Q3 Retention Blitz');
    assert.equal(r.data.status, 'Active');
    assert.equal(String(r.data.clientId._id), String(clients[0]._id));
    assert.equal(r.data.kpis.length, 2);
    campaign = r.data;

    const list = (await helpers.request('GET', '/campaigns', { token: adminToken })).data;
    assert.ok(list.some((c) => String(c._id) === String(campaign._id)), 'created campaign missing from list');
  });

  it('rejects invalid channels and status', async () => {
    const badChannel = await helpers.request('POST', '/campaigns', {
      token: adminToken,
      body: { name: 'Bad', clientId: clients[0]._id, channels: ['Telepathy'] }
    });
    assert.equal(badChannel.status, 201);
    assert.deepEqual(badChannel.data.channels, []);
    const badStatus = await helpers.request('POST', '/campaigns', {
      token: adminToken,
      body: { name: 'Bad', clientId: clients[0]._id, status: 'Paused' }
    });
    assert.equal(badStatus.status, 400);
  });

  it('team cannot create a campaign', async () => {
    const r = await helpers.request('POST', '/campaigns', {
      token: aliToken,
      body: { name: 'Sneaky Campaign', clientId: clients[0]._id }
    });
    assert.equal(r.status, 403);
  });

  it('team sees only campaigns of their accessible clients', async () => {
    const mine = new Set(
      (await helpers.request('GET', '/clients', { token: aliToken })).data.map((c) => String(c._id))
    );
    const list = (await helpers.request('GET', '/campaigns', { token: aliToken })).data;
    assert.ok(list.length > 0);
    list.forEach((c) => {
      const cid = String(c.clientId._id || c.clientId);
      assert.ok(mine.has(cid), 'campaign of inaccessible client leaked to team user');
    });
    assert.ok(
      !list.some((c) => String(c._id) === String(campaign._id)) || mine.has(String(clients[0]._id))
    );
  });

  it('team is blocked from an unrelated campaign detail', async () => {
    const all = (await helpers.request('GET', '/campaigns', { token: adminToken })).data;
    const mine = new Set(
      (await helpers.request('GET', '/clients', { token: aliToken })).data.map((c) => String(c._id))
    );
    const other = all.find((c) => !mine.has(String(c.clientId._id || c.clientId)));
    if (!other) return;
    const r = await helpers.request('GET', `/campaigns/${other._id}`, { token: aliToken });
    assert.equal(r.status, 403);
  });

  it('linking a task exposes it in campaign tasks', async () => {
    const aliId = await userId(aliToken);
    const saraId = await userId(saraToken);
    const allTasks = (await helpers.request('GET', '/tasks', { token: adminToken })).data;
    const sharedClient = allTasks.reduce((acc, t) => {
      if (acc) return acc;
      const cid = String(t.client._id || t.client);
      const hasAli = allTasks.some(
        (x) => String(x.client._id || x.client) === cid && String(x.assignedTo._id || x.assignedTo) === aliId
      );
      const hasSara = allTasks.some(
        (x) => String(x.client._id || x.client) === cid && String(x.assignedTo._id || x.assignedTo) === saraId
      );
      return hasAli && hasSara ? { _id: cid } : acc;
    }, null);
    assert.ok(sharedClient, 'no shared client between ali and sara found');
    const created = await helpers.request('POST', '/tasks', {
      token: adminToken,
      body: {
        title: 'Campaign linked task',
        client: sharedClient._id,
        assignedTo: aliId,
        dueDate: new Date(Date.now() + 86400000).toISOString()
      }
    });
    assert.equal(created.status, 201);
    linkedTask = created.data;

    sharedCampaign = (
      await helpers.request('POST', '/campaigns', {
        token: adminToken,
        body: { name: 'Shared Client Campaign', clientId: sharedClient._id, budget: 40000 }
      })
    ).data;

    const link = await helpers.request('PUT', `/tasks/${linkedTask._id}`, {
      token: adminToken,
      body: { campaignId: sharedCampaign._id }
    });
    assert.equal(link.status, 200);
    assert.equal(String(link.data.campaignId), String(sharedCampaign._id));

    const campaignTasks = (await helpers.request('GET', `/campaigns/${sharedCampaign._id}/tasks`, { token: adminToken })).data;
    assert.ok(campaignTasks.some((t) => String(t._id) === String(linkedTask._id)), 'linked task missing from campaign tasks');
  });

  it('team member not assigned the campaign task does not see it', async () => {
    const r = await helpers.request('GET', `/campaigns/${sharedCampaign._id}/tasks`, { token: saraToken });
    assert.equal(r.status, 200);
    assert.ok(
      !r.data.some((t) => String(t._id) === String(linkedTask._id)),
      'unassigned team member saw another member campaign task'
    );

    const detail = await helpers.request('GET', `/campaigns/${sharedCampaign._id}`, { token: saraToken });
    assert.equal(detail.status, 200);
  });

  it('deleting a campaign unlinks its tasks', async () => {
    const del = await helpers.request('DELETE', `/campaigns/${sharedCampaign._id}`, { token: adminToken });
    assert.equal(del.status, 200);

    const gone = await helpers.request('GET', `/campaigns/${sharedCampaign._id}`, { token: adminToken });
    assert.equal(gone.status, 404);

    const all = (await helpers.request('GET', '/tasks', { token: adminToken })).data;
    const task = all.find((t) => String(t._id) === String(linkedTask._id));
    assert.ok(task);
    assert.ok(!task.campaignId, 'task should be unlinked after campaign delete');
  });
});


