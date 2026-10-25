import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function normalizePhone(rawPhone: string): string {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      password,
      recipientName,
      recipientPhone,
      message,
      type = "aviso",
      bookingId = null,
    } = body;

    const db = await readDb();
    if (password !== db.adminPassword) {
      return NextResponse.json({ error: "Senha de administrador inválida" }, { status: 401 });
    }

    const phone = normalizePhone(recipientPhone);
    if (!phone || !message) {
      return NextResponse.json(
        { error: "Telefone do destinatário e mensagem são obrigatórios" },
        { status: 400 }
      );
    }

    const waConfig = db.whatsappConfig || {};
    const provider = waConfig.provider || process.env.WHATSAPP_PROVIDER || "direct";
    const apiUrl = (waConfig.apiUrl || process.env.WHATSAPP_API_URL || "").trim();
    const apiKey = (waConfig.apiKey || process.env.WHATSAPP_API_KEY || "").trim();
    const instanceName = (waConfig.instanceName || process.env.WHATSAPP_INSTANCE || "").trim();

    let apiSent = false;
    let apiResponseInfo = "Modo Direto (WhatsApp Web / App)";

    // Se houver integração de API ativa (Evolution API, Z-API, Meta Cloud ou Webhook)
    if (provider !== "direct" && apiUrl) {
      try {
        if (provider === "evolution") {
          const endpoint = `${apiUrl.replace(/\/$/, "")}/message/sendText/${instanceName}`;
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: apiKey,
            },
            body: JSON.stringify({
              number: phone,
              text: message,
            }),
            signal: AbortSignal.timeout(6000),
          });
          if (res.ok) {
            apiSent = true;
            apiResponseInfo = "Enviado automaticamente via Evolution API";
          } else {
            apiResponseInfo = `Evolution API HTTP ${res.status} (Fallback p/ WhatsApp Web)`;
          }
        } else if (provider === "zapi") {
          const endpoint = `${apiUrl.replace(/\/$/, "")}/send-text`;
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(apiKey ? { "Client-Token": apiKey } : {}),
            },
            body: JSON.stringify({
              phone,
              message,
            }),
            signal: AbortSignal.timeout(6000),
          });
          if (res.ok) {
            apiSent = true;
            apiResponseInfo = "Enviado automaticamente via Z-API";
          } else {
            apiResponseInfo = `Z-API HTTP ${res.status} (Fallback p/ WhatsApp Web)`;
          }
        } else if (provider === "meta") {
          // Meta Cloud API: apiUrl = https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages
          const endpoint = apiUrl.includes("/messages")
            ? apiUrl
            : `https://graph.facebook.com/v20.0/${instanceName}/messages`;
          const res = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: phone,
              type: "text",
              text: { body: message },
            }),
            signal: AbortSignal.timeout(6000),
          });
          if (res.ok) {
            apiSent = true;
            apiResponseInfo = "Enviado automaticamente via Meta WhatsApp Cloud API";
          } else {
            apiResponseInfo = `Meta Cloud API HTTP ${res.status} (Fallback p/ WhatsApp Web)`;
          }
        } else if (provider === "webhook") {
          const res = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            },
            body: JSON.stringify({
              phone,
              recipientName,
              message,
              type,
              bookingId,
              studio: db.studio?.name,
            }),
            signal: AbortSignal.timeout(6000),
          });
          if (res.ok) {
            apiSent = true;
            apiResponseInfo = "Enviado automaticamente via Webhook";
          } else {
            apiResponseInfo = `Webhook HTTP ${res.status} (Fallback p/ WhatsApp Web)`;
          }
        }
      } catch (err: any) {
        apiResponseInfo = `Falha na API (${err?.message || "timeout"}) — usando link direto`;
      }
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    const logEntry = {
      id: `WA-${Date.now()}`,
      sentAt: new Date().toISOString(),
      recipientName: recipientName || "Cliente",
      recipientPhone: phone,
      type,
      bookingId,
      message,
      deliveryMethod: apiSent ? provider : "wa.me",
      statusInfo: apiResponseInfo,
    };

    db.whatsappLogs = [logEntry, ...(db.whatsappLogs || []).slice(0, 99)];
    await writeDb(db);

    return NextResponse.json({
      ok: true,
      apiSent,
      statusInfo: apiResponseInfo,
      whatsappUrl,
      logEntry,
      whatsappLogs: db.whatsappLogs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erro ao processar envio WhatsApp" },
      { status: 500 }
    );
  }
}
