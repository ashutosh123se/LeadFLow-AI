export const DEMO_SUPER_ADMIN_EMAIL = 'admin@leadflow.ai';

export const createSuperAdminUser = () => ({
  id: 'super-admin',
  name: 'System Administrator',
  email: DEMO_SUPER_ADMIN_EMAIL,
  role: 'SUPER_ADMIN',
  organizationId: 'platform-org',
  organization: { name: 'LeadFlow Platform', slug: 'leadflow-platform' },
});

export const DEMO_PLATFORM_ORGS = [
  {
    id: 'org-acme',
    name: 'Acme Realty',
    slug: 'acme-realty',
    plan: 'GROWTH',
    users: 12,
    leads: 8,
    aiCallsUsed: 34,
    aiCallsLimit: 75,
    status: 'active',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    ownerEmail: 'rahul@acme.com',
  },
  {
    id: 'org-techcorp',
    name: 'TechCorp SaaS',
    slug: 'techcorp-saas',
    plan: 'PRO',
    users: 28,
    leads: 156,
    aiCallsUsed: 142,
    aiCallsLimit: 200,
    status: 'active',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
    ownerEmail: 'ceo@techcorp.in',
  },
  {
    id: 'org-startup',
    name: 'Startup Labs',
    slug: 'startup-labs',
    plan: 'STARTER',
    users: 3,
    leads: 14,
    aiCallsUsed: 6,
    aiCallsLimit: 20,
    status: 'trial',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    ownerEmail: 'founder@startuplabs.io',
  },
  {
    id: 'org-oldventures',
    name: 'Old Ventures Pvt Ltd',
    slug: 'old-ventures',
    plan: 'STARTER',
    users: 5,
    leads: 0,
    aiCallsUsed: 20,
    aiCallsLimit: 20,
    status: 'suspended',
    suspendedReason: 'Payment failed — 3 retries',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 200).toISOString(),
    ownerEmail: 'accounts@oldventures.com',
  },
  {
    id: 'org-demo',
    name: 'Demo Company',
    slug: 'demo-company',
    plan: 'GROWTH',
    users: 4,
    leads: 8,
    aiCallsUsed: 8,
    aiCallsLimit: 75,
    status: 'active',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    ownerEmail: 'demo@leadflow.ai',
  },
];

export const DEMO_PLATFORM_STATS = {
  totalOrgs: DEMO_PLATFORM_ORGS.length,
  activeOrgs: DEMO_PLATFORM_ORGS.filter((o) => o.status === 'active').length,
  trialOrgs: DEMO_PLATFORM_ORGS.filter((o) => o.status === 'trial').length,
  suspendedOrgs: DEMO_PLATFORM_ORGS.filter((o) => o.status === 'suspended').length,
  totalUsers: DEMO_PLATFORM_ORGS.reduce((sum, o) => sum + o.users, 0),
  totalLeads: DEMO_PLATFORM_ORGS.reduce((sum, o) => sum + o.leads, 0),
  totalAiCalls: DEMO_PLATFORM_ORGS.reduce((sum, o) => sum + o.aiCallsUsed, 0),
};

export const DEMO_TEAM = [
  { id: '1', name: 'Demo Admin', role: 'ADMIN' },
  { id: '2', name: 'Priya Singh', role: 'AGENT' },
  { id: '3', name: 'Rahul Mehta', role: 'AGENT' },
];

