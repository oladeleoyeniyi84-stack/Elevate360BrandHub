export function trustedWriteOrigin(input: {
  origin?: string; referer?: string; fetchSite?: string; configuredOrigin?: string;
  authenticated: boolean;
}): boolean {
  if (input.fetchSite === "cross-site" || input.fetchSite === "same-site") return false;
  const supplied = input.origin || input.referer;
  if (!supplied) return !input.authenticated;
  if (!input.configuredOrigin) return false;
  try {
    const configured = input.configuredOrigin.includes("://") ? input.configuredOrigin : `https://${input.configuredOrigin}`;
    return new URL(supplied).origin === new URL(configured).origin;
  } catch { return false; }
}
