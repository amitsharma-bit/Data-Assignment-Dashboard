import { useState } from "react";
import { FIELD_REGISTRY, OPERATORS_BY_KIND } from "@/lib/filters/fields";
import { OPERATOR_LABELS, type FilterCondition, type Operator } from "@/lib/filters/types";
import { BAND_ORDER, BAND_LABELS, DEFAULT_SCORING_CONFIG, type HardDisqualifier, type ScoringConfig, type WeightedSignal } from "@/lib/scoring/types";

const FIELD_OPTIONS = Object.entries(FIELD_REGISTRY)
  .filter(([key]) => key !== "score" && key !== "scoreBand") // scoring rules shouldn't reference the score itself
  .sort((a, b) => a[1].label.localeCompare(b[1].label));

function ConditionEditor({ condition, onChange }: { condition: FilterCondition; onChange: (next: FilterCondition) => void }) {
  const field = FIELD_REGISTRY[condition.field];
  const allowedOps = field ? OPERATORS_BY_KIND[field.kind] : [];
  const needsValue = condition.operator !== "has_property" && condition.operator !== "is_missing";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="rounded border px-2 py-1 text-sm"
        value={condition.field}
        onChange={(e) => {
          const nextField = FIELD_REGISTRY[e.target.value];
          onChange({ field: e.target.value, operator: OPERATORS_BY_KIND[nextField.kind][0], value: undefined });
        }}
      >
        {FIELD_OPTIONS.map(([key, def]) => (
          <option key={key} value={key}>
            {def.label}
          </option>
        ))}
      </select>
      <select
        className="rounded border px-2 py-1 text-sm"
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value as Operator, value: undefined })}
      >
        {allowedOps.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>
      {needsValue && (
        <input
          className="w-40 rounded border px-2 py-1 text-sm"
          placeholder={condition.operator === "in" || condition.operator === "not_in" || condition.operator === "between" ? "comma-separated" : "value"}
          value={Array.isArray(condition.value) ? condition.value.join(", ") : String(condition.value ?? "")}
          onChange={(e) => {
            const isMulti = condition.operator === "in" || condition.operator === "not_in" || condition.operator === "between";
            onChange({
              ...condition,
              value: isMulti ? e.target.value.split(",").map((v) => v.trim()).filter(Boolean) : e.target.value,
            });
          }}
        />
      )}
    </div>
  );
}

