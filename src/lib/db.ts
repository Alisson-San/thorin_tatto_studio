import fs from "fs/promises";
import path from "path";
import os from "os";

const LOCAL_DB_PATH = path.join(process.cwd(), "data", "db.json");
const TMP_DB_PATH = path.join(os.tmpdir(), "thorin-studio-db.json");

declare global {
  // eslint-disable-next-line no-var
  var __thorinDbCache: any | undefined;
}

export async function readDb(): Promise<any> {
  // 1. Em ambiente serverless (Vercel), tenta ler do /tmp se já houver atualização em runtime
  try {
    const tmpRaw = await fs.readFile(TMP_DB_PATH, "utf-8");
    const parsed = JSON.parse(tmpRaw);
    globalThis.__thorinDbCache = parsed;
    return parsed;
  } catch {
    // Segue para memória ou arquivo original do repositório
  }

  if (globalThis.__thorinDbCache) {
    return globalThis.__thorinDbCache;
  }

  const raw = await fs.readFile(LOCAL_DB_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  globalThis.__thorinDbCache = parsed;
  return parsed;
}

export async function writeDb(db: any): Promise<void> {
  globalThis.__thorinDbCache = db;
  const serialized = JSON.stringify(db, null, 2);

  // Tenta gravar no data/db.json local; se for read-only (Vercel Serverless), grava em /tmp
  try {
    await fs.writeFile(LOCAL_DB_PATH, serialized, "utf-8");
  } catch {
    // Em produção Serverless (Vercel), o diretório do pacote é somente leitura
  }

  try {
    await fs.writeFile(TMP_DB_PATH, serialized, "utf-8");
  } catch {
    // Mantém em globalThis.__thorinDbCache caso /tmp também não esteja disponível
  }
}
