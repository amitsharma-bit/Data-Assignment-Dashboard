import { getMeta, setMeta } from "./db";
import type { OwnerRole, OwnerRoleMap } from "./types";

const META_KEY = "ownerRoles";

export async function loadOwnerRoles(): Promise<OwnerRoleMap> {
  return (await getMeta<OwnerRoleMap>(META_KEY)) ?? {};
}

export async function saveOwnerRoles(roles: OwnerRoleMap): Promise<void> {
  await setMeta(META_KEY, roles);
}

export function roleOf(ownerId: string | null | undefined, roles: OwnerRoleMap): OwnerRole {
  if (!ownerId) return "AE";
  return roles[ownerId] ?? "AE";
}
