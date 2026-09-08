const permissions = {
  Admin: {
    data: ['read', 'write', 'export'],
    agent: ['execute'],
    model: ['read', 'write'],
    finetune: ['execute'],
    user: ['read', 'write'],
    audit: ['read', 'export'],
    config: ['read', 'write']
  },
  Manager: {
    data: ['read', 'write', 'export'],
    agent: ['execute'],
    model: ['read'],
    finetune: ['execute'],
    user: ['read', 'write'],
    audit: ['read']
  },
  Employee: { data: ['read'], agent: ['execute'] },
  Auditor: { data: ['read'], model: ['read'], audit: ['read', 'export'] },
  Guest: {}
};

export class RBACEngine {
  static can(user, resource, action) {
    return Boolean(permissions[user?.role]?.[resource]?.includes(action));
  }

  static permissionsFor(role) {
    return permissions[role] || {};
  }
}

export { permissions as RBAC_PERMISSIONS };