import { podForOwner, roleForOwner } from "@/lib/pods";
import type { RosterOverrideMap } from "@/lib/rosterOverrides";
import type { CompanyRecord, OwnerRecord, TeamRecord } from "@/lib/types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm text-slate-800">{value ?? "—"}</div>
    </div>
  );
}

export function CompanyDrawer({
  company,
  owners,
  teams,
  rosterOverrides,
  onClose,
}: {
  company: CompanyRecord | null;
  owners: Map<string, OwnerRecord>;
  teams: Map<string, TeamRecord>;
  rosterOverrides: RosterOverrideMap;
  onClose: () => void;
}) {
  if (!company) return null;

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{company.name ?? "Unnamed company"}</h2>
            <p className="text-sm text-slate-500">{company.domain}</p>
          </div>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Company owner" value={owners.get(company.ownerId ?? "")?.name ?? company.ownerId} />
          <Field label="Sales pod" value={podForOwner(company.ownerId, owners, rosterOverrides) ?? "Unassigned"} />
          <Field label="Owner role" value={roleForOwner(company.ownerId, owners, rosterOverrides) ?? "—"} />
          <Field label="HubSpot team" value={teams.get(company.teamId ?? "")?.name ?? company.teamId} />
          <Field label="Website status" value={company.websiteStatus} />
          <Field label="GD name" value={company.gdName} />
          <Field label="Lifecycle stage (GD level)" value={company.lifecycleStageGdLevel} />
          <Field
            label="Part of group dealership"
            value={company.isGroupDealership === null ? null : company.isGroupDealership ? "Yes" : "No"}
          />
          <Field label="Potential rooftops" value={company.potentialRooftops} />
          <Field label="Dealership rank" value={company.dealershipRank} />
          <Field label="Associated contacts" value={company.numAssociatedContacts} />
          <Field label="Associated deals" value={company.numAssociatedDeals} />
          <Field label="Used cars" value={company.numUsedCars} />
          <Field label="New cars" value={company.numNewCars} />
          <Field label="Total cars" value={company.totalCars} />
          <Field label="Cars (GD level)" value={company.numCarsGdLevel} />
          <Field label="OEM" value={company.oem} />
          <Field label="Partner name" value={company.partnerName} />
          <Field label="DMS name" value={company.dmsName} />
          <Field label="Market segment" value={company.marketSegment} />
          <Field label="Tier" value={company.tier} />
          <Field label="City" value={company.city} />
          <Field label="State" value={company.state} />
          <Field label="Country" value={company.country} />
          <Field
            label="Last activity date"
            value={company.lastActivityDate ? new Date(company.lastActivityDate).toLocaleDateString() : null}
          />
          <Field
            label="GD last activity"
            value={company.gdLastActivity ? new Date(company.gdLastActivity).toLocaleDateString() : null}
          />
          <Field
            label="Create date"
            value={company.createDate ? new Date(company.createDate).toLocaleDateString() : null}
          />
          <Field
            label="Owner assigned date"
            value={company.ownerAssignedDate ? new Date(company.ownerAssignedDate).toLocaleDateString() : null}
          />
        </div>
      </div>
    </div>
  );
}
