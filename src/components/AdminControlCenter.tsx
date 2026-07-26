import { useMemo, useState } from "react";
import { getDistinctPods, podForOwner, roleForOwner } from "@/lib/pods";
import type { RosterOverride, RosterOverrideMap } from "@/lib/rosterOverrides";
import type { OwnerRecord, OwnerRole } from "@/lib/types";

const UNASSIGNED = "__unassigned__";

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

  const rows = useMemo(() => {
    const all = sortedOwners.map((owner) => ({
      owner,
      role: roleForOwner(owner.id, ownersById, rosterOverrides),
      pod: podForOwner(owner.id, ownersById, rosterOverrides),
      isOverridden: Boolean(rosterOverrides[owner.id]),
    }));
    if (!search.trim()) return all;
    const needle = search.trim().toLowerCase();
    return all.filter((r) => r.owner.name?.toLowerCase().includes(needle) || r.owner.email?.toLowerCase().includes(needle));
  }, [sortedOwners, ownersById, rosterOverrides, search]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-xl font-semibold">Admin · Control Center</h1>
      <p className="mb-4 text-sm text-gray-500">
        Assign each person's sales pod and role (SDR/AE) here. Matched to a real synced HubSpot owner, so the
        owner id is always correct — no more name-matching guesswork.
      </p>

      <div className="mb-6 rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">Add / Update assignment</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-600">Person</label>
            <select
              className="w-full rounded border px-2 py-1.5 text-sm"
              value={ownerId}
              onChange={(e) => loadOwnerIntoForm(e.target.value)}
            >
              <option value="">Select a HubSpot owner...</option>
              {sortedOwners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} {o.email ? `(${o.email})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Role</label>
            <select className="w-full rounded border px-2 py-1.5 text-sm" value={role} onChange={(e) => setRole(e.target.value as OwnerRole)}>
              <option value="SDR">SDR</option>
              <option value="AE">AE / Manager</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Pod</label>
            <select
              className="w-full rounded border px-2 py-1.5 text-sm"
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
            <label className="mb-1 block text-xs font-medium text-gray-600">Or create a new pod (overrides the dropdown above)</label>
            <input
              className="w-full rounded border px-2 py-1.5 text-sm"
              placeholder="New pod name"
              value={newPodName}
              onChange={(e) => setNewPodName(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSubmit}
              disabled={saving || !ownerId}
              className="w-full rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {saving ? "Saving..." : "Add / Update"}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="mb-2 flex items-center gap-3">
        <input
          className="w-64 rounded border px-2 py-1.5 text-sm"
          placeholder="Search people..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-sm text-gray-500">{rows.length.toLocaleString()} people</span>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Name</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Email</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Role</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Pod</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700">Source</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ owner, role: r, pod, isOverridden }) => (
              <tr key={owner.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2">{owner.name}</td>
                <td className="px-3 py-2 text-gray-500">{owner.email ?? "—"}</td>
                <td className="px-3 py-2">{r ?? "—"}</td>
                <td className="px-3 py-2">{pod ?? "Unassigned"}</td>
                <td className="px-3 py-2 text-xs text-gray-500">{isOverridden ? "Custom" : r || pod ? "Roster default" : "—"}</td>
                <td className="px-3 py-2">
                  <button onClick={() => loadOwnerIntoForm(owner.id)} className="mr-3 text-sm text-blue-700 hover:underline">
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
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
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
