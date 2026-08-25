require('dotenv').config();
const crypto = require('crypto');
const store = require('./store');
const User = require('./models/User');
const Client = require('./models/Client');
const Task = require('./models/Task');
const Campaign = require('./models/Campaign');
const Activity = require('./models/Activity');
const Report = require('./models/Report');
const { createNotification } = require('./models/Notification');

const day = 24 * 60 * 60 * 1000;
const daysFromNow = (n) => new Date(Date.now() + n * day);

// Real production team — NextKey Technologies.
// Everyone shares one starting password until they are invited to reset it themselves.
const REAL_TEAM_PASSWORD = 'NextKey@2026';

const REAL_TEAM = [
  { name: 'Qasim', email: 'qasim.nextkeytechnologies@gmail.com', role: 'manager', department: 'Management', designation: 'Manager' },
  { name: 'Orhan', email: 'usman.nextkeytechnologies@gmail.com', role: 'team', department: 'SEO', designation: 'SEO' },
  { name: 'Shahrooz', email: 'taqi2.nktechnologies@gmail.com', role: 'team', department: 'SEO', designation: 'SEO' },
  { name: 'Abeel', email: 'myselfabeel1@gmail.com', role: 'team', department: 'Design', designation: 'Designer' },
  { name: 'Fayez', email: 'raheem.nextkeytechnologies@gmail.com', role: 'team', department: 'GBP', designation: 'GBP' },
  { name: 'Laiba', email: 'socialmedia.nkt@gmail.com', role: 'team', department: 'Social Media', designation: 'Social Media' },
  { name: 'Ehtasham', email: 'developer.nkt@gmail.com', role: 'team', department: 'Web Development', designation: 'Developer' },
  { name: 'Ahad', email: 'bilal.nextkeytechnologies@gmail.com', role: 'team', department: 'Backlinks', designation: 'Backlinker' },
  { name: 'Waqar', email: 'waqar.nkt@gmai.com', role: 'team', department: 'Reports', designation: 'Reports' },
  { name: 'Abdullah', email: 'abdullah.nktechnology@gmail.com', role: 'team', department: 'Content', designation: 'Content Writer' },
  { name: 'Nazish', email: 'nazishbilal465@gmail.com', role: 'team', department: 'Content', designation: 'Content Writer' },
  { name: 'Usama', email: 'ads.nextkey@gmail.com', role: 'team', department: 'PPC', designation: 'Google Ads' }
];