export const DEMO_KANBAN_STAGES = [
  {
    id: 'stage-new',
    name: 'New Lead',
    color: '#1D4ED8',
    order: 1,
    leads: [
      {
        id: 'lead-1',
        name: 'Aditi Sharma',
        phone: '9876543210',
        email: 'aditi.sharma@gmail.com',
        source: 'WEBSITE_FORM',
        scoreLabel: 'HOT',
        score: 92,
        budget: 8000000,
        requirement: '3 BHK flat in Noida Sector 62, budget ₹80L',
        stageId: 'stage-new',
        status: 'NEW',
        createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        assignedTo: { id: '1', name: 'Demo Admin' },
      },
      {
        id: 'lead-2',
        name: 'Vikram Patel',
        phone: '9812345678',
        email: 'vikram@techcorp.in',
        source: 'INDIAMART',
        scoreLabel: 'WARM',
        score: 68,
        budget: 2500000,
        requirement: 'Industrial machinery for Gujarat plant',
        stageId: 'stage-new',
        status: 'NEW',
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        assignedTo: null,
      },
    ],
  },
  {
    id: 'stage-contacted',
    name: 'AI Called',
    color: '#047857',
    order: 2,
    leads: [
      {
        id: 'lead-3',
        name: 'Rajesh Kumar',
        phone: '9988776655',
        email: 'rajesh.k@outlook.com',
        source: 'WHATSAPP',
        scoreLabel: 'HOT',
        score: 88,
        budget: 4500000,
        requirement: '2 BHK in Gurgaon, ready to move in 30 days',
        stageId: 'stage-contacted',
        status: 'CONTACTED',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        assignedTo: { id: '2', name: 'Priya Singh' },
      },
      {
        id: 'lead-4',
        name: 'Meena Reddy',
        phone: '9123456789',
        email: 'meena@startup.io',
        source: 'FACEBOOK',
        scoreLabel: 'WARM',
        score: 71,
        budget: 1200000,
        requirement: 'CRM software for 15-person sales team',
        stageId: 'stage-contacted',
        status: 'CONTACTED',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        assignedTo: { id: '1', name: 'Demo Admin' },
      },
    ],
  },
  {
    id: 'stage-qualified',
    name: 'Qualified',
    color: '#3D6B5E',
    order: 3,
    leads: [
      {
        id: 'lead-5',
        name: 'Suresh Raina',
        phone: '9123456780',
        email: 'suresh.raina@biz.com',
        source: 'JUSTDIAL',
        scoreLabel: 'HOT',
        score: 95,
        budget: 15000000,
        requirement: 'Commercial office space in Bangalore Whitefield',
        stageId: 'stage-qualified',
        status: 'QUALIFIED',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        assignedTo: { id: '3', name: 'Rahul Mehta' },
      },
      {
        id: 'lead-6',
        name: 'Kavita Nair',
        phone: '9876512345',
        email: 'kavita@designstudio.in',
        source: 'WEBSITE_FORM',
        scoreLabel: 'WARM',
        score: 74,
        budget: 3500000,
        requirement: 'Interior design package for 4BHK villa',
        stageId: 'stage-qualified',
        status: 'QUALIFIED',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
        assignedTo: { id: '2', name: 'Priya Singh' },
      },
    ],
  },
  {
    id: 'stage-proposal',
    name: 'Proposal Sent',
    color: '#8B7355',
    order: 4,
    leads: [
      {
        id: 'lead-7',
        name: 'Amit Singh',
        phone: '9812345670',
        email: 'amit.singh@enterprise.co',
        source: 'ZAPIER',
        scoreLabel: 'HOT',
        score: 90,
        budget: 6000000,
        requirement: 'Annual SaaS subscription for 50 users',
        stageId: 'stage-proposal',
        status: 'PROPOSAL',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        assignedTo: { id: '1', name: 'Demo Admin' },
      },
    ],
  },
  {
    id: 'stage-closed',
    name: 'Closed Won',
    color: '#DC2626',
    order: 5,
    leads: [
      {
        id: 'lead-8',
        name: 'Priya Verma',
        phone: '9876512340',
        email: 'priya.verma@corp.in',
        source: 'WEBSITE_FORM',
        scoreLabel: 'HOT',
        score: 98,
        budget: 12000000,
        requirement: 'Warehouse lease in Pune MIDC — signed',
        stageId: 'stage-closed',
        status: 'CLOSED_WON',
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        assignedTo: { id: '3', name: 'Rahul Mehta' },
      },
    ],
  },
];

export const DEMO_WHATSAPP_TEMPLATES = [
  { name: 'lead_followup_hi', language: 'hi' },
  { name: 'site_visit_confirmation', language: 'en' },
  { name: 'proposal_sent_notice', language: 'en' },
  { name: 'callback_reminder', language: 'hi' },
];

