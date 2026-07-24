import { recommendedAction } from "@/lib/scoring/engine";
import type { OwnerRecord, ScoredCompany, TeamRecord } from "@/lib/types";
import { ScoreBadge } from "./ScoreBadge";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm">{value ?? "—"}</div>
    </div>
  );
}

export function CompanyDrawer({
  company,
  owners,
  teams,
  onClose,
}: {
  company: ScoredCompany | null;
  owners: Map<string, OwnerRecord>;
  teams: Map<string, TeamRecord>;
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
            <h2 className="text-lg font-semibold">{company.name ?? "Unnamed company"}</h2>
            <p className="text-sm text-gray-500">{company.domain}</p>
          </div>
          <button onClick={onClose} className="rounded border px-2 py-1 text-sm hover:bg-gray-100">
            Close
          </button>
        </div>

        <div className="mb-4">
          <ScoreBadge score={company.score} band={company.scoreBand} />
          <p className="mt-2 text-sm font-medium">{recommendedAction(company)}</p>
        </div>

        {company.disqualifiers.length > 0 && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3">
            <div className="mb-1 text-xs font-semibold text-red-800">Disqualifying flags</div>
            <ul className="list-inside list-disc text-sm text-red-800">
              {company.disqualifiers.map((d) => (
                <li key={d.name}>{d.reason}</li>
              ))}
            </ul>
          </div>
        )}

        {company.scoreReasons.length > 0 && (
          <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-3">
            <div className="mb-1 text-xs font-semibold text-gray-700">Score breakdown</div>
            <ul className="text-sm text-gray-800">
              {company.scoreReasons.map((r) => (
                <li key={r.signal} className="flex justify-between py-0.5">
                  <span>{r.description}</span>
                  <span className="font-medium text-emerald-700">+{r.points}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Company owner" value={owners.get(company.ownerId ?? "")?.name ?? company.ownerId} />
          <Field label="HubSpot team" value={teams.get(company.teamId ?? "")?.name ?? company.teamId} />
          <Field label="Website status" value={company.websiteStatus} />
          <Field label="GD name" value={company.gdName} />
          <Field label="Lifecycle stage (GD level)" value={company.lifecycleStageGdLevel} />
          <Field label="Part of group dealership" value={company.isGroupDealership === null ? null : company.isGroupDealership ? "Yes" : "No"} />
          <Field label="Dealership group name" value={company.dealershipGroupName} />
          <Field label="Potential rooftops" value={company.potentialRooftops} />
          <Field label="Associated contacts" value={company.numAssociatedContacts} />
          <Field label="Associated deals" value={company.numAssociatedDeals} />
          <Field label="Used cars" value={company.numUsedCars} />
          <Field label="New cars" value={company.numNewCars} />
          <Field label="Total cars" value={company.totalCars} />
          <Field label="OEM" value={company.oem} />
          <Field label="Partner name" value={company.partnerName} />
          <Field label="DMS name" value={company.dmsName} />
          <Field label="Market segment" value={company.marketSegment} />
          <Field label="Tier" value={company.tier} />
          <Field label="City" value={company.city} />
          <Field label="State" value={company.state} />
          <Field label="Country" value={company.country} />
          <Field label="Last activity date" value={company.lastActivityDate ? new Date(company.lastActivityDate).toLocaleDateString() : null} />
          <Field label="Create date" value={company.createDate ? new Date(company.createDate).toLocaleDateString() : null} />
          <Field label="Owner assigned date" value={company.ownerAssignedDate ? new Date(company.ownerAssignedDate).toLocaleDateString() : null} />
        </div>
      </div>
    </div>
  );
}
