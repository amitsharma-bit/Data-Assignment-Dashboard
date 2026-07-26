import type { OwnerRole } from "@/lib/types";

// Categorical, not status — SDR/AE is identity, not state, so these use the
// categorical badge colors rather than the reserved good/warning/critical set.
export function RoleBadge({ role }: { role: OwnerRole | null }) {
  if (!role) return <span className="badge-slate">—</span>;
  return role === "AE" ? <span className="badge-violet">AE</span> : <span className="badge-blue">SDR</span>;
}
