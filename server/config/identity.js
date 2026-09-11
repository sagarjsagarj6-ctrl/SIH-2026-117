export const PLATFORM_ROLES = ['Admin', 'Manager', 'Employee', 'Auditor', 'Guest'];

export const PLATFORM_DEPARTMENTS = [
  'Finance & Accounting',
  'Legal & Compliance',
  'R&D / Engineering',
  'Executive & Strategy',
  'Human Resources'
];

export const AI_PROFILES = ['Fast', 'Balanced', 'Advanced'];

export const USER_STATUSES = ['Active', 'Inactive', 'Suspended'];

export const isKnownRole = (role) => PLATFORM_ROLES.includes(role);
export const isKnownDepartment = (department) => PLATFORM_DEPARTMENTS.includes(department);
export const isKnownUserStatus = (status) => USER_STATUSES.includes(status);
