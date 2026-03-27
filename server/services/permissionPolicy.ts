export type Role = "founder" | "admin" | "operator" | "analyst" | "reviewer";

export type Permission =
  | "view"
  | "approve"
  | "execute"
  | "rollback"
  | "change_policies"
  | "change_automation";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  founder:  ["view", "approve", "execute", "rollback", "change_policies", "change_automation"],
  admin:    ["view", "approve", "execute", "rollback", "change_policies"],
  operator: ["view", "approve", "execute", "rollback"],
  analyst:  ["view"],
  reviewer: ["view", "approve"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function resolveRole(email: string, overrides: { email: string; role: string }[]): Role {
  const override = overrides.find((r) => r.email === email);
  if (override && ROLE_PERMISSIONS[override.role as Role]) {
    return override.role as Role;
  }
  return "analyst";
}
