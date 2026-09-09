import { describe, expect, it } from "vitest";
import { decodeDataUrl, safeFileName } from "./routers";

describe("album upload helpers", () => {
  it("sanitizes filenames before using them as storage keys", () => {
    expect(safeFileName("áudio do WhatsApp (09/09).opus")).toBe("udio-do-WhatsApp--09-09-.opus");
    expect(safeFileName("   ")).toBe("arquivo");
  });

  it("decodes a data URL into bytes", () => {
    const result = decodeDataUrl("data:text/plain;base64,SGVsbG8=");
    expect(result.toString("utf8")).toBe("Hello");
  });

  it("rejects malformed data URLs", () => {
    expect(() => decodeDataUrl("not-a-data-url")).toThrow("Arquivo inválido");
  });
});