const seedReal = async () => {
  console.log('Resetting JSON database (data/db.json)...');
  store.reset();

  console.log('Creating NextKey Technologies team...');
  const users = {};
  for (const member of REAL_TEAM) {
    const user = await User.createUser({
      name: member.name,
      email: member.email,
      password: REAL_TEAM_PASSWORD,
      role: member.role,
      department: member.department,
      designation: member.designation
    });
    users[member.name] = user;
    console.log(`  + ${member.name} <${member.email}> [${member.role}]`);
  }
  const manager = users.Qasim;

  console.log('Creating clients...');
  const clientData = [
    { name: 'Karachi Biryani House', serviceType: 'SEO', subService: 'Local SEO', package: 'Growth', monthlyFee: 45000, contactPerson: 'Imran Qureshi', websiteUrl: 'https://karachibiryani.pk' },
    { name: 'Lahore Dental Care', serviceType: 'SEO', subService: 'Technical SEO', package: 'Starter', monthlyFee: 35000, contactPerson: 'Dr. Faisal Mirza', websiteUrl: 'https://lahoredentalcare.com' },
    { name: 'Zainab Fabrics', serviceType: 'Social Media', subService: 'Instagram Growth', package: 'Standard', monthlyFee: 40000, contactPerson: 'Zainab Ali', socialProfiles: 'instagram.com/zainabfabrics' },
    { name: 'Desi Threads Clothing', serviceType: 'Ads', subService: 'Meta Ads', package: 'Premium', monthlyFee: 80000, contactPerson: 'Hamza Sheikh', websiteUrl: 'https://desithreads.com' },
    { name: 'Green Valley Foods', serviceType: 'GBP', subService: 'GBP Optimization', package: 'Starter', monthlyFee: 25000, contactPerson: 'Nadia Hussain' },
    { name: 'TechNest Solutions', serviceType: 'Development', subService: 'Web App', package: 'Custom', monthlyFee: 150000, contactPerson: 'Omar Farooq', websiteUrl: 'https://technest.dev' },
    { name: 'Peshawar Handicrafts', serviceType: 'SEO', subService: 'E-commerce SEO', package: 'Growth', monthlyFee: 55000, contactPerson: 'Kamal Afridi', websiteUrl: 'https://peshawarhandicrafts.com' },
    { name: 'Islamabad Fitness Hub', serviceType: 'Social Media', subService: 'Content Creation', package: 'Standard', monthlyFee: 38000, contactPerson: 'Mahnoor Baig', socialProfiles: 'facebook.com/isbfitnesshub' },
    { name: 'Ravi Auto Parts', serviceType: 'GBP', subService: 'Review Management', package: 'Starter', monthlyFee: 22000, contactPerson: 'Tariq Mehmood' },
    { name: 'Global Study Abroad', serviceType: 'Ads', subService: 'Google Ads', package: 'Premium', monthlyFee: 95000, contactPerson: 'Sarah Thompson', websiteUrl: 'https://globalstudy.edu.pk' },
    { name: 'Multan Sweets & Bakers', serviceType: 'SEO', subService: 'Local SEO', package: 'Starter', monthlyFee: 30000, contactPerson: 'Rana Waqas' },
    { name: 'Falcon Real Estate', serviceType: 'Development', subService: 'Website Redesign', package: 'Custom', monthlyFee: 120000, contactPerson: 'James Wilson', websiteUrl: 'https://falconrealestate.ae' }
  ];
  const clients = [];
  for (let i = 0; i < clientData.length; i++) {
    clients.push(
      await Client.createClient({
        ...clientData[i],
        status: i === 11 ? 'On-Hold' : 'Active',
        startDate: daysFromNow(-(60 + i * 15)),
        contactEmail: `contact@${(clientData[i].websiteUrl || 'client-site.com').replace('https://', '')}`,
        contactPhone: `+92-333-44${String(1000 + i).slice(-4)}`
      })
    );
  }

  console.log('Seeding client vaults (manager only)...');
  await Client.updateVault(clients[0]._id, {
    credentials: [
      { label: 'WordPress Admin', username: 'kbh_admin', url: 'https://karachibiryani.pk/wp-admin', password: 'Kbh@Wp2026' },
      { label: 'Google Search Console', username: 'imran@karachibiryani.pk', url: 'https://search.google.com/search-console', password: 'Gsc#Place42' }
    ],
    socials: [
      { platform: 'Instagram', label: 'Instagram Business', url: 'https://instagram.com/karachibiryanihouse' },
      { platform: 'Facebook', label: 'Facebook Page', url: 'https://facebook.com/karachibiryanihouse' }
    ],
    links: [
      { label: 'Brand Guidelines Drive', url: 'https://drive.google.com/drive/folders/kbh-brand-kit' },
      { label: 'Analytics Dashboard', url: 'https://analytics.google.com/kbh-overview' }
    ]
  });

  await Client.updateVault(clients[2]._id, {
    credentials: [
      { label: 'Instagram Creator Account', username: 'zainabfabrics', url: 'https://instagram.com/accounts/login', password: 'ZF@Insta2026' },
      { label: 'Shopify Store Admin', username: 'store@zainabfabrics.com', url: 'https://zainabfabrics.myshopify.com/admin', password: 'Sh0p!fy-ZF9' }
    ],
    cards: [
      { label: 'Meta Ads Card', holder: 'Zainab Ali', number: '4242424242424242', expiry: '08/28', cvv: '424' }
    ],
    files: []
  });

  const mkTask = async (t) => {
    const client = clients[t.clientIdx];
    const assignee = users[t.assignee];
    return Task.createTask({
      title: t.title,
      description: t.description || `${t.title} for ${client.name} (${client.serviceType}).`,
      client: client._id,
      serviceType: client.serviceType,
      assignedTo: assignee._id,
      assignedToName: assignee.name,
      department: assignee.department,
      priority: t.priority || 'Medium',
      status: t.status || 'Pending',
      dueDate: daysFromNow(t.dueIn),
      recurrence: t.recurrence,
      completedAt: t.status === 'Completed' ? daysFromNow(t.dueIn) : undefined,
      timeSpent: Math.floor(Math.random() * 360),
      updates:
        t.updateNote || t.status === 'Completed'
          ? [{ note: t.updateNote || 'Work completed.', updatedBy: assignee._id, updatedByName: assignee.name }]
          : [],
      createdBy: manager._id
    });
  };

  console.log('Creating tasks...');
  const taskDefs = [
    // Orhan — SEO
    { title: 'Keyword research for biryani delivery pages', clientIdx: 0, assignee: 'Orhan', priority: 'High', status: 'In Progress', dueIn: 3, recurrence: 'weekly', updateNote: 'Seed keyword list completed, moving to content mapping.' },
    { title: 'Fix crawl errors from Search Console', clientIdx: 1, assignee: 'Orhan', priority: 'High', status: 'Pending', dueIn: -2 },
    { title: 'Schema markup implementation', clientIdx: 1, assignee: 'Orhan', status: 'On Hold', dueIn: 8, updateNote: 'Waiting on developer availability.' },
    // Shahrooz — SEO
    { title: 'E-commerce SEO audit for handicraft store', clientIdx: 6, assignee: 'Shahrooz', priority: 'High', status: 'Review', dueIn: -1, updateNote: 'Audit submitted — 32 issues found across 4 categories.' },
    { title: 'Local citations cleanup for Multan Sweets', clientIdx: 10, assignee: 'Shahrooz', status: 'Pending', dueIn: 5 },
    { title: 'Monthly SEO report for February', clientIdx: 0, assignee: 'Orhan', status: 'Completed', dueIn: -10, recurrence: 'monthly' },
    // Abeel — Designer
    { title: 'Design Eid campaign creatives', clientIdx: 7, assignee: 'Abeel', priority: 'High', status: 'Pending', dueIn: -3 },
    { title: 'Redesign homepage hero section', clientIdx: 11, assignee: 'Abeel', status: 'In Progress', dueIn: 4, updateNote: 'Two concepts ready, awaiting client feedback.' },
    { title: 'Logo variants for Zainab Fabrics packaging', clientIdx: 2, assignee: 'Abeel', status: 'Completed', dueIn: -6 },
    // Fayez — GBP
    { title: 'Optimize GBP categories and services', clientIdx: 4, assignee: 'Fayez', priority: 'High', status: 'Review', dueIn: -1, updateNote: 'Submitted changes for manager review.' },
    { title: 'Respond to 12 new GBP reviews', clientIdx: 8, assignee: 'Fayez', priority: 'Low', status: 'Pending', dueIn: 6 },
    { title: 'Weekly GBP post updates', clientIdx: 4, assignee: 'Fayez', status: 'Pending', dueIn: 7, recurrence: 'weekly' },
    // Laiba — Social Media
    { title: 'Create Instagram reels calendar for March', clientIdx: 2, assignee: 'Laiba', status: 'In Progress', dueIn: 4, updateNote: 'Drafted 8 reel concepts.' },
    { title: 'Schedule Facebook posts for fitness hub', clientIdx: 7, assignee: 'Laiba', priority: 'Low', status: 'Completed', dueIn: -6 },
    { title: '14-day HIIT challenge TikTok series', clientIdx: 7, assignee: 'Laiba', status: 'Pending', dueIn: 9 },
    // Ehtasham — Developer
    { title: 'Build study visa landing page', clientIdx: 9, assignee: 'Ehtasham', priority: 'High', status: 'In Progress', dueIn: 5, updateNote: 'Hero + form done, integrating CRM webhook next.' },
    { title: 'Site speed optimization — Core Web Vitals', clientIdx: 1, assignee: 'Ehtasham', status: 'Pending', dueIn: 6 },
    { title: 'WordPress core & plugin security update', clientIdx: 0, assignee: 'Ehtasham', status: 'Completed', dueIn: -4, updateNote: 'Updated to latest LTS, all tests green.' },
    // Ahad — Backlinks
    { title: 'Build 10 guest post backlinks', clientIdx: 6, assignee: 'Ahad', status: 'In Progress', dueIn: -4, updateNote: '4 backlinks live, 6 outreach pending.' },
    { title: 'Disavow toxic links audit', clientIdx: 10, assignee: 'Ahad', priority: 'Low', status: 'Pending', dueIn: 9 },
    { title: 'Competitor backlink gap analysis', clientIdx: 6, assignee: 'Ahad', status: 'Pending', dueIn: 5 },
    // Waqar — Reports
    { title: 'Weekly social media performance report', clientIdx: 2, assignee: 'Waqar', status: 'In Progress', dueIn: 2, recurrence: 'weekly' },
    { title: 'Set up Looker Studio dashboard for Global Study', clientIdx: 9, assignee: 'Waqar', status: 'Pending', dueIn: 8 },
    { title: 'January PPC spend summary', clientIdx: 3, assignee: 'Waqar', status: 'Completed', dueIn: -12 },
    // Abdullah — Content Writer
    { title: 'Write 4 blog posts for dental care tips', clientIdx: 1, assignee: 'Abdullah', status: 'Completed', dueIn: -5, updateNote: 'All posts approved and published.' },
    { title: 'Landing page copy for study visa campaign', clientIdx: 9, assignee: 'Abdullah', priority: 'High', status: 'Review', dueIn: 1 },
    // Nazish — Content Writer
    { title: 'Biryani of the Week captions — month 3', clientIdx: 0, assignee: 'Nazish', status: 'In Progress', dueIn: 3, recurrence: 'monthly' },
    { title: 'Rewrite services page for Ravi Auto Parts', clientIdx: 8, assignee: 'Nazish', status: 'Pending', dueIn: 7 },
    // Usama — Google Ads
    { title: 'Set up Meta ads retargeting audience', clientIdx: 3, assignee: 'Usama', priority: 'High', status: 'In Progress', dueIn: 2 },
    { title: 'Google Ads negative keywords cleanup', clientIdx: 9, assignee: 'Usama', status: 'Completed', dueIn: -7 },
    { title: 'Ad creative A/B test setup', clientIdx: 3, assignee: 'Usama', priority: 'High', status: 'In Progress', dueIn: -1, updateNote: 'Variant B leading with 3.2% CTR vs 2.1%.' }
  ];

  const createdTasks = [];
  for (const t of taskDefs) createdTasks.push(await mkTask(t));

  console.log('Adding time logs...');
  await Task.addTimeLog(createdTasks[0]._id, {
    userId: users.Orhan._id,
    userName: users.Orhan.name,
    minutes: 90,
    billable: true,
    note: 'Keyword research session',
    date: daysFromNow(-2)
  });
  await Task.addTimeLog(createdTasks[0]._id, {
    userId: users.Orhan._id,
    userName: users.Orhan.name,
    minutes: 45,
    billable: false,
    note: 'Content mapping draft',
    date: daysFromNow(-1)
  });
  await Task.addTimeLog(createdTasks[16]._id, {
    userId: users.Ehtasham._id,
    userName: users.Ehtasham.name,
    minutes: 150,
    billable: true,
    note: 'Landing page build session',
    date: daysFromNow(-1)
  });

  console.log('Adding task comments...');
  const addComment = async (taskId, text, author, mentions = []) => {
    const current = Task.findById(taskId);
    return Task.updateTask(taskId, {
      comments: [
        ...(current.comments || []),
        {
          _id: crypto.randomUUID(),
          text,
          userId: author._id,
          userName: author.name,
          mentions,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 3 * day)).toISOString()
        }
      ]
    });
  };
  await addComment(createdTasks[0]._id, 'Primary keyword list is ready, please review before I map content pages.', users.Orhan);
  await addComment(createdTasks[0]._id, 'Reviewed — looks good. Prioritize the delivery-area keywords.', manager);
  await addComment(createdTasks[25]._id, `Draft shared. @${users.Abdullah.name} can you sanity-check the tone?`, users.Nazish, [users.Abdullah._id]);

  console.log('Creating campaigns...');
  const campaignData = [
    {
      name: 'Ramadan Sales Push',
      clientIdx: 3,
      objective: 'Drive Ramadan season sales through paid ads and retargeting.',
      channels: ['Ads', 'Social Media'],
      budget: 150000,
      status: 'Active',
      owner: users.Usama,
      startDate: daysFromNow(-20),
      endDate: daysFromNow(25),
      kpis: [
        { label: 'Orders', targetValue: 500, unit: 'orders' },
        { label: 'ROAS', targetValue: 4, unit: 'x' },
        { label: 'Purchases', targetValue: 1200, unit: 'clicks' }
      ],
      taskIdxs: [28, 30]
    },
    {
      name: 'Local SEO Domination Q3',
      clientIdx: 0,
      objective: 'Own the local pack for biryani delivery keywords across Karachi.',
      channels: ['SEO', 'GBP', 'Content'],
      budget: 120000,
      status: 'Active',
      owner: users.Orhan,
      startDate: daysFromNow(-35),
      endDate: daysFromNow(55),
      kpis: [
        { label: 'Organic Traffic', targetValue: 50000, unit: 'sessions' },
        { label: 'Top 3 Rankings', targetValue: 15, unit: 'keywords' },
        { label: 'Leads', targetValue: 120, unit: 'leads' }
      ],
      taskIdxs: [0, 5]
    },
    {
      name: 'Instagram Growth Sprint',
      clientIdx: 2,
      objective: 'Grow Zainab Fabrics Instagram audience and engagement with reels-first content.',
      channels: ['Social Media', 'Content', 'Design'],
      budget: 60000,
      status: 'On Hold',
      owner: users.Laiba,
      startDate: daysFromNow(-10),
      endDate: daysFromNow(50),
      kpis: [
        { label: 'Followers', targetValue: 10000, unit: 'followers' },
        { label: 'Engagement Rate', targetValue: 5, unit: '%' }
      ],
      taskIdxs: [12]
    },
    {
      name: 'Google Ads Lead Gen',
      clientIdx: 9,
      objective: 'Generate qualified study-abroad leads through search campaigns.',
      channels: ['Ads', 'Email'],
      budget: 200000,
      status: 'Planning',
      owner: users.Usama,
      startDate: daysFromNow(7),
      endDate: daysFromNow(90),
      kpis: [
        { label: 'Leads', targetValue: 300, unit: 'leads' },
        { label: 'Cost per Lead', targetValue: 1500, unit: 'PKR' }
      ],
      taskIdxs: [16, 25]
    }
  ];

  const campaigns = [];
  for (const c of campaignData) {
    const campaign = await Campaign.createCampaign({
      name: c.name,
      clientId: clients[c.clientIdx]._id,
      objective: c.objective,
      channels: c.channels,
      budget: c.budget,
      status: c.status,
      ownerId: c.owner._id,
      ownerName: c.owner.name,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      kpis: c.kpis
    });
    campaigns.push(campaign);
    for (const idx of c.taskIdxs) {
      if (createdTasks[idx]) {
        store.update('tasks', createdTasks[idx]._id, { campaignId: campaign._id });
      }
    }
  }

  console.log('Creating content calendar items...');
  const histEntry = (status, user, note, hoursAgo) => ({
    status,
    userId: user._id,
    userName: user.name,
    note: note || '',
    at: new Date(Date.now() - hoursAgo * 3600000).toISOString()
  });
  const contentData = [
    {
      title: 'Biryani of the Week - Chicken Sindhuri',
      clientIdx: 0,
      campaignIdx: 1,
      contentType: 'Post',
      platform: 'Instagram',
      caption: 'This week special: Chicken Sindhuri, slow-cooked and served with saffron rice. Order before 8pm for free delivery in Karachi.',
      assignee: 'Laiba',
      scheduledDate: daysFromNow(-12).toISOString(),
      status: 'Published',
      locked: true,
      revisions: 1,
      history: [
        ['Brief', users.Laiba, 'Created', 400],
        ['Production', users.Laiba, '', 380],
        ['Internal Review', users.Laiba, 'Ready for review', 340],
        ['Approved', manager, 'Looks great', 320],
        ['Scheduled', manager, '', 318],
        ['Published', manager, 'Live on Instagram', 260]
      ]
    },
    {
      title: 'Eid Collection Reel Teaser',
      clientIdx: 2,
      campaignIdx: 2,
      contentType: 'Video',
      platform: 'Instagram',
      caption: 'Behind the seams of our Eid Collection. Full reel drops this Friday.',
      assignee: 'Laiba',
      status: 'Internal Review',
      revisions: 2,
      history: [
        ['Brief', users.Laiba, 'Created', 120],
        ['Production', users.Laiba, '', 100],
        ['Internal Review', users.Laiba, 'Draft submitted', 90],
        ['Production', manager, 'Caption misses brand tone and the promo code is wrong - please revise.', 84],
        ['Internal Review', users.Laiba, 'Revised caption and fixed promo code', 30]
      ]
    },
    {
      title: 'Ramadan Flash Sale Carousel',
      clientIdx: 3,
      campaignIdx: 0,
      contentType: 'Ad',
      platform: 'Facebook',
      caption: '48-hour flash sale: up to 60% off on all winter stock. Swipe for deals.',
      assignee: 'Usama',
      scheduledDate: daysFromNow(3).toISOString(),
      status: 'Scheduled',
      locked: true,
      revisions: 1,
      history: [
        ['Brief', users.Usama, 'Created', 150],
        ['Production', users.Abeel, '', 130],
        ['Internal Review', users.Usama, '', 110],
        ['Approved', manager, 'Budget approved', 96],
        ['Scheduled', manager, '', 95]
      ]
    },
    {
      title: 'September Intake Email Blast',
      clientIdx: 9,
      campaignIdx: 3,
      contentType: 'Email',
      platform: 'Website',
      caption: 'Applications for the September intake are open. Book a free counselling session today.',
      assignee: 'Nazish',
      scheduledDate: daysFromNow(8).toISOString(),
      status: 'Scheduled',
      locked: true,
      revisions: 1,
      history: [
        ['Brief', users.Nazish, 'Created', 200],
        ['Production', users.Nazish, '', 180],
        ['Internal Review', users.Nazish, '', 160],
        ['Approved', manager, '', 140],
        ['Scheduled', manager, '', 139]
      ]
    },
    {
      title: 'Dental Implants FAQ Blog',
      clientIdx: 1,
      contentType: 'Blog',
      platform: 'Website',
      caption: 'Long-form FAQ answering the top 12 patient questions about dental implants, pricing and recovery time.',
      assignee: 'Abdullah',
      status: 'Approved',
      locked: true,
      revisions: 1,
      history: [
        ['Brief', users.Abdullah, 'Created', 300],
        ['Production', users.Abdullah, '', 280],
        ['Internal Review', users.Abdullah, 'Draft ready', 240],
        ['Approved', manager, 'Solid draft, publish after SEO check', 220]
      ]
    },
    {
      title: 'Weekend Offer GBP Post',
      clientIdx: 4,
      contentType: 'Post',
      platform: 'Google',
      caption: 'Fresh organic honey combo packs at 20% off this weekend only. Visit our store.',
      assignee: 'Fayez',
      status: 'Production',
      revisions: 1,
      history: [
        ['Brief', users.Fayez, 'Created', 60],
        ['Production', users.Fayez, '', 48]
      ]
    },
    {
      title: 'Winter Shawl Lookbook Shoot Brief',
      clientIdx: 6,
      contentType: 'Video',
      platform: 'Instagram',
      caption: 'Concept brief for the pashmina shawl lookbook: mountain backdrop, natural light, artisan close-ups.',
      assignee: 'Abeel',
      status: 'Brief',
      revisions: 1,
      history: [['Brief', users.Abeel, 'Created', 40]]
    },
    {
      title: 'Muharram Closure Announcement',
      clientIdx: 10,
      contentType: 'Post',
      platform: 'Facebook',
      caption: 'We will remain closed on 9th and 10th Muharram. Orders can still be placed online.',
      assignee: 'Nazish',
      scheduledDate: daysFromNow(18).toISOString(),
      status: 'Production',
      revisions: 1,
      history: [
        ['Brief', users.Nazish, 'Created', 36],
        ['Production', users.Nazish, '', 30]
      ]
    }
  ];

  for (const c of contentData) {
    const now = Date.now();
    store.insert('contents', {
      title: c.title,
      clientId: clients[c.clientIdx]._id,
      campaignId: c.campaignIdx !== undefined ? campaigns[c.campaignIdx]._id : null,
      contentType: c.contentType,
      platform: c.platform,
      caption: c.caption || '',
      creativeFile: null,
      scheduledDate: c.scheduledDate,
      status: c.status,
      assignedTo: users[c.assignee]._id,
      assignedToName: users[c.assignee].name,
      revisions: c.revisions || 1,
      locked: Boolean(c.locked),
      history: c.history.map(([status, user, note, hoursAgo]) => histEntry(status, user, note, hoursAgo)),
      feedback: [],
      createdAt: new Date(now - (c.history[0][3] + 2) * 3600000).toISOString()
    });
  }

  console.log('Creating client reports...');
  const weeklyFileContent = `Weekly Deliverables - Karachi Biryani House\n- Published 2 location landing pages\n- Fixed 14 crawl errors\n- GBP posts x3 live\n- Rankings: "biryani delivery karachi" up 6 positions\n`;
  await Report.createReport({
    clientId: clients[0]._id,
    title: 'Weekly SEO Progress - Week 31',
    period: 'Weekly',
    note: 'Crawl errors cleared and two new landing pages indexed. Local pack visibility improving.',
    fileName: 'week-31-deliverables.txt',
    fileType: 'text/plain',
    fileSize: Buffer.byteLength(weeklyFileContent),
    fileData: `data:text/plain;base64,${Buffer.from(weeklyFileContent).toString('base64')}`,
    createdBy: users.Waqar._id,
    createdByName: users.Waqar.name
  });
  await Report.createReport({
    clientId: clients[1]._id,
    title: 'Monthly SEO Report - July',
    period: 'Monthly',
    note: 'Organic traffic up 18% MoM. Blog cluster on dental implants driving most conversions.',
    createdBy: users.Waqar._id,
    createdByName: users.Waqar.name
  });
  await Report.createReport({
    clientId: clients[2]._id,
    title: 'Weekly Social Media Report - Week 32',
    period: 'Weekly',
    note: 'Reel reach 42k. Follower growth +1.8%. Eid collection series performing best.',
    createdBy: users.Waqar._id,
    createdByName: users.Waqar.name
  });

  console.log('Creating announcements...');
  store.insert('announcements', {
    title: 'Welcome to NextKey CRM',
    body: 'Assalam-o-Alaikum team! Hum ne apna sara workflow ab is CRM par shift kar diya hai. Rozana apne tasks yahan update karein, comments mein discuss karein aur deadlines ka khayal rakhein. Koi masla ho to mujhe ping karein.\n\n— Qasim',
    pinned: true,
    createdBy: manager._id,
    createdByName: manager.name,
    createdAt: new Date(Date.now() - 2 * day).toISOString()
  });
  store.insert('announcements', {
    title: 'Friday prayer break — 1:00 to 2:30 PM',
    body: 'Har Friday namaz-e-Jumma ke liye office 1:00 PM se 2:30 PM tak band rahega. Deliverables ke schedules isi hisaab se adjust kar lena.',
    pinned: false,
    createdBy: manager._id,
    createdByName: manager.name,
    createdAt: new Date(Date.now() - 1 * day).toISOString()
  });

  console.log('Creating notifications...');
  const notificationData = [
    { user: users.Orhan, type: 'assignment', title: 'New task assigned', body: 'Keyword research for biryani delivery pages — due in 3 days', read: false },
    { user: users.Orhan, type: 'comment', title: 'New comment on your task', body: 'Reviewed — looks good. Prioritize the delivery-area keywords.', read: false },
    { user: users.Orhan, type: 'reminder', title: 'Overdue: Fix crawl errors from Search Console', body: 'This task is past its due date', read: false },
    { user: users.Abeel, type: 'assignment', title: 'New task assigned', body: 'Design Eid campaign creatives — overdue', read: false },
    { user: users.Fayez, type: 'assignment', title: 'New task assigned', body: 'Optimize GBP categories and services — due tomorrow', read: false },
    { user: users.Laiba, type: 'mention', title: `${users.Nazish.name} mentioned you`, body: 'Reel script feedback needed before Friday.', read: false },
    { user: manager, type: 'status', title: 'Task moved to Review', body: 'Optimize GBP categories and services', read: false },
    { user: manager, type: 'status', title: 'Task moved to Review', body: 'E-commerce SEO audit for handicraft store', read: false }
  ];
  for (const n of notificationData) {
    const doc = await createNotification({ userId: n.user._id, type: n.type, title: n.title, body: n.body });
    if (n.read) store.update('notifications', doc._id, { read: true });
  }

  console.log('Creating activity entries...');
  await Promise.all([
    Activity.logActivity({ user: manager._id, userName: manager.name, userRole: 'manager', action: 'created client', targetType: 'client', targetId: clients[0]._id.toString(), targetName: clients[0].name }),
    Activity.logActivity({ user: manager._id, userName: manager.name, userRole: 'manager', action: 'created task', targetType: 'task', targetName: 'Keyword research for biryani delivery pages', details: `Assigned to ${users.Orhan.name}` }),
    Activity.logActivity({ user: users.Orhan._id, userName: users.Orhan.name, userRole: 'team', action: 'updated task to In Progress', targetType: 'task', targetName: 'Keyword research for biryani delivery pages' }),
    Activity.logActivity({ user: users.Fayez._id, userName: users.Fayez.name, userRole: 'team', action: 'updated task to Review', targetType: 'task', targetName: 'Optimize GBP categories and services' }),
    Activity.logActivity({ user: users.Laiba._id, userName: users.Laiba.name, userRole: 'team', action: 'logged in', targetType: 'auth', targetName: users.Laiba.name }),
    Activity.logActivity({ user: users.Waqar._id, userName: users.Waqar.name, userRole: 'team', action: 'created report', targetType: 'report', targetName: 'Weekly Social Media Report - Week 32' })
  ]);

  console.log('\n================ SEED COMPLETE ================');
  console.log(`Created ${REAL_TEAM.length} accounts (1 manager, ${REAL_TEAM.length - 1} team members).`);
  console.log(`Created ${clients.length} clients, ${taskDefs.length} tasks, ${campaigns.length} campaigns, ${contentData.length} content items, 3 reports, 2 announcements.`);
  console.log('\nManager login:');
  console.log(`  Email: ${REAL_TEAM[0].email}`);
  console.log(`  Password: ${REAL_TEAM_PASSWORD}`);
  console.log(`Team logins — shared password for all: ${REAL_TEAM_PASSWORD}`);
  REAL_TEAM.slice(1).forEach((m) => console.log(`  ${m.email}`));
  console.log('===============================================\n');

  process.exit(0);
};

