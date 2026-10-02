import { hasPermission, type Role } from "../services/permissionPolicy";

export function dashboardSessionPermitted(session: any, method: string): boolean {
  if (session?.dashboardAuthed !== true || typeof session.dashboardRole !== "string") return false;
  return hasPermission(session.dashboardRole as Role, ["GET", "HEAD", "OPTIONS"].includes(method) ? "view" : "execute");
}
