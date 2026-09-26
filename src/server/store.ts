import { mkdir, readFile, writeFile, rename, readdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const root = () => path.resolve(process.env.PROOFWRITE_DATA_DIR || ".data");
const file = (kind: "assignments" | "submissions", id: string) => {
  if (!/^[a-f0-9-]{36}$/.test(id))
    throw new HttpError(400, "잘못된 식별자입니다.");
  return path.join(root(), kind, `${id}.json`);
};
export async function read<T>(
  kind: "assignments" | "submissions",
  id: string,
): Promise<T> {
  try {
    return JSON.parse(await readFile(file(kind, id), "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT")
      throw new HttpError(404, "항목을 찾을 수 없습니다.");
    throw e;
  }
}
export async function write(
  kind: "assignments" | "submissions",
  id: string,
  value: unknown,
) {
  const dest = file(kind, id);
  await mkdir(path.dirname(dest), { recursive: true, mode: 0o700 });
  const temp = `${dest}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value), { mode: 0o600 });
  await rename(temp, dest);
}
export async function list<T>(
  kind: "assignments" | "submissions",
): Promise<T[]> {
  try {
    const names = await readdir(path.join(root(), kind));
    return await Promise.all(
      names
        .filter((n) => n.endsWith(".json"))
        .map((n) => read<T>(kind, n.slice(0, -5))),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}
const globalStore = globalThis as typeof globalThis & {
  proofWriteLock?: Promise<unknown>;
};
export async function locked<T>(fn: () => Promise<T>): Promise<T> {
  const previous = globalStore.proofWriteLock || Promise.resolve();
  let release!: () => void;
  globalStore.proofWriteLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}
