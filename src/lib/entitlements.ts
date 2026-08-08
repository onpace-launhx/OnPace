export type FocusEntitlementProfile = {
  role?: string | null;
  plan?: string | null;
  trial_ends_at?: string | null;
  pro_expires_at?: string | null;
  subscription_status?: string | null;
};

function isFuture(value: string | null | undefined, now: Date) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date > now;
}

/**
 * Keep the browser, route guard, and API on the same access rule. Database
 * policies repeat this rule so a client cannot bypass it with direct queries.
 */
export function hasActiveFocusEntitlement(
  profile: FocusEntitlementProfile | null | undefined,
  now = new Date()
) {
  if (!profile) return false;
  if (profile.role === "admin" || profile.role === "super_admin") return true;
  if (profile.plan === "founding") return true;
  if (isFuture(profile.trial_ends_at, now)) return true;
  if (profile.plan !== "pro") return false;
  if (profile.subscription_status === "expired") return false;

  // A Pro plan without an expiry is a deliberate lifetime/admin grant.
  return !profile.pro_expires_at || isFuture(profile.pro_expires_at, now);
}