export const DEMO_WHATSAPP_CONVERSATIONS = [
  {
    leadId: 'lead-1',
    name: 'Aditi Sharma',
    phone: '9876543210',
    stageName: 'New Lead',
    score: 92,
    lastMessage: 'Site visit Thursday 11 AM confirm kar dijiye.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    leadId: 'lead-3',
    name: 'Rajesh Kumar',
    phone: '9988776655',
    stageName: 'AI Called',
    score: 88,
    lastMessage: 'Yes, I can visit the Gurgaon project this weekend.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    leadId: 'lead-5',
    name: 'Suresh Raina',
    phone: '9123456780',
    stageName: 'Qualified',
    score: 95,
    lastMessage: 'Whitefield site visit confirmed for Thursday.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    leadId: 'lead-7',
    name: 'Amit Singh',
    phone: '9812345670',
    stageName: 'Proposal Sent',
    score: 90,
    lastMessage: 'Received the proposal. CFO review by Friday.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    leadId: 'lead-6',
    name: 'Kavita Nair',
    phone: '9876512345',
    stageName: 'Qualified',
    score: 74,
    lastMessage: 'Portfolio received. Will revert by tomorrow.',
    lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
];

export const DEMO_WHATSAPP_MESSAGES = {
  'lead-1': [
    { id: 'msg-1-1', direction: 'OUTBOUND', content: '[Meta Template: lead_followup_hi] नमस्ते Aditi, LeadFlow से follow-up। आपकी 3 BHK inquiry के बारे में बात करनी थी।', sentAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
    { id: 'msg-1-2', direction: 'INBOUND', content: 'Haan, Sector 62 mein dekhna hai. Budget 80L hai.', sentAt: new Date(Date.now() - 1000 * 60 * 55).toISOString() },
    { id: 'msg-1-3', direction: 'OUTBOUND', content: 'Bahut achha! Kya aap Thursday 11 AM site visit ke liye available hain?', sentAt: new Date(Date.now() - 1000 * 60 * 50).toISOString() },
    { id: 'msg-1-4', direction: 'INBOUND', content: 'Site visit Thursday 11 AM confirm kar dijiye.', sentAt: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
  ],
  'lead-3': [
    { id: 'msg-3-1', direction: 'OUTBOUND', content: '[Meta Template: site_visit_confirmation] Hi Rajesh, following up on your Gurgaon 2 BHK inquiry.', sentAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
    { id: 'msg-3-2', direction: 'INBOUND', content: 'Yes, I can visit the Gurgaon project this weekend.', sentAt: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  ],
  'lead-5': [
    { id: 'msg-5-1', direction: 'OUTBOUND', content: '[Meta Template: site_visit_confirmation] Hi Suresh, your commercial office inquiry for Whitefield — site visit slot available Thursday.', sentAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
    { id: 'msg-5-2', direction: 'INBOUND', content: 'Whitefield site visit confirmed for Thursday.', sentAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  ],
  'lead-7': [
    { id: 'msg-7-1', direction: 'OUTBOUND', content: '[Meta Template: proposal_sent_notice] Hi Amit, your enterprise SaaS proposal for 50 users has been sent to your email.', sentAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
    { id: 'msg-7-2', direction: 'INBOUND', content: 'Received the proposal. CFO review by Friday.', sentAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString() },
  ],
  'lead-6': [
    { id: 'msg-6-1', direction: 'OUTBOUND', content: 'Hi Kavita, sharing our interior design portfolio as discussed on the call.', sentAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString() },
    { id: 'msg-6-2', direction: 'INBOUND', content: 'Portfolio received. Will revert by tomorrow.', sentAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString() },
  ],
};

export const getDemoWhatsAppMessages = (leadId) =>
  DEMO_WHATSAPP_MESSAGES[leadId] || [];

export const DEMO_CALLS = [
  {
    id: 'call-1',
    lead: { name: 'Aditi Sharma', phone: '9876543210' },
    status: 'COMPLETED',
    duration: 142,
    summary: 'Hot lead — 3 BHK in Noida Sector 62, budget ₹80L, timeline 30 days. Ready for site visit.',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    transcript: [
      { speaker: 'assistant', text: 'नमस्ते, मैं LeadFlow से बोल रहा हूँ। आपने हमारी वेबसाइट पर inquiry की थी।' },
      { speaker: 'user', text: 'हाँ, मुझे Sector 62 में 3 BHK चाहिए। Budget 80 lakh है।' },
      { speaker: 'assistant', text: 'बहुत अच्छा। Timeline क्या है — इस महीने या अगले quarter?' },
      { speaker: 'user', text: 'इस महीने में finalize करना है। Site visit भी कर सकते हैं।' },
    ],
  },
  {
    id: 'call-2',
    lead: { name: 'Vikram Patel', phone: '9812345678' },
    status: 'NO_ANSWER',
    duration: 0,
    summary: 'No answer — retry scheduled in 2 hours.',
    createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    transcript: [],
  },
  {
    id: 'call-3',
    lead: { name: 'Rajesh Kumar', phone: '9988776655' },
    status: 'COMPLETED',
    duration: 118,
    summary: 'Warm lead — 2 BHK Gurgaon, ₹45L budget, moving in 30 days. Assigned to Priya Singh.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    transcript: [
      { speaker: 'assistant', text: 'Hello, I am calling from LeadFlow regarding your property inquiry.' },
      { speaker: 'user', text: 'Yes, I need a 2 BHK in Gurgaon. Budget is around 45 lakhs.' },
      { speaker: 'assistant', text: 'Great. When are you planning to move in?' },
      { speaker: 'user', text: 'Within 30 days. I have already shortlisted 3 projects.' },
    ],
  },
  {
    id: 'call-4',
    lead: { name: 'Meena Reddy', phone: '9123456789' },
    status: 'COMPLETED',
    duration: 95,
    summary: 'CRM software inquiry for 15-person team. Budget ₹12L. Demo requested next week.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    transcript: [
      { speaker: 'assistant', text: 'Hi Meena, calling about your CRM software inquiry from Facebook.' },
      { speaker: 'user', text: 'We need a CRM for our 15-person sales team. Budget is 12 lakhs annually.' },
      { speaker: 'assistant', text: 'Would you like to schedule a product demo?' },
      { speaker: 'user', text: 'Yes, next Tuesday works for us.' },
    ],
  },
  {
    id: 'call-5',
    lead: { name: 'Suresh Raina', phone: '9123456780' },
    status: 'COMPLETED',
    duration: 156,
    summary: 'Hot lead — commercial office Bangalore Whitefield, ₹1.5Cr budget. High intent, site visit booked.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    transcript: [
      { speaker: 'assistant', text: 'नमस्ते Suresh ji, JustDial inquiry के बारे में call कर रहा हूँ।' },
      { speaker: 'user', text: 'Whitefield में commercial office space चाहिए। Budget 1.5 crore है।' },
      { speaker: 'assistant', text: 'Area requirement कितना sq ft का है?' },
      { speaker: 'user', text: 'Minimum 3000 sq ft. Site visit Thursday को कर सकते हैं।' },
    ],
  },
  {
    id: 'call-6',
    lead: { name: 'Kavita Nair', phone: '9876512345' },
    status: 'COMPLETED',
    duration: 88,
    summary: 'Interior design for 4BHK villa, ₹35L budget. Portfolio requested via WhatsApp.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    transcript: [
      { speaker: 'assistant', text: 'Hello Kavita, following up on your interior design inquiry.' },
      { speaker: 'user', text: 'I need a full interior package for my 4BHK villa. Budget 35 lakhs.' },
      { speaker: 'assistant', text: 'I will send our portfolio on WhatsApp. Does that work?' },
      { speaker: 'user', text: 'Yes, please send it today.' },
    ],
  },
  {
    id: 'call-7',
    lead: { name: 'Amit Singh', phone: '9812345670' },
    status: 'COMPLETED',
    duration: 134,
    summary: 'Enterprise SaaS — 50 users, ₹60L annual contract. Proposal sent, awaiting sign-off.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    transcript: [
      { speaker: 'assistant', text: 'Hi Amit, calling about your enterprise SaaS inquiry via Zapier.' },
      { speaker: 'user', text: 'We need 50 user licenses. Annual budget is 60 lakhs.' },
      { speaker: 'assistant', text: 'Our proposal has been emailed. Any questions on pricing?' },
      { speaker: 'user', text: 'Looks good. Awaiting CFO approval this week.' },
    ],
  },
  {
    id: 'call-8',
    lead: { name: 'Priya Verma', phone: '9876512340' },
    status: 'COMPLETED',
    duration: 121,
    summary: 'Closed won — warehouse lease Pune MIDC, ₹1.2Cr. Deal signed.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    transcript: [
      { speaker: 'assistant', text: 'Hello Priya, following up on your warehouse lease inquiry.' },
      { speaker: 'user', text: 'We have finalized the Pune MIDC location. 1.2 crore annual lease.' },
      { speaker: 'assistant', text: 'Congratulations! I will update your pipeline to Closed Won.' },
      { speaker: 'user', text: 'Thank you. Please send the agreement copy.' },
    ],
  },
];

export const DEMO_CALL_STATS = (() => {
  const completed = DEMO_CALLS.filter((c) => c.status === 'COMPLETED');
  const totalDuration = completed.reduce((sum, c) => sum + c.duration, 0);
  const hotCount = completed.filter((c) =>
    c.summary.toLowerCase().includes('hot') || c.summary.toLowerCase().includes('closed won')
  ).length;

  return {
    totalCalls: DEMO_CALLS.length,
    answeredCalls: completed.length,
    qualifyRate: Math.round((completed.length / DEMO_CALLS.length) * 100),
    avgDuration: completed.length ? Math.round(totalDuration / completed.length) : 0,
    hotCount,
  };
})();

export const getAllDemoLeads = () =>
  DEMO_KANBAN_STAGES.flatMap((stage) =>
    stage.leads.map((lead) => ({
      ...lead,
      stageName: stage.name,
      source: formatDemoSource(lead.source),
    }))
  );

const formatDemoSource = (source) => {
  const map = {
    WEBSITE_FORM: 'Website',
    WHATSAPP: 'WhatsApp',
    INDIAMART: 'IndiaMart',
    JUSTDIAL: 'JustDial',
    FACEBOOK: 'Facebook',
    ZAPIER: 'Zapier',
    MANUAL: 'Manual',
  };
  return map[source] || source;
};

export const DEMO_DASHBOARD_STATS = (() => {
  const leads = getAllDemoLeads();
  const called = leads.filter((l) => l.stageId !== 'stage-new').length;
  const qualified = leads.filter((l) =>
    ['stage-qualified', 'stage-proposal', 'stage-closed'].includes(l.stageId)
  ).length;

  return {
    totalLeads: leads.length,
    aiCalls: called,
    whatsappSent: Math.max(called - 1, 0),
    qualifiedCount: qualified,
    avgSeconds: 47,
  };
})();

export const DEMO_ACTIVITIES = getAllDemoLeads()
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  .slice(0, 5)
  .map((lead) => ({
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    source: lead.source,
    scoreLabel: lead.scoreLabel,
    createdAt: lead.createdAt,
  }));

export const DEMO_SOURCE_DATA = (() => {
  const counts = {};
  getAllDemoLeads().forEach((lead) => {
    counts[lead.source] = (counts[lead.source] || 0) + 1;
  });
  return Object.entries(counts).map(([source, count]) => ({ source, count }));
})();

export const DEMO_FUNNEL_DATA = DEMO_KANBAN_STAGES.map((stage) => ({
  stageName: stage.name,
  count: stage.leads.length,
}));

export const getDemoLeadById = (leadId) => {
  for (const stage of DEMO_KANBAN_STAGES) {
    const lead = stage.leads.find((l) => l.id === leadId);
    if (lead) {
      return {
        ...lead,
        calls: [
          {
            id: 'call-1',
            status: 'COMPLETED',
            duration: 127,
            createdAt: new Date(new Date(lead.createdAt).getTime() + 90000).toISOString(),
            transcript: 'AI: नमस्ते, LeadFlow से बात कर रहा हूँ। Lead: हाँ, मुझे property चाहिए। Budget 80 lakh है।',
          },
        ],
        notes: [
          { id: 'note-1', content: 'High intent — follow up with site visit.', createdAt: lead.createdAt },
        ],
      };
    }
  }
  return null;
};
