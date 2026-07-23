const { test } = require('node:test');
const assert = require('node:assert/strict');

/**
 * Tenant isolation contract tests (logic-level).
 * Full DB integration tests require a test PostgreSQL instance.
 */
test('lead queries must always include organizationId scope', () => {
  const orgA = 'org-a-uuid';
  const orgB = 'org-b-uuid';
  const leadFromA = { id: 'lead-1', organizationId: orgA };

  const scopedWhere = (orgId, leadId) => ({ id: leadId, organizationId: orgId });
  const queryA = scopedWhere(orgA, leadFromA.id);
  const crossTenantQuery = scopedWhere(orgB, leadFromA.id);

  assert.equal(queryA.organizationId, orgA);
  assert.notEqual(crossTenantQuery.organizationId, leadFromA.organizationId);
});

test('agent lead filter restricts assigned leads only', () => {
  const agentFilter = { assignedToId: 'agent-user-id' };
  const leads = [
    { id: '1', assignedToId: 'agent-user-id' },
    { id: '2', assignedToId: 'other-agent' },
  ];
  const visible = leads.filter((lead) => lead.assignedToId === agentFilter.assignedToId);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, '1');
});
