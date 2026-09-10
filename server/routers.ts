import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { deleteAlbumItem, getDb, getMessageById, getPhotoById, listAlbumItems, upsertUser } from "./db";
import { messages, photos, songs } from "../drizzle/schema";

const SYSTEM_PASSWORD = "sereia";
const SYSTEM_OPEN_ID = "password-system-user";

const dateInput = z.string().datetime().or(z.string().date());
const dataUrlInput = z.string().min(20).max(45_000_000);
const itemIdInput = z.object({ id: z.number().int().positive() });

const messageInput = z.object({
  kind: z.enum(["text", "audio"]),
  title: z.string().trim().min(1).max(180),
  content: z.string().trim().max(20_000).optional(),
  note: z.string().trim().max(5000).optional(),
  fileName: z.string().min(1).max(255).optional(),
  mimeType: z.string().max(120).optional(),
  dataUrl: dataUrlInput.optional(),
  receivedAt: dateInput,
}).superRefine((value, refinementContext) => {
  if (value.kind === "text" && !value.content) {
    refinementContext.addIssue({ code: "custom", message: "Escreva a mensagem", path: ["content"] });
  }
  if (value.kind === "audio" && (!value.dataUrl || !value.fileName || !value.mimeType?.startsWith("audio/"))) {
    refinementContext.addIssue({ code: "custom", message: "Envie um áudio válido", path: ["dataUrl"] });
  }
});

export function decodeDataUrl(dataUrl: string) {
  const comma = dataUrl.indexOf(",");
  if (comma < 0) throw new Error("Arquivo inválido");
  const buffer = Buffer.from(dataUrl.slice(comma + 1), "base64");
  if (buffer.byteLength > 32 * 1024 * 1024) throw new Error("O arquivo precisa ter até 32 MB");
  return buffer;
}

export function safeFileName(fileName: string) {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/^-+|-+$/g, "").slice(-160);
  return sanitized || "arquivo";
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    passwordLogin: publicProcedure.input(z.object({ password: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      if (input.password !== SYSTEM_PASSWORD) {
        throw new Error("Senha incorreta");
      }
      await upsertUser({
        openId: SYSTEM_OPEN_ID,
        name: "Coleção pessoal",
        loginMethod: "password",
        lastSignedIn: new Date(),
      });
      const sessionToken = await sdk.signSession({ openId: SYSTEM_OPEN_ID, appId: "password", name: "Coleção pessoal" });
      ctx.res.cookie(COOKIE_NAME, sessionToken, getSessionCookieOptions(ctx.req));
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  album: router({
    list: protectedProcedure.query(({ ctx }) => listAlbumItems(ctx.user.id)),
    photos: router({
      create: protectedProcedure.input(z.object({
        title: z.string().trim().min(1).max(180),
        note: z.string().trim().max(5000).optional(),
        fileName: z.string().min(1).max(255),
        mimeType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/),
        dataUrl: dataUrlInput,
        receivedAt: dateInput,
      })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Banco de dados indisponível");
        const stored = await storagePut(`${ctx.user.id}/photos/${safeFileName(input.fileName)}`, decodeDataUrl(input.dataUrl), input.mimeType);
        const result = await db.insert(photos).values({
          userId: ctx.user.id,
          title: input.title,
          note: input.note || null,
          fileName: input.fileName,
          mimeType: input.mimeType,
          storageKey: stored.key,
          fileUrl: stored.url,
          receivedAt: new Date(input.receivedAt),
        });
        return { id: Number(result[0].insertId), ...stored };
      }),
      remove: protectedProcedure.input(itemIdInput).mutation(async ({ ctx, input }) => {
        const photo = await getPhotoById(input.id, ctx.user.id);
        if (!photo) return { success: true } as const;
        await deleteAlbumItem("photo", input.id, ctx.user.id);
        return { success: true } as const;
      }),
    }),
    songs: router({
      create: protectedProcedure.input(z.object({
        title: z.string().trim().min(1).max(180),
        artist: z.string().trim().max(180).optional(),
        note: z.string().trim().max(5000).optional(),
        spotifyUrl: z.string().url().refine(value => value.includes("open.spotify.com"), "Use um link do Spotify"),
      })).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Banco de dados indisponível");
        const result = await db.insert(songs).values({ userId: ctx.user.id, ...input, artist: input.artist || null, note: input.note || null });
        return { id: Number(result[0].insertId) };
      }),
      remove: protectedProcedure.input(itemIdInput).mutation(async ({ ctx, input }) => {
        await deleteAlbumItem("song", input.id, ctx.user.id);
        return { success: true } as const;
      }),
    }),
    messages: router({
      create: protectedProcedure.input(messageInput).mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Banco de dados indisponível");
        let stored: { key: string; url: string } | undefined;
        if (input.kind === "audio" && input.dataUrl && input.fileName && input.mimeType) {
          stored = await storagePut(`${ctx.user.id}/messages/${safeFileName(input.fileName)}`, decodeDataUrl(input.dataUrl), input.mimeType);
        }
        const result = await db.insert(messages).values({
          userId: ctx.user.id,
          kind: input.kind,
          title: input.title,
          content: input.content || null,
          note: input.note || null,
          fileName: input.fileName || null,
          mimeType: input.mimeType || null,
          storageKey: stored?.key || null,
          fileUrl: stored?.url || null,
          receivedAt: new Date(input.receivedAt),
        });
        return { id: Number(result[0].insertId), ...stored };
      }),
      remove: protectedProcedure.input(itemIdInput).mutation(async ({ ctx, input }) => {
        const message = await getMessageById(input.id, ctx.user.id);
        if (!message) return { success: true } as const;
        await deleteAlbumItem("message", input.id, ctx.user.id);
        return { success: true } as const;
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
