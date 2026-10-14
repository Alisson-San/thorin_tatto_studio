import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import seedData from "../../../../data/db.json";

export const dynamic = "force-dynamic";

const LOCAL_DB_PATH = path.join(process.cwd(), "data", "db.json");
const TMP_DB_PATH = path.join("/tmp", "thorin-studio-db.json");

async function readDb() {
  // 1. Em ambiente Serverless (Vercel), verifica se houve atualização em /tmp
  try {
    const tmpRaw = await fs.readFile(TMP_DB_PATH, "utf-8");
    return JSON.parse(tmpRaw);
  } catch {
    // continua para o arquivo local ou seed embutido no bundle
  }

  // 2. Ambiente local / servidor persistente
  try {
    const localRaw = await fs.readFile(LOCAL_DB_PATH, "utf-8");
    return JSON.parse(localRaw);
  } catch {
    // 3. Fallback garantido p/ bundle Serverless na Vercel
    return structuredClone(seedData);
  }
}

export async function GET() {
  const data = await readDb();
  const { adminPassword, ...publicData } = data;
  return NextResponse.json(publicData);
}

export async function POST(req: Request) {
  const body = await req.json();
  const db = await readDb();

  const expectedPassword = process.env.ADMIN_PASSWORD || db.adminPassword;
  if (body.password !== expectedPassword) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  if (body.studio) db.studio = body.studio;
  if (body.portfolio) db.portfolio = body.portfolio;
  if (body.categories) db.categories = body.categories;

  const payload = JSON.stringify(db, null, 2);

  try {
    await fs.writeFile(LOCAL_DB_PATH, payload, "utf-8");
  } catch {
    // Em ambiente Serverless read-only (Vercel), persiste na instância atual via /tmp
    await fs.writeFile(TMP_DB_PATH, payload, "utf-8");
  }

  return NextResponse.json({ ok: true });
}
