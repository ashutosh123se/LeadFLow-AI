export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  AGENT: 'AGENT',
  VIEWER: 'VIEWER',
};

export const isSuperAdmin = (user) => user?.role === ROLES.SUPER_ADMIN;

export const isOrgAdmin = (user) =>
  user && [ROLES.SUPER_ADMIN, ROLES.OWNER, ROLES.ADMIN].includes(user.role);

export const getPostLoginPath = (user) =>
  isSuperAdmin(user) ? '/admin' : '/dashboard';

export const formatRole = (role) => {
  const labels = {
    SUPER_ADMIN: 'System Admin',
    OWNER: 'Owner',
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    AGENT: 'Agent',
    VIEWER: 'Viewer',
  };
  return labels[role] || role;
};
