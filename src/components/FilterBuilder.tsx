import { FIELD_REGISTRY, OPERATORS_BY_KIND } from "@/lib/filters/fields";
import { OPERATOR_LABELS, type FilterGroup, type FilterNode, type Operator } from "@/lib/filters/types";

const FIELD_OPTIONS = Object.entries(FIELD_REGISTRY).sort((a, b) => a[1].label.localeCompare(b[1].label));

function needsValue(operator: Operator) {
  return operator !== "has_property" && operator !== "is_missing";
}

function needsTwoValues(operator: Operator) {
  return operator === "between";
}

function needsListValue(operator: Operator) {
  return operator === "in" || operator === "not_in";
}

function ConditionRow({
  node,
  onChange,
  onRemove,
}: {
  node: Extract<FilterNode, { field: string }>;
  onChange: (next: typeof node) => void;
  onRemove: () => void;
}) {
  const field = FIELD_REGISTRY[node.field];
  const allowedOps = field ? OPERATORS_BY_KIND[field.kind] : [];

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border bg-white p-2">
      <select
        className="rounded border px-2 py-1 text-sm"
        value={node.field}
        onChange={(e) => {
          const nextField = FIELD_REGISTRY[e.target.value];
          const nextOps = nextField ? OPERATORS_BY_KIND[nextField.kind] : [];
          onChange({ field: e.target.value, operator: nextOps[0], value: undefined });
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
        value={node.operator}
        onChange={(e) => onChange({ ...node, operator: e.target.value as Operator, value: undefined })}
      >
        {allowedOps.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>

      {needsValue(node.operator) && needsTwoValues(node.operator) && (
        <span className="flex items-center gap-1">
          <input
            className="w-24 rounded border px-2 py-1 text-sm"
            placeholder="min"
            value={Array.isArray(node.value) ? String(node.value[0] ?? "") : ""}
            onChange={(e) =>
              onChange({
                ...node,
                value: [e.target.value, Array.isArray(node.value) ? node.value[1] : ""],
              })
            }
          />
          <span className="text-sm text-gray-500">and</span>
          <input
            className="w-24 rounded border px-2 py-1 text-sm"
            placeholder="max"
            value={Array.isArray(node.value) ? String(node.value[1] ?? "") : ""}
            onChange={(e) =>
              onChange({
                ...node,
                value: [Array.isArray(node.value) ? node.value[0] : "", e.target.value],
              })
            }
          />
        </span>
      )}

      {needsValue(node.operator) && needsListValue(node.operator) && (
        <input
          className="w-56 rounded border px-2 py-1 text-sm"
          placeholder="comma-separated values"
          value={Array.isArray(node.value) ? node.value.join(", ") : ""}
          onChange={(e) =>
            onChange({ ...node, value: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) })
          }
        />
      )}

      {needsValue(node.operator) && !needsTwoValues(node.operator) && !needsListValue(node.operator) && (
        <input
          className="w-40 rounded border px-2 py-1 text-sm"
          placeholder="value"
          value={typeof node.value === "string" || typeof node.value === "number" ? String(node.value) : ""}
          onChange={(e) => onChange({ ...node, value: e.target.value })}
        />
      )}

      <button onClick={onRemove} className="ml-auto text-sm text-red-600 hover:underline">
        Remove
      </button>
    </div>
  );
}

export function FilterBuilderGroup({
  group,
  onChange,
  onRemove,
  depth = 0,
}: {
  group: FilterGroup;
  onChange: (next: FilterGroup) => void;
  onRemove?: () => void;
  depth?: number;
}) {
  function updateChild(index: number, next: FilterNode) {
    const conditions = [...group.conditions];
    conditions[index] = next;
    onChange({ ...group, conditions });
  }

  function removeChild(index: number) {
    onChange({ ...group, conditions: group.conditions.filter((_, i) => i !== index) });
  }

  function addCondition() {
    const [firstKey] = FIELD_OPTIONS[0];
    const field = FIELD_REGISTRY[firstKey];
    onChange({
      ...group,
      conditions: [...group.conditions, { field: firstKey, operator: OPERATORS_BY_KIND[field.kind][0] }],
    });
  }

  function addGroup() {
    onChange({ ...group, conditions: [...group.conditions, { op: "AND", conditions: [] }] });
  }

  return (
    <div className={depth > 0 ? "rounded border-l-4 border-gray-300 bg-gray-50 p-3" : ""}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-medium">Match</span>
        <select
          className="rounded border px-2 py-1 text-sm"
          value={group.op}
          onChange={(e) => onChange({ ...group, op: e.target.value as "AND" | "OR" })}
        >
          <option value="AND">ALL of</option>
          <option value="OR">ANY of</option>
        </select>
        <span className="text-sm text-gray-500">these conditions</span>
        {onRemove && (
          <button onClick={onRemove} className="ml-auto text-sm text-red-600 hover:underline">
            Remove group
          </button>
        )}
      </div>

      <div className="space-y-2">
        {group.conditions.map((node, i) =>
          "op" in node ? (
            <FilterBuilderGroup
              key={i}
              group={node}
              onChange={(next) => updateChild(i, next)}
              onRemove={() => removeChild(i)}
              depth={depth + 1}
            />
          ) : (
            <ConditionRow
              key={i}
              node={node as Extract<FilterNode, { field: string }>}
              onChange={(next) => updateChild(i, next)}
              onRemove={() => removeChild(i)}
            />
          ),
        )}
      </div>

      <div className="mt-2 flex gap-3">
        <button onClick={addCondition} className="text-sm font-medium text-blue-700 hover:underline">
          + Add condition
        </button>
        <button onClick={addGroup} className="text-sm font-medium text-blue-700 hover:underline">
          + Add group
        </button>
      </div>
    </div>
  );
}
