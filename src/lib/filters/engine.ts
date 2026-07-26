import type { CompanyRecord } from "@/lib/types";
import { FIELD_REGISTRY, type FieldDef } from "./fields";
import { isFilterGroup, type FilterCondition, type FilterNode } from "./types";

function coerce(field: FieldDef, raw: unknown): unknown {
  if (raw === undefined || raw === null) return raw;
  switch (field.kind) {
    case "number": {
      const n = typeof raw === "number" ? raw : Number(raw);
      return Number.isNaN(n) ? null : n;
    }
    case "boolean":
      if (typeof raw === "boolean") return raw;
      return raw === "true" ? true : raw === "false" ? false : null;
    case "date": {
      const t = new Date(raw as string | number).getTime();
      return Number.isNaN(t) ? null : t;
    }
    default:
      return String(raw);
  }
}

// `field.column` is a loose string rather than `keyof CompanyRecord`, so
// this one cast is the single place that trades static indexing safety for
// the flexibility of registering fields dynamically — every other function
// here stays generic over T.
function fieldValue<T extends CompanyRecord>(company: T, field: FieldDef): unknown {
  const raw = (company as unknown as Record<string, unknown>)[field.column];
  if (field.kind === "date" && typeof raw === "string") {
    return new Date(raw).getTime();
  }
  return raw;
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

export function evaluateCondition<T extends CompanyRecord>(company: T, condition: FilterCondition): boolean {
  const field = FIELD_REGISTRY[condition.field];
  if (!field) {
    throw new Error(
      `Unknown filter field "${condition.field}". Add it to src/lib/filters/fields.ts first.`,
    );
  }

  const value = fieldValue(company, field);

  switch (condition.operator) {
    case "equals":
      return value === coerce(field, condition.value);

    case "not_equals":
      return value !== coerce(field, condition.value);

    case "contains":
      return typeof value === "string" &&
        value.toLowerCase().includes(String(condition.value ?? "").toLowerCase());

    case "not_contains":
      return !(
        typeof value === "string" &&
        value.toLowerCase().includes(String(condition.value ?? "").toLowerCase())
      );

    case "in": {
      const values = (Array.isArray(condition.value) ? condition.value : [condition.value]).map((v) =>
        coerce(field, v),
      );
      return values.includes(value);
    }

    case "not_in": {
      const values = (Array.isArray(condition.value) ? condition.value : [condition.value]).map((v) =>
        coerce(field, v),
      );
      return !values.includes(value);
    }

    case "greater_than":
      return value !== null && value !== undefined && (value as number) > (coerce(field, condition.value) as number);

    case "less_than":
      return value !== null && value !== undefined && (value as number) < (coerce(field, condition.value) as number);

    case "between": {
      if (!Array.isArray(condition.value) || condition.value.length !== 2) return false;
      if (value === null || value === undefined) return false;
      const [min, max] = condition.value.map((v) => coerce(field, v)) as [number, number];
      return (value as number) >= min && (value as number) <= max;
    }

    case "has_property":
      return !isBlank(value);

    case "is_missing":
      return isBlank(value);

    default:
      return false;
  }
}

function evaluate<T extends CompanyRecord>(company: T, node: FilterNode): boolean {
  if (isFilterGroup(node)) {
    return node.op === "AND"
      ? node.conditions.every((c) => evaluate(company, c))
      : node.conditions.some((c) => evaluate(company, c));
  }
  return evaluateCondition(company, node);
}

export function filterCompanies<T extends CompanyRecord>(companies: T[], tree: FilterNode | undefined): T[] {
  if (!tree || (isFilterGroup(tree) && tree.conditions.length === 0)) return companies;
  return companies.filter((c) => evaluate(c, tree));
}

export function searchCompanies<T extends CompanyRecord>(companies: T[], search: string): T[] {
  if (!search.trim()) return companies;
  const needle = search.trim().toLowerCase();
  return companies.filter((c) => c.name?.toLowerCase().includes(needle));
}

export function sortCompanies<T extends CompanyRecord>(
  companies: T[],
  fieldKey: string | undefined,
  direction: "asc" | "desc",
): T[] {
  if (!fieldKey) return companies;
  const field = FIELD_REGISTRY[fieldKey];
  if (!field) return companies;

  const sorted = [...companies].sort((a, b) => {
    const va = fieldValue(a, field);
    const vb = fieldValue(b, field);
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    if ((va as number | string) < (vb as number | string)) return -1;
    if ((va as number | string) > (vb as number | string)) return 1;
    return 0;
  });

  return direction === "desc" ? sorted.reverse() : sorted;
}
