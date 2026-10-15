import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function isValidApiKey(key: string | undefined, prefix: string) {
  if (!key) return false;
  const trimmed = key.trim();
  if (!trimmed || trimmed.includes("...") || trimmed.length < 20) return false;
  return trimmed.startsWith(prefix);
}

function calculateTattooEstimate(
  params: {
    estilo: string;
    tamanhoCm: number;
    localCorpo: string;
    complexidade: "baixa" | "media" | "alta";
    cobertura?: boolean;
  },
  db: any
) {
  const rules = db.pricingRules || {
    valorMinimo: 180,
    valorHoraBase: 220,
    multiplicadorComplexidade: { baixa: 1, media: 1.25, alta: 1.55 },
    adicionalCoberturaPct: 25,
  };

  const cm = Math.max(2, Number(params.tamanhoCm) || 8);
  const styleLower = (params.estilo || "blackwork").toLowerCase();
  let baseHours = 1;

  if (styleLower.includes("fine") || styleLower.includes("escrita") || styleLower.includes("delicad")) {
    baseHours = cm <= 8 ? 1 : cm <= 16 ? 1.5 : 2.5;
  } else {
    baseHours = cm <= 7 ? 1.5 : Math.min(5.5, Math.round((cm / 4.8) * 2) / 2);
  }

  const mult = rules.multiplicadorComplexidade?.[params.complexidade] || 1.2;
  let estimatedHours = Math.max(1, Math.round(baseHours * mult * 2) / 2);
  if (params.cobertura) estimatedHours += 1;

  let rawPrice = estimatedHours * rules.valorHoraBase;
  if (params.cobertura) {
    rawPrice = rawPrice * (1 + (rules.adicionalCoberturaPct || 25) / 100);
  }

  const minPrice = Math.max(rules.valorMinimo, Math.round((rawPrice * 0.9) / 10) * 10);
  const maxPrice = Math.max(minPrice + 60, Math.round((rawPrice * 1.15) / 10) * 10);

  const matchingSlots = (db.availabilitySlots || []).filter(
    (s: any) => s.available && Number(s.maxHours) >= estimatedHours
  );

  return {
    estimatedHours,
    durationLabel: `${estimatedHours}h a ${estimatedHours + 0.5}h`,
    priceRange: `R$ ${minPrice} a R$ ${maxPrice}`,
    matchingSlots: matchingSlots.slice(0, 4),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode = "client", action, messages = [], imageBase64, clientLead, adminPassword } = body;

    const db = await readDb();

    // 1. AÇÃO DIRETA: CRIAR PRÉ-AGENDAMENTO PELO CLIENTE
    if (action === "create_booking" && clientLead) {
      const bookingId = `TH-${Date.now().toString().slice(-4)}`;
      const newBooking = {
        id: bookingId,
        createdAt: new Date().toISOString(),
        status: "pendente",
        clientName: clientLead.name,
        clientWhatsapp: clientLead.whatsapp,
        style: clientLead.style,
        sizeCm: clientLead.sizeCm,
        bodyPart: clientLead.bodyPart,
        complexity: clientLead.complexity,
        cobertura: Boolean(clientLead.cobertura),
        estimatedHours: clientLead.estimatedHours,
        priceRange: clientLead.priceRange,
        selectedSlotId: clientLead.slotId,
        selectedSlotLabel: clientLead.slotLabel,
        referenceImage: imageBase64 || null,
      };

      db.bookings = [newBooking, ...(db.bookings || [])];
      await writeDb(db);

      const waText =
        `Olá Daniel! Fiz minha triagem com o Assistente IA no site do Thórin Tattoo.\n\n` +
        `⚜️ *Protocolo:* #${bookingId}\n` +
        `👤 *Nome:* ${newBooking.clientName}\n` +
        `🎨 *Ideia/Estilo:* ${newBooking.style} (${newBooking.sizeCm}cm • ${newBooking.bodyPart})\n` +
        `⏱️ *Sessão Estimada:* ${newBooking.estimatedHours}h\n` +
        `💰 *Faixa Estimada:* ${newBooking.priceRange}\n` +
        `📅 *Horário Pré-Selecionado:* ${newBooking.selectedSlotLabel}\n\n` +
        `Gostaria de confirmar minha reserva!`;

      return NextResponse.json({
        ok: true,
        booking: newBooking,
        whatsappUrl: `https://wa.me/${db.studio.whatsapp}?text=${encodeURIComponent(waText)}`,
      });
    }

    // 2. MODO COPILOTO ADMIN (PARA O DANIEL GERENCIAR POR TEXTO)
    if (mode === "admin") {
      if (adminPassword !== db.adminPassword) {
        return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
      }
      const lastText = (messages[messages.length - 1]?.content || "").trim();
      const lower = lastText.toLowerCase();

      if (lower.startsWith("abrir") || lower.startsWith("liberar") || lower.startsWith("adicionar")) {
        const cleanLabel = lastText.replace(/^(abrir|liberar|adicionar)\s*(horário|horario)?\s*/i, "").trim();
        const hoursMatch = cleanLabel.match(/(\d+)\s*h/i);
        const newSlot = {
          id: `slot-${Date.now()}`,
          label: cleanLabel || "Horário Extra • 14:00 às 18:00",
          maxHours: hoursMatch ? Number(hoursMatch[1]) : 4,
          available: true,
        };
        db.availabilitySlots = [...(db.availabilitySlots || []), newSlot];
        await writeDb(db);
        return NextResponse.json({
          reply: `✅ Horário adicionado na agenda: "${newSlot.label}" (suporta sessões de até ${newSlot.maxHours}h).`,
          updatedDb: db,
        });
      }

      if (lower.includes("aviso") || lower.includes("status")) {
        const cleanStatus = lastText.replace(/.*?(para|:)\s*/i, "").replace(/["']/g, "").trim();
        if (cleanStatus) {
          db.studio.statusAgenda = cleanStatus;
          await writeDb(db);
          return NextResponse.json({
            reply: `✅ Aviso do topo do site atualizado para: "${cleanStatus}"`,
            updatedDb: db,
          });
        }
      }

      const pendingCount = (db.bookings || []).filter((b: any) => b.status === "pendente").length;
      const openSlotsCount = (db.availabilitySlots || []).filter((s: any) => s.available).length;

      return NextResponse.json({
        reply:
          `🐉 Copiloto Thórin Ativo!\n` +
          `• Solicitações pendentes: ${pendingCount}\n` +
          `• Horários disponíveis na agenda: ${openSlotsCount}\n\n` +
          `Exemplos de comandos rápidos:\n` +
          `- "Abrir Quarta-feira • 14:00 às 18:00 (4h)"\n` +
          `- "Mudar aviso para: Agenda de Novembro Aberta"`,
      });
    }

    // 3. MODO CLIENTE: ASSISTENTE MULTIMODAL (OPENAI -> GEMINI -> FALLBACK LOCAL)
    const systemPrompt = `
Você é o Assistente Virtual do estúdio "${db.studio.name}", do tatuador ${db.studio.artist} em Barão/RS.
Seu papel é analisar a ideia de tatuagem do cliente (incluindo a foto de referência, se enviada) e coletar 3 dados rápidos:
1. Estilo (Fine Line, Blackwork, Realismo, Escrita/Caligrafia ou Sombreado)
2. Tamanho aproximado em centímetros (cm)
3. Local do corpo (ex: antebraço, braço, perna, costas, mão, costela).

Se o cliente já informou ou se você já tem Estilo, Tamanho (cm) e Local do corpo no histórico, finalize sua resposta amigável e inclua OBRIGATORIAMENTE no final este bloco JSON exato:
\`\`\`json
{"readyToEstimate": true, "estilo": "Blackwork", "tamanhoCm": 15, "localCorpo": "Antebraço", "complexidade": "media", "cobertura": false}
\`\`\`
Seja conciso, acolhedor e nunca invente preços por conta própria fora do JSON.
`;

    let aiReply = "";
    let extractedParams: any = null;

    const openAiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // Tenta OpenAI apenas se a chave for real (não placeholder "sk-...")
    if (isValidApiKey(openAiKey, "sk-")) {
      try {
        const apiMessages: any[] = [{ role: "system", content: systemPrompt }];
        for (let i = 0; i < messages.length; i++) {
          const m = messages[i];
          if (i === messages.length - 1 && imageBase64 && m.role === "user") {
            apiMessages.push({
              role: "user",
              content: [
                { type: "text", text: m.content || "Analise esta referência de tatuagem." },
                { type: "image_url", image_url: { url: imageBase64, detail: "low" } },
              ],
            });
          } else {
            apiMessages.push({ role: m.role, content: m.content });
          }
        }

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: apiMessages,
            temperature: 0.35,
            max_tokens: 320,
          }),
          signal: AbortSignal.timeout(4500),
        });
        if (res.ok) {
          const json = await res.json();
          aiReply = json.choices?.[0]?.message?.content || "";
        }
      } catch {
        // Continua imediatamente para Gemini ou Fallback local
      }
    }

    // Se OpenAI não respondeu e há chave Gemini válida, usa Gemini com thinkingBudget: 0 (ultra-rápido)
    if (!aiReply && isValidApiKey(geminiKey, "AIza")) {
      try {
        const recentMessages = messages.slice(-6);
        const historyText = recentMessages.map((m: any) => `${m.role}: ${m.content}`).join("\n");
        const parts: any[] = [{ text: `${systemPrompt}\n\nConversa:\n${historyText}` }];

        if (imageBase64 && imageBase64.includes("base64,")) {
          const [meta, b64] = imageBase64.split("base64,");
          const mimeType = meta.match(/data:(.*?);/)?.[1] || "image/jpeg";
          parts.push({ inline_data: { mime_type: mimeType, data: b64 } });
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature: 0.35,
                maxOutputTokens: 320,
                thinkingConfig: { thinkingBudget: 0 },
              },
            }),
            signal: AbortSignal.timeout(4500),
          }
        );
        if (res.ok) {
          const json = await res.json();
          aiReply = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
        }
      } catch {
        // Continua imediatamente para o motor de fallback local
      }
    }

    // Extrai JSON se retornado pela OpenAI ou Gemini
    const jsonMatch =
      aiReply.match(/```json\s*([\s\S]*?)```/) ||
      aiReply.match(/(\{"readyToEstimate":[\s\S]*?\})/);
    if (jsonMatch?.[1]) {
      try {
        extractedParams = JSON.parse(jsonMatch[1]);
        aiReply = aiReply.replace(jsonMatch[0], "").trim();
      } catch {}
    }

    // MOTOR DE FALLBACK LOCAL INTELIGENTE (Instantâneo sem chave API ou complementa extração)
    if (!aiReply || !extractedParams) {
      const allUserText = messages
        .filter((m: any) => m.role === "user")
        .map((m: any) => m.content)
        .join(" ");

      const cmMatch =
        allUserText.match(/(\d{1,2})\s*(cm|centimetros|centímetros)/i) ||
        allUserText.match(/\b(\d{1,2})\b/);
      const bodyMatch = allUserText.match(
        /(antebraço|braço|perna|panturrilha|costas|peito|mão|ombro|pescoço|pulso|costela|coxa|tornozelo|nuca)/i
      );
      const isFine = /(fine\s*line|fineline|delicad|traço fino|escrita|caligrafia|frase|minimalista|terço)/i.test(
        allUserText
      );
      const isHighComplex = /(realismo|fechamento|dragão|leão|tigre|retrato|sombreado pesado)/i.test(
        allUserText
      );
      const isCover = /(cobertura|cover|cobrir)/i.test(allUserText);

      if (cmMatch && (bodyMatch || isFine || isHighComplex || imageBase64)) {
        extractedParams = {
          readyToEstimate: true,
          estilo: isFine ? "Fine Line / Delicada" : isHighComplex ? "Blackwork / Realismo" : "Blackwork & Sombreado",
          tamanhoCm: Number(cmMatch[1]),
          localCorpo: bodyMatch ? bodyMatch[1] : "Braço / Antebraço",
          complexidade: isHighComplex ? "alta" : isFine ? "baixa" : "media",
          cobertura: isCover,
        };
        if (!aiReply) {
          aiReply = `Perfeito! Analisei os detalhes do seu projeto: **${extractedParams.estilo}** com aproximadamente **${extractedParams.tamanhoCm}cm** na região do **${extractedParams.localCorpo}**${imageBase64 ? " (considerando os detalhes da sua foto de referência)" : ""}.\n\nCalculei abaixo o tempo estimado de sessão com o Daniel e separei os horários livres da agenda que comportam sua tattoo:`;
        }
      } else if (!aiReply) {
        if (imageBase64) {
          aiReply = `Irada essa referência que você anexou! 🐉 Já analisei o estilo do traço e sombreamento dela.\n\nPara eu calcular o tempo exato de sessão e liberar os horários livres na agenda do Daniel, me diz:\n1. **Qual o tamanho aproximado em centímetros (ex: 12cm)?**\n2. **Em qual parte do corpo você quer tatuar?**`;
        } else {
          aiReply = `Para eu calcular sua prévia de tempo, investimento e mostrar os horários disponíveis na agenda do Daniel, me conta rapidinho:\n• **Qual o estilo ou ideia da tattoo?** (Pode anexar foto no botão 📷)\n• **Qual o local do corpo e o tamanho aproximado em cm?** (ex: *Leão Blackwork no antebraço, 15cm*)`;
        }
      }
    }

    let estimate = null;
    if (extractedParams?.readyToEstimate) {
      estimate = calculateTattooEstimate(extractedParams, db);
    }

    return NextResponse.json({
      reply: aiReply,
      extractedParams,
      estimate,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro no processamento" }, { status: 500 });
  }
}
