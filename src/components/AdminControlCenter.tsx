import { useMemo, useState } from "react";
import { getDistinctPods, podForOwner, roleForOwner } from "@/lib/pods";
import type { RosterOverride, RosterOverrideMap } from "@/lib/rosterOverrides";
import type { OwnerRecord, OwnerRole } from "@/lib/types";
import { Avatar } from "./ui/Avatar";
import { RoleBadge } from "./ui/RoleBadge";
import { SortableHeader, toggleSort as toggleSortHelper, type SortDirection } from "./ui/SortableHeader";

const UNASSIGNED = "__unassigned__";

type PersonSortField = "name" | "email" | "role" | "pod" | "source";

const PEOPLE_COLUMNS: { field: PersonSortField; label: string }[] = [
  { field: "name", label: "Name" },
  { field: "email", label: "Email" },
  { field: "role", label: "Role" },
  { field: "pod", label: "Pod" },
  { field: "source", label: "Source" },
];

export function AdminControlCenter({
  owners,
  rosterOverrides,
  onSave,
  onRemove,
}: {
  owners: OwnerRecord[];
  rosterOverrides: RosterOverrideMap;
  onSave: (override: RosterOverride) => Promise<void>;
  onRemove: (ownerId: string) => Promise<void>;
}) {
  const ownersById = useMemo(() => new Map(owners.map((o) => [o.id, o])), [owners]);
  const knownPods = useMemo(() => getDistinctPods(rosterOverrides), [rosterOverrides]);

  const sortedOwners = useMemo(
    () => [...owners].filter((o) => o.name).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
    [owners],
  );

  const [ownerId, setOwnerId] = useState("");
  const [role, setRole] = useState<OwnerRole>("SDR");
  const [podChoice, setPodChoice] = useState<string>(UNASSIGNED);
  const [newPodName, setNewPodName] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPod, setExpandedPod] = useState<string | null>(null);
  const [sortField, setSortField] = useState<PersonSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  function loadOwnerIntoForm(id: string) {
    setOwnerId(id);
    const currentRole = roleForOwner(id, ownersById, rosterOverrides);
    const currentPod = podForOwner(id, ownersById, rosterOverrides);
    setRole(currentRole ?? "SDR");
    setPodChoice(currentPod ?? UNASSIGNED);
    setNewPodName("");
  }

  async function handleSubmit() {
    if (!ownerId) {
      setError("Pick a person first.");
      return;
    }
    const pod = newPodName.trim() ? newPodName.trim() : podChoice === UNASSIGNED ? null : podChoice;
    setSaving(true);
    setError(null);
    try {
      await onSave({ ownerId, role, pod });
      setOwnerId("");
      setPodChoice(UNASSIGNED);
      setNewPodName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const allResolved = useMemo(
    () =>
      sortedOwners.map((owner) => ({
        owner,
        role: roleForOwner(owner.id, ownersById, rosterOverrides),
        pod: podForOwner(owner.id, ownersById, rosterOverrides),
        isOverridden: Boolean(rosterOverrides[owner.id]),
      })),
    [sortedOwners, ownersById, rosterOverrides],
  );

  const rows = useMemo(() => {
    let filtered = allResolved;
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      filtered = filtered.filter(
        (r) => r.owner.name?.toLowerCase().includes(needle) || r.owner.email?.toLowerCase().includes(needle),
      );
    }
    if (!sortField) return filtered;
    const valueOf = (r: (typeof filtered)[number]): string | null => {
      switch (sortField) {
        case "name":
          return r.owner.name;
        case "email":
          return r.owner.email;
        case "role":
          return r.role;
        case "pod":
          return r.pod;
        case "source":
          return r.isOverridden ? "Custom" : r.role || r.pod ? "Roster default" : null;
      }
    };
    const sorted = [...filtered].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      if (va === null) return 1;
      if (vb === null) return -1;
      return va < vb ? -1 : va > vb ? 1 : 0;
    });
    return sortDirection === "desc" ? sorted.reverse() : sorted;
  }, [allResolved, search, sortField, sortDirection]);

  function toggleSort(field: PersonSortField) {
    toggleSortHelper(field, sortField, sortDirection, setSortField, setSortDirection);
  }

  const podSummaries = useMemo(
    () =>
      knownPods.map((pod) => {
        const members = allResolved.filter((r) => r.pod === pod);
        return {
          pod,
          members,
          aeCount: members.filter((m) => m.role === "AE").length,
          sdrCount: members.filter((m) => m.role === "SDR").length,
        };
      }),
    [knownPods, allResolved],
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-xl font-semibold text-slate-900">Admin · Control Center</h1>
      <p className="mb-4 text-sm text-slate-500">
        Assign each person's sales pod and role (SDR/AE) here. Matched to a real synced HubSpot owner, so the
        owner id is always correct — no more name-matching guesswork.
      </p>

      <div className="card mb-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Add / Update assignment</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Person</label>
            <select className="input w-full" value={ownerId} onChange={(e) => loadOwnerIntoForm(e.target.value)}>
              <option value="">Select a HubSpot owner...</option>
              {sortedOwners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} {o.email ? `(${o.email})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Role</label>
            <select className="input w-full" value={role} onChange={(e) => setRole(e.target.value as OwnerRole)}>
              <option value="SDR">SDR</option>
              <option value="AE">AE / Manager</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Pod</label>
            <select
              className="input w-full"
              value={podChoice}
              onChange={(e) => {
                setPodChoice(e.target.value);
                setNewPodName("");
              }}
            >
              <option value={UNASSIGNED}>Unassigned</option>
              {knownPods.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">Or create a new pod (overrides the dropdown above)</label>
            <input className="input w-full" placeholder="New pod name" value={newPodName} onChange={(e) => setNewPodName(e.target.value)} />
          </div>
          <div className="flex items-end">
            <button onClick={handleSubmit} disabled={saving || !ownerId} className="btn-primary w-full">
              {saving ? "Saving..." : "Add / Update"}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Team members</h2>
        <p className="mb-2 text-xs text-slate-500">Click a team to see its SDRs and AEs.</p>
        <div className="flex flex-wrap gap-2">
          {podSummaries.map(({ pod, aeCount, sdrCount }) => (
            <button
              key={pod}
              onClick={() => setExpandedPod(expandedPod === pod ? null : pod)}
              className={expandedPod === pod ? "pill-active" : "pill-idle"}
            >
              {pod} <span className="opacity-80">· {aeCount} AE / {sdrCount} SDR</span>
            </button>
          ))}
          {podSummaries.length === 0 && <p className="text-sm text-slate-400">No pods yet.</p>}
        </div>

        {expandedPod &&
          (() => {
            const summary = podSummaries.find((p) => p.pod === expandedPod);
            if (!summary) return null;
            return (
              <div className="card mt-3">
                <div className="mb-3 text-sm font-semibold text-slate-900">
                  {summary.pod} — {summary.aeCount} AE, {summary.sdrCount} SDR
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {summary.members.map((m) => (
                    <div key={m.owner.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
                      <Avatar id={m.owner.id} name={m.owner.name} />
                      <span className="flex-1 truncate text-sm text-slate-800">{m.owner.name}</span>
                      <RoleBadge role={m.role} />
                    </div>
                  ))}
                  {summary.members.length === 0 && <p className="text-sm text-slate-400">No members.</p>}
                </div>
              </div>
            );
          })()}
      </div>

      <div className="mb-2 flex items-center gap-3">
        <input className="input w-64" placeholder="Search people..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <span className="text-sm text-slate-500">{rows.length.toLocaleString()} people</span>
      </div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              {PEOPLE_COLUMNS.map((col) => (
                <SortableHeader
                  key={col.field}
                  label={col.label}
                  field={col.field}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                />
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ owner, role: r, pod, isOverridden }) => (
              <tr key={owner.id}>
                <td>
                  <span className="flex items-center gap-2 font-medium text-slate-900">
                    <Avatar id={owner.id} name={owner.name} />
                    {owner.name}
                  </span>
                </td>
                <td className="text-slate-500">{owner.email ?? "—"}</td>
                <td>
                  <RoleBadge role={r} />
                </td>
                <td>{pod ?? "Unassigned"}</td>
                <td>
                  <span className={isOverridden ? "badge-emerald" : r || pod ? "badge-slate" : "text-xs text-slate-400"}>
                    {isOverridden ? "Custom" : r || pod ? "Roster default" : "—"}
                  </span>
                </td>
                <td>
                  <button onClick={() => loadOwnerIntoForm(owner.id)} className="mr-3 text-sm font-medium text-indigo-600 hover:underline">
                    Edit
                  </button>
                  {isOverridden && (
                    <button onClick={() => onRemove(owner.id)} className="text-sm text-red-600 hover:underline">
                      Revert
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                  No people match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
