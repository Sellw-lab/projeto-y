import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  messages,
  photos,
  songs,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listAlbumItems(userId: number) {
  const db = await getDb();
  if (!db) return { photos: [], songs: [], messages: [] };
  const [photoRows, songRows, messageRows] = await Promise.all([
    db.select().from(photos).where(eq(photos.userId, userId)).orderBy(desc(photos.receivedAt)),
    db.select().from(songs).where(eq(songs.userId, userId)).orderBy(desc(songs.addedAt)),
    db.select().from(messages).where(eq(messages.userId, userId)).orderBy(desc(messages.receivedAt)),
  ]);
  return { photos: photoRows, songs: songRows, messages: messageRows };
}

export async function getPhotoById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(photos).where(and(eq(photos.id, id), eq(photos.userId, userId))).limit(1);
  return rows[0];
}

export async function getMessageById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(messages).where(and(eq(messages.id, id), eq(messages.userId, userId))).limit(1);
  return rows[0];
}

export async function deleteAlbumItem(type: "photo" | "song" | "message", id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  if (type === "photo") await db.delete(photos).where(and(eq(photos.id, id), eq(photos.userId, userId)));
  if (type === "song") await db.delete(songs).where(and(eq(songs.id, id), eq(songs.userId, userId)));
  if (type === "message") await db.delete(messages).where(and(eq(messages.id, id), eq(messages.userId, userId)));
}