export function AdminRules({
  config,
  onSave,
}: {
  config: ScoringConfig;
  onSave: (config: ScoringConfig) => Promise<void>;
}) {
  const [draft, setDraft] = useState<ScoringConfig>(config);
  const [saved, setSaved] = useState(false);

  function update(next: ScoringConfig) {
    setDraft(next);
    setSaved(false);
  }

  function updateDisqualifier(index: number, next: HardDisqualifier) {
    const list = [...draft.hardDisqualifiers];
    list[index] = next;
    update({ ...draft, hardDisqualifiers: list });
  }

  function removeDisqualifier(index: number) {
    update({ ...draft, hardDisqualifiers: draft.hardDisqualifiers.filter((_, i) => i !== index) });
  }

  function addDisqualifier() {
    const [firstKey] = FIELD_OPTIONS[0];
    const field = FIELD_REGISTRY[firstKey];
    update({
      ...draft,
      hardDisqualifiers: [
        ...draft.hardDisqualifiers,
        {
          name: `rule_${draft.hardDisqualifiers.length + 1}`,
          condition: { field: firstKey, operator: OPERATORS_BY_KIND[field.kind][0] },
          reason: "New disqualifying rule",
        },
      ],
    });
  }

  function updateSignal(index: number, next: WeightedSignal) {
    const list = [...draft.weightedSignals];
    list[index] = next;
    update({ ...draft, weightedSignals: list });
  }

  function removeSignal(index: number) {
    update({ ...draft, weightedSignals: draft.weightedSignals.filter((_, i) => i !== index) });
  }

  function addSignal() {
    const [firstKey] = FIELD_OPTIONS[0];
    const field = FIELD_REGISTRY[firstKey];
    update({
      ...draft,
      weightedSignals: [
        ...draft.weightedSignals,
        {
          name: `signal_${draft.weightedSignals.length + 1}`,
          condition: { field: firstKey, operator: OPERATORS_BY_KIND[field.kind][0] },
          points: 5,
          description: "New weighted signal",
        },
      ],
    });
  }

  async function handleSave() {
    await onSave(draft);
    setSaved(true);
  }

  function handleResetToDefaults() {
    update(DEFAULT_SCORING_CONFIG);
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Scoring Rules</h1>
          <p className="text-sm text-gray-500">
            Edits apply to every tab immediately after saving — nothing here is hardcoded.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleResetToDefaults} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-100">
            Reset to defaults
          </button>
          <button onClick={handleSave} className="rounded bg-gray-900 px-4 py-1.5 text-sm font-medium text-white">
            Save changes
          </button>
        </div>
      </div>

      {saved && <p className="mb-4 text-sm text-emerald-700">Saved. The dashboard, planner, and drawer now use this config.</p>}

      <div className="mb-6 rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Base points</h2>
        <input
          type="number"
          className="w-24 rounded border px-2 py-1 text-sm"
          value={draft.basePoints}
          onChange={(e) => update({ ...draft, basePoints: Number(e.target.value) })}
        />
      </div>

      <div className="mb-6 rounded-lg border bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Score bands</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BAND_ORDER.map((band) => (
            <div key={band}>
              <div className="mb-1 text-xs text-gray-500">{BAND_LABELS[band]}</div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  className="w-16 rounded border px-2 py-1 text-sm"
                  value={draft.bandThresholds[band].min}
                  onChange={(e) =>
                    update({
                      ...draft,
                      bandThresholds: {
                        ...draft.bandThresholds,
                        [band]: { ...draft.bandThresholds[band], min: Number(e.target.value) },
                      },
                    })
                  }
                />
                <span className="text-xs text-gray-400">to</span>
                <input
                  type="number"
                  className="w-16 rounded border px-2 py-1 text-sm"
                  value={draft.bandThresholds[band].max}
                  onChange={(e) =>
                    update({
                      ...draft,
                      bandThresholds: {
                        ...draft.bandThresholds,
                        [band]: { ...draft.bandThresholds[band], max: Number(e.target.value) },
                      },
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-lg border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Hard disqualifiers</h2>
          <button onClick={addDisqualifier} className="text-sm font-medium text-blue-700 hover:underline">
            + Add rule
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          Any match here caps the company's score at the top of "Poor candidate", regardless of other signals.
        </p>
        <div className="space-y-3">
          {draft.hardDisqualifiers.map((rule, i) => (
            <div key={i} className="rounded border p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  className="flex-1 rounded border px-2 py-1 text-sm"
                  placeholder="Reason shown to the user"
                  value={rule.reason}
                  onChange={(e) => updateDisqualifier(i, { ...rule, reason: e.target.value })}
                />
                <button onClick={() => removeDisqualifier(i)} className="text-sm text-red-600 hover:underline">
                  Remove
                </button>
              </div>
              <ConditionEditor condition={rule.condition} onChange={(c) => updateDisqualifier(i, { ...rule, condition: c })} />
            </div>
          ))}
          {draft.hardDisqualifiers.length === 0 && <p className="text-sm text-gray-400">No hard disqualifiers.</p>}
        </div>
      </div>

      <div className="mb-6 rounded-lg border bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Weighted signals</h2>
          <button onClick={addSignal} className="text-sm font-medium text-blue-700 hover:underline">
            + Add signal
          </button>
        </div>
        <div className="space-y-3">
          {draft.weightedSignals.map((signal, i) => (
            <div key={i} className="rounded border p-3">
              <div className="mb-2 flex items-center gap-2">
                <input
                  className="flex-1 rounded border px-2 py-1 text-sm"
                  placeholder="Description shown to the user"
                  value={signal.description}
                  onChange={(e) => updateSignal(i, { ...signal, description: e.target.value })}
                />
                <input
                  type="number"
                  className="w-20 rounded border px-2 py-1 text-sm"
                  title="Points"
                  value={signal.points}
                  onChange={(e) => updateSignal(i, { ...signal, points: Number(e.target.value) })}
                />
                <button onClick={() => removeSignal(i)} className="text-sm text-red-600 hover:underline">
                  Remove
                </button>
              </div>
              <ConditionEditor condition={signal.condition} onChange={(c) => updateSignal(i, { ...signal, condition: c })} />
            </div>
          ))}
          {draft.weightedSignals.length === 0 && <p className="text-sm text-gray-400">No weighted signals.</p>}
        </div>
      </div>
    </div>
  );
}
