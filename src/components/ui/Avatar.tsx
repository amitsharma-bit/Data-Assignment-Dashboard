// Fixed, non-cycled hue order so the same id always gets the same color —
// identity by hash, never by row position.
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-orange-100 text-orange-700",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ id, name, size = "sm" }: { id: string; name: string | null; size?: "sm" | "md" }) {
  const label = name ?? id;
  const colorClass = AVATAR_COLORS[hashString(id) % AVATAR_COLORS.length];
  const dimension = size === "md" ? "h-8 w-8 text-sm" : "h-6 w-6 text-[11px]";

  return (
    <span className={`inline-flex ${dimension} shrink-0 items-center justify-center rounded-full font-semibold ${colorClass}`}>
      {initialsOf(label)}
    </span>
  );
}