const seedDemo = async () => {
  console.log('Resetting JSON database (data/db.json)...');
  store.reset();

  console.log('Creating manager...');
  const manager = await User.createUser({
    name: 'Ahmed Raza',
    email: 'admin@agency.com',
    password: 'Admin@123',
    role: 'manager',
    department: 'Management',
    designation: 'Agency Manager',
    phone: '+92-300-1112233'
  });

  console.log('Creating team members...');
  const teamData = [
    { name: 'Ali Khan', email: 'ali@agency.com', department: 'SEO', designation: 'SEO Specialist' },
    { name: 'Sara Ahmed', email: 'sara@agency.com', department: 'Content', designation: 'Content Writer' },
    { name: 'Bilal Raza', email: 'bilal@agency.com', department: 'GBP', designation: 'GBP Manager' },
    { name: 'Hina Sheikh', email: 'hina@agency.com', department: 'Social Media', designation: 'Social Media Manager' },
    { name: 'Usman Tariq', email: 'usman@agency.com', department: 'Ads', designation: 'Ads Specialist' },
    { name: 'Ayesha Malik', email: 'ayesha@agency.com', department: 'SEO', designation: 'Backlink Expert' }
  ];
  const team = await Promise.all(
    teamData.map((t) =>
      User.createUser({
        ...t,
        password: 'Team@123',
        role: 'team',
        phone: '+92-321-5556677'
      })
    )
  );
  const [ali, sara, bilal, hina, usman, ayesha] = team;

  console.log('Creating clients...');
  const clientData = [
    { name: 'Karachi Biryani House', serviceType: 'SEO', subService: 'Local SEO', package: 'Growth', monthlyFee: 45000, contactPerson: 'Imran Qureshi', websiteUrl: 'https://karachibiryani.pk' },
    { name: 'Lahore Dental Care', serviceType: 'SEO', subService: 'Technical SEO', package: 'Starter', monthlyFee: 35000, contactPerson: 'Dr. Faisal Mirza', websiteUrl: 'https://lahoredentalcare.com' },
    { name: 'Zainab Fabrics', serviceType: 'Social Media', subService: 'Instagram Growth', package: 'Standard', monthlyFee: 40000, contactPerson: 'Zainab Ali', socialProfiles: 'instagram.com/zainabfabrics' },
    { name: 'Desi Threads Clothing', serviceType: 'Ads', subService: 'Meta Ads', package: 'Premium', monthlyFee: 80000, contactPerson: 'Hamza Sheikh', websiteUrl: 'https://desithreads.com' },
    { name: 'Green Valley Foods', serviceType: 'GBP', subService: 'GBP Optimization', package: 'Starter', monthlyFee: 25000, contactPerson: 'Nadia Hussain' },
    { name: 'TechNest Solutions', serviceType: 'Development', subService: 'Web App', package: 'Custom', monthlyFee: 150000, contactPerson: 'Omar Farooq', websiteUrl: 'https://technest.dev' },
    { name: 'Peshawar Handicrafts', serviceType: 'SEO', subService: 'E-commerce SEO', package: 'Growth', monthlyFee: 55000, contactPerson: 'Kamal Afridi', websiteUrl: 'https://peshawarhandicrafts.com' },
    { name: 'Islamabad Fitness Hub', serviceType: 'Social Media', subService: 'Content Creation', package: 'Standard', monthlyFee: 38000, contactPerson: 'Mahnoor Baig', socialProfiles: 'facebook.com/isbfitnesshub' },
    { name: 'Ravi Auto Parts', serviceType: 'GBP', subService: 'Review Management', package: 'Starter', monthlyFee: 22000, contactPerson: 'Tariq Mehmood' },
    { name: 'Global Study Abroad', serviceType: 'Ads', subService: 'Google Ads', package: 'Premium', monthlyFee: 95000, contactPerson: 'Sarah Thompson', websiteUrl: 'https://globalstudy.edu.pk' },
    { name: 'Multan Sweets & Bakers', serviceType: 'SEO', subService: 'Local SEO', package: 'Starter', monthlyFee: 30000, contactPerson: 'Rana Waqas' },
    { name: 'Falcon Real Estate', serviceType: 'Development', subService: 'Website Redesign', package: 'Custom', monthlyFee: 120000, contactPerson: 'James Wilson', websiteUrl: 'https://falconrealestate.ae' }
  ];
  const clients = [];
  for (let i = 0; i < clientData.length; i++) {
    clients.push(
      await Client.createClient({
        ...clientData[i],
        status: i === 11 ? 'On-Hold' : 'Active',
        startDate: daysFromNow(-(60 + i * 15)),
        contactEmail: `contact@${(clientData[i].websiteUrl || 'client-site.com').replace('https://', '')}`,
        contactPhone: `+92-333-44${String(1000 + i).slice(-4)}`
      })
    );
  }

  console.log('Seeding client vaults (manager only)...');
  await Client.updateVault(clients[0]._id, {
    credentials: [
      { label: 'WordPress Admin', username: 'kbh_admin', url: 'https://karachibiryani.pk/wp-admin', password: 'Kbh@Wp2026' },
      { label: 'Google Search Console', username: 'imran@karachibiryani.pk', url: 'https://search.google.com/search-console', password: 'Gsc#Place42' },
      { label: 'Hosting cPanel', username: 'kbh_host', url: 'https://secure.hostingpk.com:2083', password: 'H0st!ng42' }
    ],
    socials: [
      { platform: 'Instagram', label: 'Instagram Business', url: 'https://instagram.com/karachibiryanihouse' },
      { platform: 'Facebook', label: 'Facebook Page', url: 'https://facebook.com/karachibiryanihouse' }
    ],
    links: [
      { label: 'Brand Guidelines Drive', url: 'https://drive.google.com/drive/folders/kbh-brand-kit' },
      { label: 'Analytics Dashboard', url: 'https://analytics.google.com/kbh-overview' }
    ]
  });

  await Client.updateVault(clients[1]._id, {
    credentials: [
      { label: 'Website Admin', username: 'faisal.admin', url: 'https://lahoredentalcare.com/admin', password: 'Ldc$Admin26' },
      { label: 'Domain Registrar', username: 'ldc_domains', url: 'https://pkdomain.pk/client-area', password: 'D0main#77' }
    ],
    links: [
      { label: 'Clinic Photos Folder', url: 'https://drive.google.com/drive/folders/ldc-photos' }
    ],
    socials: [
      { platform: 'Facebook', label: 'Clinic Page', url: 'https://facebook.com/lahoredentalcare' }
    ]
  });

  await Client.updateVault(clients[2]._id, {
    credentials: [
      { label: 'Instagram Creator Account', username: 'zainabfabrics', url: 'https://instagram.com/accounts/login', password: 'ZF@Insta2026' },
      { label: 'Shopify Store Admin', username: 'store@zainabfabrics.com', url: 'https://zainabfabrics.myshopify.com/admin', password: 'Sh0p!fy-ZF9' }
    ],
    socials: [
      { platform: 'Instagram', label: 'Main Instagram', url: 'https://instagram.com/zainabfabrics' },
      { platform: 'Twitter', label: 'Twitter/X Handle', url: 'https://x.com/zainabfabrics' }
    ],
    cards: [
      { label: 'Meta Ads Card', holder: 'Zainab Ali', number: '4242424242424242', expiry: '08/28', cvv: '424' },
      { label: 'Company Credit Card', holder: 'Ahmed Raza', number: '5555555555554444', expiry: '12/27', cvv: '555' }
    ],
    files: []
  });

  console.log('Creating client reports...');
  const weeklyFileContent = `Weekly Deliverables - Karachi Biryani House\n- Published 2 location landing pages\n- Fixed 14 crawl errors\n- GBP posts x3 live\n- Rankings: "biryani delivery karachi" up 6 positions\n`;
  await Report.createReport({
    clientId: clients[0]._id,
    title: 'Weekly SEO Progress - Week 31',
    period: 'Weekly',
    note: 'Crawl errors cleared and two new landing pages indexed. Local pack visibility improving.',
    fileName: 'week-31-deliverables.txt',
    fileType: 'text/plain',
    fileSize: Buffer.byteLength(weeklyFileContent),
    fileData: `data:text/plain;base64,${Buffer.from(weeklyFileContent).toString('base64')}`,
    createdBy: sara._id,
    createdByName: sara.name
  });
  await Report.createReport({
    clientId: clients[1]._id,
    title: 'Monthly SEO Report - July',
    period: 'Monthly',
    note: 'Organic traffic up 18% MoM. Blog cluster on dental implants driving most conversions.',
    createdBy: ali._id,
    createdByName: ali.name
  });
  await Report.createReport({
    clientId: clients[2]._id,
    title: 'Weekly Social Media Report - Week 32',
    period: 'Weekly',
    note: 'Reel reach 42k. Follower growth +1.8%. Eid collection series performing best.',
    createdBy: hina._id,
    createdByName: hina.name
  });

  console.log('Creating tasks...');
  const taskData = [
    { title: 'Keyword research for biryani delivery pages', clientIdx: 0, assignee: ali, priority: 'High', status: 'In Progress', dueIn: 3, recurrence: 'weekly', updateNote: 'Seed keyword list completed, moving to content mapping.' },
    { title: 'Fix crawl errors from Search Console', clientIdx: 1, assignee: ali, priority: 'High', status: 'Pending', dueIn: -2 },
    { title: 'Write 4 blog posts for dental care tips', clientIdx: 1, assignee: sara, priority: 'Medium', status: 'Completed', dueIn: -5, updateNote: 'All posts approved and published.' },
    { title: 'Optimize GBP categories and services', clientIdx: 4, assignee: bilal, priority: 'High', status: 'Review', dueIn: -1, updateNote: 'Submitted changes for manager review.' },
    { title: 'Respond to 12 new GBP reviews', clientIdx: 8, assignee: bilal, priority: 'Low', status: 'Pending', dueIn: 6 },
    { title: 'Create Instagram reels calendar for March', clientIdx: 2, assignee: hina, priority: 'Medium', status: 'In Progress', dueIn: 4, updateNote: 'Drafted 8 reel concepts.' },
    { title: 'Design Eid campaign creatives', clientIdx: 7, assignee: hina, priority: 'High', status: 'Pending', dueIn: -3 },
    { title: 'Set up Meta ads retargeting audience', clientIdx: 3, assignee: usman, priority: 'High', status: 'In Progress', dueIn: 2 },
    { title: 'Google Ads negative keywords cleanup', clientIdx: 9, assignee: usman, priority: 'Medium', status: 'Completed', dueIn: -7 },
    { title: 'Build 10 guest post backlinks', clientIdx: 6, assignee: ayesha, priority: 'Medium', status: 'In Progress', dueIn: -4, updateNote: '4 backlinks live, 6 outreach pending.' },
    { title: 'Disavow toxic links audit', clientIdx: 10, assignee: ayesha, priority: 'Low', status: 'Pending', dueIn: 9 },
    { title: 'Monthly SEO report for February', clientIdx: 0, assignee: ali, priority: 'Medium', status: 'Completed', dueIn: -10, recurrence: 'weekly' },
    { title: 'Landing page copy for study visa campaign', clientIdx: 9, assignee: sara, priority: 'High', status: 'Review', dueIn: 1 },
    { title: 'Competitor backlink gap analysis', clientIdx: 6, assignee: ayesha, priority: 'Medium', status: 'Pending', dueIn: 5 },
    { title: 'Schedule Facebook posts for fitness hub', clientIdx: 7, assignee: hina, priority: 'Low', status: 'Completed', dueIn: -6 },
    { title: 'Redesign homepage hero section', clientIdx: 11, assignee: usman, priority: 'Medium', status: 'Cancelled', dueIn: -14, updateNote: 'Client put project on hold.' },
    { title: 'Schema markup implementation', clientIdx: 1, assignee: ali, priority: 'Medium', status: 'On Hold', dueIn: 8 },
    { title: 'Weekly GBP post updates', clientIdx: 4, assignee: bilal, priority: 'Low', status: 'Pending', dueIn: 7 },
    { title: 'Ad creative A/B test setup', clientIdx: 3, assignee: usman, priority: 'High', status: 'In Progress', dueIn: -1 },
    { title: 'Internal linking structure overhaul', clientIdx: 10, assignee: ayesha, priority: 'Medium', status: 'Pending', dueIn: -6 }
  ];

  const createdTasks = [];
  for (let i = 0; i < taskData.length; i++) {
    const t = taskData[i];
    const client = clients[t.clientIdx];
    const created = await Task.createTask({
      title: t.title,
      description: `${t.title} for ${client.name} (${client.serviceType}).`,
      client: client._id,
      serviceType: client.serviceType,
      assignedTo: t.assignee._id,
      assignedToName: t.assignee.name,
      department: t.assignee.department,
      priority: t.priority,
      status: t.status,
      dueDate: daysFromNow(t.dueIn),
      recurrence: t.recurrence,
      completedAt: t.status === 'Completed' ? daysFromNow(t.dueIn) : undefined,
      timeSpent: Math.floor(Math.random() * 480),
      updates:
        t.updateNote || t.status === 'Completed'
          ? [{ note: t.updateNote || 'Work completed.', updatedBy: t.assignee._id, updatedByName: t.assignee.name }]
          : [],
      createdBy: manager._id
    });
    createdTasks.push(created);
  }

  console.log('Adding time logs...');
  await Task.addTimeLog(createdTasks[0]._id, {
    userId: ali._id,
    userName: ali.name,
    minutes: 90,
    billable: true,
    note: 'Keyword research session',
    date: daysFromNow(-2)
  });
  await Task.addTimeLog(createdTasks[0]._id, {
    userId: ali._id,
    userName: ali.name,
    minutes: 45,
    billable: false,
    note: 'Content mapping draft',
    date: daysFromNow(-1)
  });
  await Task.addTimeLog(createdTasks[1]._id, {
    userId: ali._id,
    userName: ali.name,
    minutes: 120,
    billable: true,
    note: 'Fixed crawl errors from Search Console export',
    date: daysFromNow(-3)
  });

  console.log('Spawning next occurrences of completed recurring tasks...');
  for (const t of createdTasks) {
    if (t.status !== 'Completed') continue;
    const intervalDays = { daily: 1, weekly: 7, monthly: 30 }[t.recurrence];
    if (!intervalDays) continue;
    let nextDue = new Date(t.dueDate).getTime();
    const now = Date.now();
    while (nextDue <= now) nextDue += intervalDays * day;
    await Task.createTask({
      title: t.title,
      description: t.description,
      client: t.client,
      clientName: t.clientName,
      serviceType: t.serviceType,
      assignedTo: t.assignedTo,
      assignedToName: t.assignedToName,
      department: t.department,
      priority: t.priority,
      status: 'Pending',
      dueDate: new Date(nextDue).toISOString(),
      recurrence: t.recurrence,
      parentTaskId: String(t._id),
      isRecurringInstance: true,
      createdBy: t.createdBy
    });
  }

  console.log('Adding task comments...');
  const addComment = async (taskId, text, author, mentions = []) => {
    const current = Task.findById(taskId);
    return Task.updateTask(taskId, {
      comments: [
        ...(current.comments || []),
        {
          _id: crypto.randomUUID(),
          text,
          userId: author._id,
          userName: author.name,
          mentions,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 3 * day)).toISOString()
        }
      ]
    });
  };

  await addComment(createdTasks[0]._id, 'Primary keyword list is ready, please review before I map content pages.', ali);
  await addComment(createdTasks[0]._id, 'Reviewed — looks good. Prioritize the delivery-area keywords.', manager);
  await addComment(createdTasks[2]._id, 'All four posts are live on the client site.', sara);
  await addComment(createdTasks[3]._id, `GBP categories updated. @${sara.name} can you draft a short post for the new services?`, bilal, [sara._id]);

  console.log('Creating notifications...');
  const notificationData = [
    { user: ali, type: 'assignment', title: 'New task assigned', body: 'Keyword research for biryani delivery pages — due in 3 days', read: false },
    { user: ali, type: 'comment', title: 'New comment on your task', body: 'Reviewed — looks good. Prioritize the delivery-area keywords.', read: false },
    { user: ali, type: 'assignment', title: 'New task assigned', body: 'Fix crawl errors from Search Console — overdue', read: true },
    { user: ali, type: 'mention', title: `${manager.name} mentioned you`, body: 'Please share the February report numbers.', read: false },
    { user: ali, type: 'status', title: 'Task moved to On Hold', body: 'Schema markup implementation', read: false },
    { user: manager, type: 'status', title: 'Task moved to Review', body: 'Optimize GBP categories and services', read: false },
    { user: manager, type: 'comment', title: 'New comment on your task', body: '4 backlinks live, 6 outreach pending.', read: true }
  ];
  for (let i = 0; i < notificationData.length; i++) {
    const n = notificationData[i];
    const doc = await createNotification({ userId: n.user._id, type: n.type, title: n.title, body: n.body });
    if (n.read) store.update('notifications', doc._id, { read: true });
  }

  console.log('Creating activity entries...');
  await Promise.all([
    Activity.logActivity({ user: manager._id, userName: manager.name, userRole: 'manager', action: 'created client', targetType: 'client', targetId: clients[0]._id.toString(), targetName: clients[0].name }),
    Activity.logActivity({ user: manager._id, userName: manager.name, userRole: 'manager', action: 'created task', targetType: 'task', targetName: 'Keyword research for biryani delivery pages', details: `Assigned to ${ali.name}` }),
    Activity.logActivity({ user: ali._id, userName: ali.name, userRole: 'team', action: 'updated task to In Progress', targetType: 'task', targetName: 'Keyword research for biryani delivery pages' }),
    Activity.logActivity({ user: bilal._id, userName: bilal.name, userRole: 'team', action: 'updated task to Review', targetType: 'task', targetName: 'Optimize GBP categories and services' }),
    Activity.logActivity({ user: sara._id, userName: sara.name, userRole: 'team', action: 'logged in', targetType: 'auth', targetName: sara.name })
  ]);

  console.log('Creating campaigns...');
  const campaignData = [
    {
      name: 'Ramadan Sales Push',
      clientIdx: 3,
      objective: 'Drive Ramadan season sales through paid ads and retargeting.',
      channels: ['Ads', 'Social Media'],
      budget: 150000,
      status: 'Active',
      owner: usman,
      startDate: daysFromNow(-20),
      endDate: daysFromNow(25),
      kpis: [
        { label: 'Orders', targetValue: 500, unit: 'orders' },
        { label: 'ROAS', targetValue: 4, unit: 'x' },
        { label: 'Purchases', targetValue: 1200, unit: 'clicks' }
      ],
      taskIdxs: [7, 18]
    },
    {
      name: 'Local SEO Domination Q3',
      clientIdx: 0,
      objective: 'Own the local pack for biryani delivery keywords across Karachi.',
      channels: ['SEO', 'GBP', 'Content'],
      budget: 120000,
      status: 'Active',
      owner: ali,
      startDate: daysFromNow(-35),
      endDate: daysFromNow(55),
      kpis: [
        { label: 'Organic Traffic', targetValue: 50000, unit: 'sessions' },
        { label: 'Top 3 Rankings', targetValue: 15, unit: 'keywords' },
        { label: 'Leads', targetValue: 120, unit: 'leads' }
      ],
      taskIdxs: [0, 11]
    },
    {
      name: 'Instagram Growth Sprint',
      clientIdx: 2,
      objective: 'Grow Zainab Fabrics Instagram audience and engagement with reels-first content.',
      channels: ['Social Media', 'Content'],
      budget: 60000,
      status: 'On Hold',
      owner: hina,
      startDate: daysFromNow(-10),
      endDate: daysFromNow(50),
      kpis: [
        { label: 'Followers', targetValue: 10000, unit: 'followers' },
        { label: 'Engagement Rate', targetValue: 5, unit: '%' }
      ],
      taskIdxs: [5]
    },
    {
      name: 'Google Ads Lead Gen',
      clientIdx: 9,
      objective: 'Generate qualified study-abroad leads through search campaigns.',
      channels: ['Ads', 'Email'],
      budget: 200000,
      status: 'Planning',
      owner: manager,
      startDate: daysFromNow(7),
      endDate: daysFromNow(90),
      kpis: [
        { label: 'Leads', targetValue: 300, unit: 'leads' },
        { label: 'Cost per Lead', targetValue: 1500, unit: 'PKR' }
      ],
      taskIdxs: [12]
    }
  ];

  const campaigns = [];
  for (const c of campaignData) {
    const campaign = await Campaign.createCampaign({
      name: c.name,
      clientId: clients[c.clientIdx]._id,
      objective: c.objective,
      channels: c.channels,
      budget: c.budget,
      status: c.status,
      ownerId: c.owner._id,
      ownerName: c.owner.name,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      kpis: c.kpis
    });
    campaigns.push(campaign);
    for (const idx of c.taskIdxs) {
      if (createdTasks[idx]) {
        store.update('tasks', createdTasks[idx]._id, { campaignId: campaign._id });
      }
    }
  }

  console.log('Creating content calendar items...');
  const histEntry = (status, user, note, hoursAgo) => ({
    status,
    userId: user._id,
    userName: user.name,
    note: note || '',
    at: new Date(Date.now() - hoursAgo * 3600000).toISOString()
  });
  const contentData = [
    {
      title: 'Biryani of the Week - Chicken Sindhuri',
      clientIdx: 0,
      campaignIdx: 1,
      contentType: 'Post',
      platform: 'Instagram',
      caption: 'This week special: Chicken Sindhuri, slow-cooked and served with saffron rice. Order before 8pm for free delivery in Karachi.',
      assignee: hina,
      scheduledDate: '2026-08-05T10:00:00.000Z',
      status: 'Published',
      locked: true,
      revisions: 1,
      history: [
        ['Brief', hina, 'Created', 400],
        ['Production', hina, '', 380],
        ['Internal Review', hina, 'Ready for review', 340],
        ['Approved', manager, 'Looks great', 320],
        ['Scheduled', manager, '', 318],
        ['Published', manager, 'Live on Instagram', 260]
      ]
    },
    {
      title: 'Eid Collection Reel Teaser',
      clientIdx: 2,
      campaignIdx: 2,
      contentType: 'Video',
      platform: 'Instagram',
      caption: 'Behind the seams of our Eid Collection. Full reel drops this Friday.',
      assignee: sara,
      status: 'Internal Review',
      revisions: 2,
      history: [
        ['Brief', sara, 'Created', 120],
        ['Production', sara, '', 100],
        ['Internal Review', sara, 'Draft submitted', 90],
        ['Production', manager, 'Caption misses brand tone and the promo code is wrong - please revise.', 84],
        ['Internal Review', sara, 'Revised caption and fixed promo code', 30]
      ]
    },
    {
      title: 'Ramadan Flash Sale Carousel',
      clientIdx: 3,
      campaignIdx: 0,
      contentType: 'Ad',
      platform: 'Facebook',
      caption: '48-hour flash sale: up to 60% off on all winter stock. Swipe for deals.',
      assignee: usman,
      scheduledDate: '2026-08-28T18:00:00.000Z',
      status: 'Scheduled',
      locked: true,
      revisions: 1,
      history: [
        ['Brief', usman, 'Created', 150],
        ['Production', usman, '', 130],
        ['Internal Review', usman, '', 110],
        ['Approved', manager, 'Budget approved', 96],
        ['Scheduled', manager, '', 95]
      ]
    },
    {
      title: 'September Intake Email Blast',
      clientIdx: 9,
      campaignIdx: 3,
      contentType: 'Email',
      platform: 'Website',
      caption: 'Applications for the September intake are open. Book a free counselling session today.',
      assignee: sara,
      scheduledDate: '2026-09-02T09:00:00.000Z',
      status: 'Scheduled',
      locked: true,
      revisions: 1,
      history: [
        ['Brief', sara, 'Created', 200],
        ['Production', sara, '', 180],
        ['Internal Review', sara, '', 160],
        ['Approved', manager, '', 140],
        ['Scheduled', manager, '', 139]
      ]
    },
    {
      title: 'Dental Implants FAQ Blog',
      clientIdx: 1,
      contentType: 'Blog',
      platform: 'Website',
      caption: 'Long-form FAQ answering the top 12 patient questions about dental implants, pricing and recovery time.',
      assignee: ali,
      status: 'Approved',
      locked: true,
      revisions: 1,
      history: [
        ['Brief', ali, 'Created', 300],
        ['Production', ali, '', 280],
        ['Internal Review', ali, 'Draft ready', 240],
        ['Approved', manager, 'Solid draft, publish after SEO check', 220]
      ]
    },
    {
      title: 'HIIT Challenge Video Script',
      clientIdx: 7,
      contentType: 'Video',
      platform: 'TikTok',
      caption: '30-second script for the 14-day HIIT challenge teaser series.',
      assignee: hina,
      status: 'Internal Review',
      revisions: 1,
      history: [
        ['Brief', hina, 'Created', 80],
        ['Production', hina, '', 70],
        ['Internal Review', hina, 'First cut attached', 20]
      ]
    },
    {
      title: 'Weekend Offer GBP Post',
      clientIdx: 4,
      contentType: 'Post',
      platform: 'Google',
      caption: 'Fresh organic honey combo packs at 20% off this weekend only. Visit our store.',
      assignee: bilal,
      status: 'Production',
      revisions: 1,
      history: [
        ['Brief', bilal, 'Created', 60],
        ['Production', bilal, '', 48]
      ]
    },
    {
      title: 'Winter Shawl Lookbook Shoot Brief',
      clientIdx: 6,
      contentType: 'Video',
      platform: 'Instagram',
      caption: 'Concept brief for the pashmina shawl lookbook: mountain backdrop, natural light, artisan close-ups.',
      assignee: ayesha,
      status: 'Brief',
      revisions: 1,
      history: [['Brief', ayesha, 'Created', 40]]
    },
    {
      title: 'Discount Parts Google Ad Copy',
      clientIdx: 8,
      contentType: 'Ad',
      platform: 'Google',
      caption: 'Search ad variants for genuine spare parts with free delivery over Rs 5000.',
      assignee: usman,
      status: 'Brief',
      revisions: 1,
      history: [['Brief', usman, 'Created', 24]]
    },
    {
      title: 'Muharram Closure Announcement',
      clientIdx: 10,
      contentType: 'Post',
      platform: 'Facebook',
      caption: 'We will remain closed on 9th and 10th Muharram. Orders can still be placed online.',
      assignee: sara,
      scheduledDate: '2026-09-12T07:00:00.000Z',
      status: 'Production',
      revisions: 1,
      history: [
        ['Brief', sara, 'Created', 36],
        ['Production', sara, '', 30]
      ]
    }
  ];

  for (const c of contentData) {
    const now = Date.now();
    store.insert('contents', {
      title: c.title,
      clientId: clients[c.clientIdx]._id,
      campaignId: c.campaignIdx !== undefined ? campaigns[c.campaignIdx]._id : null,
      contentType: c.contentType,
      platform: c.platform,
      caption: c.caption || '',
      creativeFile: null,
      scheduledDate: c.scheduledDate || undefined,
      status: c.status,
      assignedTo: c.assignee._id,
      assignedToName: c.assignee.name,
      revisions: c.revisions || 1,
      locked: Boolean(c.locked),
      history: c.history.map(([status, user, note, hoursAgo]) => histEntry(status, user, note, hoursAgo)),
      feedback: [],
      createdAt: new Date(now - (c.history[0][3] + 2) * 3600000).toISOString()
    });
  }

  console.log('\n================ SEED COMPLETE ================');
  console.log('Manager login:');
  console.log('  Email: admin@agency.com');
  console.log('  Password: Admin@123');
  console.log('\nTeam logins (password for all): Team@123');
  team.forEach((m) => console.log(`  ${m.email}`));
  console.log(`\nCreated: 1 manager, ${team.length} team members, ${clients.length} clients, ${taskData.length} tasks`);
  console.log(`Created: ${campaigns.length} campaigns, ${contentData.length} content items`);
  console.log('===============================================\n');

  process.exit(0);
};

const mode = (process.env.SEED_PROFILE || 'real').toLowerCase();
const runner = mode === 'demo' ? seedDemo : seedReal;
runner().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
