const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ROLE_HIERARCHY } = require('../src/middleware/rbac');

test('RBAC hierarchy ranks roles correctly', () => {
  assert.ok(ROLE_HIERARCHY.SUPER_ADMIN > ROLE_HIERARCHY.OWNER);
  assert.ok(ROLE_HIERARCHY.OWNER > ROLE_HIERARCHY.ADMIN);
  assert.ok(ROLE_HIERARCHY.ADMIN > ROLE_HIERARCHY.MANAGER);
  assert.ok(ROLE_HIERARCHY.MANAGER > ROLE_HIERARCHY.AGENT);
  assert.ok(ROLE_HIERARCHY.AGENT > ROLE_HIERARCHY.VIEWER);
});

test('AGENT and VIEWER are lower privilege than MANAGER', () => {
  assert.ok(ROLE_HIERARCHY.MANAGER > ROLE_HIERARCHY.AGENT);
  assert.ok(ROLE_HIERARCHY.MANAGER > ROLE_HIERARCHY.VIEWER);
});
