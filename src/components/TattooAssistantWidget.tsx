"use client";

import React, { useState, useRef, useEffect } from "react";

// Formata **negrito** e *itálico* retornados pela IA sem expor asteriscos crus
function formatMessageText(text: string) {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*|\*[^*\n]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-bold text-ember-gold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={i} className="italic text-zinc-100">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

const QUICK_SUGGESTIONS = [
  "🐉 Blackwork no antebraço, 15cm",
  "✨ Fine Line delicada no pulso, 7cm",
  "🔥 Fechamento sombreado no braço, 22cm",
];

export default function TattooAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([
    {
      role: "assistant",
      content:
        "Fala! Sou o Assistente IA do **Thórin Tattoo Studio** 🐉. Envie uma foto da sua ideia no botão 📷 ou me diga o **estilo, local do corpo e tamanho em cm** para calcularmos o tempo de sessão e ver os horários livres do Daniel!",
    },
  ]);
  const [input, setInput] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [savedReferenceImage, setSavedReferenceImage] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estado de Pré-Agendamento quando a estimativa fica pronta
  const [currentEstimate, setCurrentEstimate] = useState<any>(null);
  const [currentParams, setCurrentParams] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [clientName, setClientName] = useState("");
  const [clientWhatsapp, setClientWhatsapp] = useState("");
  const [bookingResult, setBookingResult] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Rola suavemente para a última mensagem ou card gerado
  useEffect(() => {
    if (!open || !messagesContainerRef.current) return;
    const el = messagesContainerRef.current;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [messages, currentEstimate, bookingResult, loading, open]);

  // Compressão assíncrona fora da thread principal (URL.createObjectURL + decode) para não travar o site
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setProcessingImage(true);
    const objectUrl = URL.createObjectURL(file);

    try {
      const img = new Image();
      img.src = objectUrl;
      if (img.decode) {
        await img.decode();
      } else {
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
      }

      // Executa o redimensionamento no próximo frame livre da UI
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          const canvas = document.createElement("canvas");
          const maxDim = 560;
          let w = img.width;
          let h = img.height;
          if (w > h && w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, w, h);
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.72);
          setImagePreview(compressedBase64);
          setSavedReferenceImage(compressedBase64);
          resolve();
        });
      });
    } catch {
      alert("Não foi possível carregar essa imagem. Tente outra foto.");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setProcessingImage(false);
    }
  };

  const sendMessage = async (customText?: string) => {
    const textToSend = (customText ?? input).trim();
    if ((!textToSend && !imagePreview) || loading || processingImage) return;
    const imageToSend = imagePreview;
    const userMsg = {
      role: "user",
      content: textToSend || "Enviei uma foto de referência da tatuagem.",
      image: imageToSend,
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (!customText) setInput("");
    setImagePreview(null);
    setLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "client",
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          imageBase64: imageToSend,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
      if (data.estimate && data.extractedParams) {
        setCurrentEstimate(data.estimate);
        setCurrentParams(data.extractedParams);
        if (data.estimate.matchingSlots?.[0]) {
          setSelectedSlot(data.estimate.matchingSlots[0]);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Tive uma oscilação rápida. Pode repetir?" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const confirmPreBooking = async () => {
    if (!clientName.trim() || !clientWhatsapp.trim() || !selectedSlot) {
      alert("Preencha seu Nome, WhatsApp e escolha um horário sugerido!");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_booking",
          imageBase64: savedReferenceImage || imagePreview,
          clientLead: {
            name: clientName,
            whatsapp: clientWhatsapp,
            style: currentParams?.estilo || "Tattoo Personalizada",
            sizeCm: currentParams?.tamanhoCm || 10,
            bodyPart: currentParams?.localCorpo || "A definir",
            complexity: currentParams?.complexidade || "media",
            cobertura: currentParams?.cobertura || false,
            estimatedHours: currentEstimate?.estimatedHours || 2,
            priceRange: currentEstimate?.priceRange || "Sob avaliação",
            slotId: selectedSlot.id,
            slotLabel: selectedSlot.label,
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setBookingResult(data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* BOTÃO FLUTUANTE NO CANTO INFERIOR DIREITO (Oculta no mobile quando o chat está aberto p/ ganhar área útil) */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 ${
          open ? "hidden sm:flex" : "flex"
        } items-center gap-2.5 sm:gap-3 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full bg-gradient-to-r from-wine via-ember to-ember-bright text-white font-bold text-xs sm:text-sm shadow-2xl shadow-ember/40 border border-ember-gold/40 active:scale-95 sm:hover:scale-105 transition-transform`}
      >
        <span className="w-2.5 h-2.5 rounded-full bg-amber-300 animate-ping shrink-0" />
        <span>{open ? "✕ Fechar Assistente" : "⚜️ Orçamento & Agenda IA"}</span>
      </button>

      {/* BACKDROP LEVE APENAS NO MOBILE PARA DESTACAR O CHAT E FECHAR AO TOCAR FORA */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="sm:hidden fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px]"
        />
      )}

      {/* JANELA DO ASSISTENTE MULTIMODAL (Bottom-Sheet ergonômico no Mobile + Popover no Desktop) */}
      {open && (
        <div
          data-lenis-prevent="true"
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          className="fixed inset-x-2.5 bottom-2.5 sm:inset-x-auto sm:bottom-20 sm:right-6 z-50 w-auto sm:w-[420px] max-h-[85dvh] sm:max-h-[78vh] bg-surface border-2 border-ember/60 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden"
        >
          {/* Topo */}
          <div className="px-4 py-3.5 sm:p-4 bg-gradient-to-r from-obsidian via-wine-dark to-obsidian border-b border-wine/50 flex items-center justify-between shrink-0">
            <div>
              <p className="font-gothic text-xl sm:text-2xl text-forge-gradient leading-none">
                Thórin Tattoo IA
              </p>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5">
                Análise de Arte, Pré-Orçamento & Agenda do Daniel
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar Assistente"
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-obsidian border border-wine text-zinc-300 hover:text-white active:scale-95 text-xs font-bold"
            >
              ✕
            </button>
          </div>

          {/* Corpo de Mensagens com Scroll Nativo Isolado (touch-pan-y p/ mobile) */}
          <div
            ref={messagesContainerRef}
            data-lenis-prevent="true"
            className="flex-1 p-3.5 sm:p-4 overflow-y-auto overscroll-contain touch-pan-y space-y-3 text-xs sm:text-sm min-h-[220px]"
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[88%] sm:max-w-[86%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 leading-relaxed ${
                    m.role === "user"
                      ? "bg-ember text-white rounded-br-none"
                      : "bg-obsidian border border-wine/50 text-zinc-200 rounded-bl-none"
                  }`}
                >
                  {m.image && (
                    <img
                      src={m.image}
                      alt="Referência enviada"
                      className="w-36 h-36 sm:w-40 sm:h-40 object-cover rounded-xl mb-2 border border-white/20"
                    />
                  )}
                  <p className="whitespace-pre-line">{formatMessageText(m.content)}</p>
                </div>
              </div>
            ))}

            {/* SUGESTÕES RÁPIDAS DE 1 TOQUE (Exibidas no início da conversa p/ facilitar no celular) */}
            {messages.length === 1 && !loading && (
              <div className="pt-1 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold px-1">
                  Toque rápido para testar:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SUGGESTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => sendMessage(item)}
                      className="text-left px-3 py-2 rounded-xl bg-obsidian/90 border border-wine/60 hover:border-ember active:bg-ember/20 text-[11px] text-zinc-200 transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CARD DE ESTIMATIVA E SELEÇÃO DE HORÁRIO NA AGENDA */}
            {currentEstimate && !bookingResult && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-obsidian/95 border border-ember/60 space-y-3 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-1 border-b border-wine/40 pb-2">
                  <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-ember-gold font-bold">
                    ⚡ Prévia Calculada pela IA
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-white">
                    {currentParams?.estilo} ({currentParams?.tamanhoCm}cm)
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-surface border border-wine/40">
                    <p className="text-[10px] text-zinc-400 uppercase">Tempo Estimado</p>
                    <p className="font-display text-xs sm:text-sm font-bold text-ember-gold mt-0.5">
                      {currentEstimate.durationLabel}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-surface border border-wine/40">
                    <p className="text-[10px] text-zinc-400 uppercase">Faixa Estimada</p>
                    <p className="font-display text-xs sm:text-sm font-bold text-white mt-0.5">
                      {currentEstimate.priceRange}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] text-zinc-300 font-semibold">
                    📅 Escolha um horário livre na agenda do Daniel:
                  </p>
                  <div className="space-y-1.5">
                    {currentEstimate.matchingSlots?.map((slot: any) => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium border transition-all flex items-center justify-between gap-2 ${
                          selectedSlot?.id === slot.id
                            ? "bg-ember/20 border-ember text-white font-bold"
                            : "bg-surface border-wine/40 text-zinc-300"
                        }`}
                      >
                        <span className="truncate">{slot.label}</span>
                        <span className="text-[10px] text-ember-gold shrink-0">
                          Até {slot.maxHours}h
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* text-base no mobile evita o auto-zoom do Safari/iOS ao focar nos campos */}
                <div className="space-y-2 pt-2 border-t border-wine/40">
                  <input
                    type="text"
                    placeholder="Seu Nome"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface border border-wine text-base sm:text-xs text-white focus:outline-none focus:border-ember"
                  />
                  <input
                    type="tel"
                    placeholder="Seu WhatsApp (com DDD)"
                    value={clientWhatsapp}
                    onChange={(e) => setClientWhatsapp(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-surface border border-wine text-base sm:text-xs text-white focus:outline-none focus:border-ember"
                  />
                  <button
                    type="button"
                    onClick={confirmPreBooking}
                    disabled={loading}
                    className="w-full py-3 sm:py-2.5 rounded-xl bg-gradient-to-r from-ember to-ember-bright text-white font-bold text-xs uppercase tracking-wider shadow-lg active:scale-[0.99]"
                  >
                    {loading ? "Registrando..." : "Solicitar Reserva deste Horário"}
                  </button>
                </div>
              </div>
            )}

            {/* CONFIRMAÇÃO DO PRÉ-AGENDAMENTO */}
            {bookingResult && (
              <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 space-y-3 text-center">
                <p className="text-xs font-bold text-emerald-300 uppercase">
                  ✅ Pré-Agendamento #{bookingResult.booking.id} Registrado!
                </p>
                <p className="text-xs text-zinc-300">
                  O Daniel já recebeu sua ficha e foto de referência no Painel do Estúdio. Clique abaixo para enviar o protocolo no WhatsApp:
                </p>
                <a
                  href={bookingResult.whatsappUrl}
                  target="_blank"
                  rel="noopener"
                  className="block w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase"
                >
                  Enviar Protocolo no WhatsApp do Daniel →
                </a>
              </div>
            )}

            {loading && (
              <p className="text-[11px] text-ember-gold animate-pulse">
                🐉 Analisando traço e consultando agenda...
              </p>
            )}
          </div>

          {/* Preview de Imagem Anexada */}
          {(imagePreview || processingImage) && !bookingResult && (
            <div className="px-4 py-2 bg-obsidian border-t border-wine/40 flex items-center justify-between shrink-0">
              {processingImage ? (
                <span className="text-[11px] text-amber-300 animate-pulse">
                  Otimizando imagem de referência...
                </span>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <img src={imagePreview!} alt="Ref" className="w-9 h-9 rounded object-cover" />
                    <span className="text-[11px] text-emerald-400">Foto de referência anexada</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Remover
                  </button>
                </>
              )}
            </div>
          )}

          {/* Barra de Digitação + Upload de Referência (text-base no mobile impede auto-zoom do iOS) */}
          <div className="p-2.5 sm:p-3 bg-obsidian border-t border-wine/40 flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processingImage || loading}
              title="Anexar foto de referência da tattoo"
              className="w-10 h-10 sm:w-auto sm:h-auto sm:p-2.5 flex items-center justify-center rounded-xl bg-surface border border-wine/60 hover:border-ember text-ember-gold text-base sm:text-sm shrink-0 disabled:opacity-50"
            >
              📷
            </button>
            <input
              type="text"
              placeholder="Ex: Blackwork no antebraço, 15cm..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-surface border border-wine/50 text-base sm:text-xs text-white focus:outline-none focus:border-ember"
            />
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={loading || processingImage}
              className="px-4 py-2.5 h-10 sm:h-auto rounded-xl bg-ember hover:bg-ember-bright text-white font-bold text-xs shrink-0 disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
