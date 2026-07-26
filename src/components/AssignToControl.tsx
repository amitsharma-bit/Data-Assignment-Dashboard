import { useState } from "react";
import type { OwnerRecord } from "@/lib/types";

export function AssignToControl({
  count,
  owners,
  onAssign,
}: {
  count: number;
  owners: OwnerRecord[];
  onAssign: (ownerId: string) => Promise<void>;
}) {
  const [ownerId, setOwnerId] = useState("");
  const [busy, setBusy] = useState(false);

  const sortedOwners = [...owners].filter((o) => o.name).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  async function handleClick() {
    if (!ownerId) return;
    const ownerName = sortedOwners.find((o) => o.id === ownerId)?.name ?? ownerId;
    const ok = confirm(
      `Reassign ${count} compan${count === 1 ? "y" : "ies"} to ${ownerName}?\n\nThis updates Company owner directly in HubSpot — it is not reversible from here (you'd need to reassign back manually).`,
    );
    if (!ok) return;

    setBusy(true);
    try {
      await onAssign(ownerId);
      setOwnerId("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        className="rounded border px-2 py-1.5 text-sm"
        value={ownerId}
        onChange={(e) => setOwnerId(e.target.value)}
        disabled={busy}
      >
        <option value="">Assign to...</option>
        {sortedOwners.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <button
        onClick={handleClick}
        disabled={!ownerId || busy || count === 0}
        className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {busy ? "Assigning..." : `Assign ${count} selected`}
      </button>
    </div>
  );
}
