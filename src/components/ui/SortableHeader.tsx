export type SortDirection = "asc" | "desc";

/** A column header with a tiny click-to-sort arrow — used by every table in the app. */
export function SortableHeader<F extends string>({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  className,
}: {
  label: string;
  field: F;
  sortField: F | null;
  sortDirection: SortDirection;
  onSort: (field: F) => void;
  className?: string;
}) {
  const active = sortField === field;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 ${active ? "text-indigo-600" : "hover:text-indigo-600"}`}
      >
        <span>{label}</span>
        <span className={`text-[10px] leading-none ${active ? "text-indigo-600" : "text-slate-300"}`}>
          {active ? (sortDirection === "asc" ? "▲" : "▼") : "⇕"}
        </span>
      </button>
    </th>
  );
}

/** Standard toggle: same field clicked again flips direction, a new field starts ascending. */
export function toggleSort<F extends string>(
  field: F,
  sortField: F | null,
  sortDirection: SortDirection,
  setSortField: (f: F) => void,
  setSortDirection: (d: SortDirection) => void,
) {
  if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
  else {
    setSortField(field);
    setSortDirection("asc");
  }
}
