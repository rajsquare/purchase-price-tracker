import { hash as bcryptHash, compare } from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => ({
  doc: vi.fn((...segments: unknown[]) => ({ path: segments.map(String).join("/") })),
  getDoc: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIMESTAMP"),
  setDoc: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestoreMocks);
vi.mock("@/firebase/client", () => ({ db: { name: "test-db" } }));

import {
  attemptUnlock,
  changeSharedPassword,
  IncorrectPasswordError,
  MissingPasswordConfigurationError,
} from "./authService";

function authSnap(data: { passwordHash: string } | null) {
  return {
    exists: () => data !== null,
    data: () => data ?? {},
  };
}

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies the shared password against settings/auth passwordHash", async () => {
    firestoreMocks.getDoc.mockResolvedValue(authSnap({ passwordHash: await bcryptHash("open", 4) }));

    await expect(attemptUnlock("open")).resolves.toBeUndefined();
    expect(firestoreMocks.doc).toHaveBeenCalledWith({ name: "test-db" }, "settings", "auth");
  });

  it("rejects incorrect shared passwords", async () => {
    firestoreMocks.getDoc.mockResolvedValue(authSnap({ passwordHash: await bcryptHash("open", 4) }));

    await expect(attemptUnlock("closed")).rejects.toBeInstanceOf(IncorrectPasswordError);
  });

  it("fails clearly when settings/auth is missing", async () => {
    firestoreMocks.getDoc.mockResolvedValue(authSnap(null));

    await expect(attemptUnlock("open")).rejects.toBeInstanceOf(
      MissingPasswordConfigurationError
    );
  });

  it("changes the shared password by storing only a new bcrypt hash", async () => {
    firestoreMocks.getDoc.mockResolvedValue(authSnap({ passwordHash: await bcryptHash("old", 4) }));

    await changeSharedPassword("old", "new-secret");

    const saved = firestoreMocks.setDoc.mock.calls[0]?.[1] as
      | { passwordHash: string; updatedAt: string }
      | undefined;

    expect(saved).toBeDefined();
    expect(saved?.passwordHash).not.toBe("new-secret");
    await expect(compare("new-secret", saved?.passwordHash ?? "")).resolves.toBe(true);
    expect(saved?.updatedAt).toBe("SERVER_TIMESTAMP");
  });
});
