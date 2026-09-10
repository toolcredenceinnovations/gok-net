/**
 * Role capabilities, in one place, shared by web and mobile.
 *
 * This MIRRORS the RLS policies in
 * supabase/migrations/20260821080200_rls_policies.sql and the role table in
 * docs/AUTH.md. The database is the real guard — this exists so the UI can
 * hide an action the user cannot perform, rather than offering it and then
 * failing. If you change a policy, change the matching entry here.
 *
 * One entry has no RLS equivalent by design: `viewDashboard`. SCOPE.md Q5
 * settles it — members may read every expense row (that IS an RLS policy),
 * but the full spend-breakdown dashboard is a route + role gate, not a row
 * gate. So it lives here and in the route, not in a policy.
 */

export type Role = 'owner' | 'admin' | 'member' | 'viewer'

export const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

export type Capability =
  | 'viewExpenses'
  | 'createExpense'
  | 'editExpense'
  | 'uploadAttachment'
  | 'createVendor'
  | 'editVendor'
  | 'recordPayment'
  | 'voidEntry'
  | 'restoreEntry'
  | 'manageSubcategories'
  | 'manageUsers'
  | 'viewAuditLog'
  | 'export'
  | 'viewDashboard'

const MATRIX: Record<Capability, readonly Role[]> = {
  viewExpenses: ['owner', 'admin', 'member', 'viewer'],
  createExpense: ['owner', 'admin', 'member'],
  // RLS: "owner admin edit expenses" — a member creates but cannot amend.
  editExpense: ['owner', 'admin'],
  uploadAttachment: ['owner', 'admin', 'member'],
  createVendor: ['owner', 'admin', 'member'],
  editVendor: ['owner', 'admin'],
  // PIN-gated. The route re-checks this server-side; hiding it is a courtesy.
  recordPayment: ['owner', 'admin'],
  voidEntry: ['owner', 'admin'],
  restoreEntry: ['owner'],
  manageSubcategories: ['owner'],
  manageUsers: ['owner'],
  viewAuditLog: ['owner', 'admin'],
  export: ['owner', 'admin', 'viewer'],
  viewDashboard: ['owner', 'admin', 'viewer'],
}

/** Never trust this alone — it hides UI, it does not protect data. */
export function can(role: Role | null | undefined, capability: Capability): boolean {
  if (!role) return false
  return MATRIX[capability].includes(role)
}

/** Every capability for a role, for debugging and the operator panel. */
export function capabilitiesFor(role: Role): Capability[] {
  return (Object.keys(MATRIX) as Capability[]).filter((c) => MATRIX[c].includes(role))
}
