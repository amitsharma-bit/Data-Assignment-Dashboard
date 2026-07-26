import { openDB, type IDBPDatabase } from "idb";
import type { CompanyRecord, OwnerRecord, TeamRecord } from "./types";

const DB_NAME = "data-assignment-dashboard";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("companies")) {
          db.createObjectStore("companies", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("owners")) {
          db.createObjectStore("owners", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("teams")) {
          db.createObjectStore("teams", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

export async function putCompanies(companies: CompanyRecord[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("companies", "readwrite");
  for (const company of companies) tx.store.put(company);
  await tx.done;
}

export async function getAllCompanies(): Promise<CompanyRecord[]> {
  const db = await getDb();
  return db.getAll("companies");
}

export async function countCompanies(): Promise<number> {
  const db = await getDb();
  return db.count("companies");
}

export async function putOwners(owners: OwnerRecord[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("owners", "readwrite");
  for (const owner of owners) tx.store.put(owner);
  await tx.done;
}

export async function getAllOwners(): Promise<OwnerRecord[]> {
  const db = await getDb();
  return db.getAll("owners");
}

export async function putTeams(teams: TeamRecord[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("teams", "readwrite");
  for (const team of teams) tx.store.put(team);
  await tx.done;
}

export async function getAllTeams(): Promise<TeamRecord[]> {
  const db = await getDb();
  return db.getAll("teams");
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const row = await db.get("meta", key);
  return row?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db.put("meta", { key, value });
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await Promise.all([db.clear("companies"), db.clear("owners"), db.clear("teams"), db.clear("meta")]);
}
