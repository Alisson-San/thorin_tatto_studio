import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await readDb();
  const { adminPassword, ...publicData } = data;
  return NextResponse.json(publicData);
}

export async function POST(req: Request) {
  const body = await req.json();
  const db = await readDb();

  if (body.password !== db.adminPassword) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  if (body.studio) db.studio = body.studio;
  if (body.portfolio) db.portfolio = body.portfolio;
  if (body.categories) db.categories = body.categories;
  if (body.pricingRules) db.pricingRules = body.pricingRules;
  if (body.availabilitySlots) db.availabilitySlots = body.availabilitySlots;
  if (body.bookings) db.bookings = body.bookings;

  await writeDb(db);
  return NextResponse.json({ ok: true, db });
}
