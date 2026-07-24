import { z } from "zod";

export const OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "in",
  "not_in",
  "greater_than",
  "less_than",
  "between",
  "has_property",
  "is_missing",
] as const;

export type Operator = (typeof OPERATORS)[number];

export const OPERATOR_LABELS: Record<Operator, string> = {
  equals: "is",
  not_equals: "is not",
  contains: "contains",
  not_contains: "does not contain",
  in: "is any of",
  not_in: "is none of",
  greater_than: "is greater than",
  less_than: "is less than",
  between: "is between",
  has_property: "is known",
  is_missing: "is missing / blank",
};

const scalarValue = z.union([z.string(), z.number(), z.boolean()]);

export const filterConditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(OPERATORS),
  value: z.union([scalarValue, z.array(scalarValue)]).optional(),
});

export type FilterCondition = z.infer<typeof filterConditionSchema>;

export type FilterGroup = {
  op: "AND" | "OR";
  conditions: FilterNode[];
};

export type FilterNode = FilterCondition | FilterGroup;

export const filterNodeSchema: z.ZodType<FilterNode> = z.lazy(() =>
  z.union([
    filterConditionSchema,
    z.object({
      op: z.enum(["AND", "OR"]),
      conditions: z.array(filterNodeSchema).min(1),
    }),
  ]),
);

export function isFilterGroup(node: FilterNode): node is FilterGroup {
  return "op" in node;
}
