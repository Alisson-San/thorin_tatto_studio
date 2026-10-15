"use client";

import React, { useEffect, useState } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);
  const [studio, setStudio] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [pricingRules, setPricingRules] = useState<any>(null);
  const [msg, setMsg] = useState("");

  // Upload de Portfólio
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("fineline");
  const [newFeatured, setNewFeatured] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Novo Horário na Agenda
  const [newSlotLabel, setNewSlotLabel] = useState("");
  const [newSlotHours, setNewSlotHours] = useState(4);

  // Copiloto IA do Daniel
  const [adminPrompt, setAdminPrompt] = useState("");
  const [copilotReply, setCopilotReply] = useState("");

  useEffect(() => {
    fetch("/api/studio")
      .then((r) => r.json())
      .then((d) => {
        setStudio(d.studio);
        setPortfolio(d.portfolio || []);
        setCategories(d.categories || []);
        setAvailabilitySlots(d.availabilitySlots || []);
        setBookings(d.bookings || []);
        setPricingRules(d.pricingRules || { valorMinimo: 180, valorHoraBase: 220 });
      });
  }, []);

  async function saveAll(
    nextStudio = studio,
    nextPortfolio = portfolio,
    nextSlots = availabilitySlots,
    nextBookings = bookings,
    nextRules = pricingRules
  ) {
    setMsg("Salvando...");
    const res = await fetch("/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password,
        studio: nextStudio,
        portfolio: nextPortfolio,
        categories,
        availabilitySlots: nextSlots,
        bookings: nextBookings,
        pricingRules: nextRules,
      }),
    });
    if (res.ok) {
      setMsg("✅ Tudo salvo e atualizado ao vivo!");
      setLogged(true);
    } else {
      setMsg("❌ Senha incorreta! (Padrão: thorin2026)");
    }
  }

  async function sendCopilotCommand() {
    if (!adminPrompt.trim()) return;
    setCopilotReply("Processando comando...");
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "admin",
        adminPassword: password,
        messages: [{ role: "user", content: adminPrompt }],
      }),
    });
    const data = await res.json();
    setCopilotReply(data.reply || "Comando executado.");
    if (data.updatedDb) {
      setStudio(data.updatedDb.studio);
      setAvailabilitySlots(data.updatedDb.availabilitySlots || []);
      setBookings(data.updatedDb.bookings || []);
    }
    setAdminPrompt("");
  }

  function updateBookingStatus(booking: any, newStatus: "aprovado" | "recusado") {
    const nextBookings = bookings.map((b) =>
      b.id === booking.id ? { ...b, status: newStatus } : b
    );
    // Se aprovado, bloqueia automaticamente o horário na agenda do Daniel
    let nextSlots = availabilitySlots;
    if (newStatus === "aprovado" && booking.selectedSlotId) {
      nextSlots = availabilitySlots.map((s) =>
        s.id === booking.selectedSlotId ? { ...s, available: false } : s
      );
      setAvailabilitySlots(nextSlots);
    }
    setBookings(nextBookings);
    saveAll(studio, portfolio, nextSlots, nextBookings, pricingRules);
  }

  function addAvailabilitySlot() {
    if (!newSlotLabel.trim()) return;
    const nextSlots = [
      ...availabilitySlots,
      {
        id: `slot-${Date.now()}`,
        label: newSlotLabel.trim(),
        maxHours: Number(newSlotHours) || 4,
        available: true,
      },
    ];
    setAvailabilitySlots(nextSlots);
    setNewSlotLabel("");
    saveAll(studio, portfolio, nextSlots, bookings, pricingRules);
  }

  function toggleSlotAvailability(id: string) {
    const nextSlots = availabilitySlots.map((s) =>
      s.id === id ? { ...s, available: !s.available } : s
    );
    setAvailabilitySlots(nextSlots);
    saveAll(studio, portfolio, nextSlots, bookings, pricingRules);
  }

  function removeSlot(id: string) {
    const nextSlots = availabilitySlots.filter((s) => s.id !== id);
    setAvailabilitySlots(nextSlots);
    saveAll(studio, portfolio, nextSlots, bookings, pricingRules);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !newTitle) {
      alert("Preencha o título da tatuagem antes de selecionar a foto!");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const { url } = await res.json();

    const newItem = {
      id: String(Date.now()),
      title: newTitle,
      category: newCategory,
      featured: newFeatured,
      imageUrl: url,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const nextPortfolio = [newItem, ...portfolio];
    setPortfolio(nextPortfolio);
    setNewTitle("");
    setNewFeatured(false);
    setUploading(false);
    await saveAll(studio, nextPortfolio, availabilitySlots, bookings, pricingRules);
  }

  if (!studio) return <div className="p-10 text-white">Carregando Painel...</div>;

  if (!logged) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border border-ember/50 rounded-2xl p-8 space-y-5 shadow-2xl">
          <h1 className="font-gothic text-4xl text-forge-gradient text-center">Thórin Admin</h1>
          <p className="text-xs text-zinc-400 text-center">
            Senha padrão: <strong className="text-ember-gold">thorin2026</strong>
          </p>
          <input
            type="password"
            placeholder="Digite a senha do estúdio"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveAll()}
            className="w-full px-4 py-3 rounded-xl bg-obsidian border border-wine text-white"
          />
          <button
            onClick={() => saveAll()}
            className="w-full py-3 rounded-xl bg-ember text-white font-bold hover:brightness-110"
          >
            Entrar no Painel
          </button>
          {msg && <p className="text-center text-xs text-ember-gold">{msg}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* TOPO */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-wine/40 pb-5">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ember-gold">
              Painel de Controle & Agenda IA • Thórin Tattoo
            </h1>
            <p className="text-xs text-emerald-400 mt-1">{msg}</p>
          </div>
          <a
            href="/"
            className="px-4 py-2.5 rounded-xl bg-surface border border-ember text-xs font-bold hover:bg-ember transition-colors"
          >
            ← Ver Site ao Vivo
          </a>
        </div>

        {/* BLOCO 1: COPILOTO IA DO DANIEL */}
        <section className="bg-gradient-to-r from-surface via-wine-dark/30 to-surface border border-ember/50 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-ember-gold">
            🤖 Copiloto IA do Daniel (Administração por Comando)
          </h2>
          <p className="text-xs text-zinc-300">
            Digite comandos rápidos como: <code>Abrir Quarta-feira • 14:00 às 18:00 (4h)</code> ou{" "}
            <code>Mudar aviso para: Agenda de Novembro Aberta</code>
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Digite uma ordem para o assistente..."
              value={adminPrompt}
              onChange={(e) => setAdminPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendCopilotCommand()}
              className="flex-1 px-4 py-3 rounded-xl bg-obsidian border border-wine text-base sm:text-sm"
            />
            <button
              onClick={sendCopilotCommand}
              className="px-6 py-3 rounded-xl bg-ember text-white font-bold text-sm"
            >
              Executar
            </button>
          </div>
          {copilotReply && (
            <div className="p-4 rounded-xl bg-obsidian border border-wine/50 text-xs text-zinc-200 whitespace-pre-line">
              {copilotReply}
            </div>
          )}
        </section>

        {/* BLOCO 2: SOLICITAÇÕES DE AGENDAMENTO E ORÇAMENTO DA IA */}
        <section className="bg-surface border border-ember/40 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-ember">
            📅 Pré-Agendamentos & Triagens da IA ({bookings.length})
          </h2>

          {bookings.length === 0 ? (
            <p className="text-xs text-zinc-400">
              Nenhuma solicitação registrada ainda. Teste fazer um orçamento pelo botão flutuante lá na Home!
            </p>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl bg-obsidian border border-wine/50 flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          b.status === "aprovado"
                            ? "bg-emerald-900/60 text-emerald-300"
                            : b.status === "recusado"
                            ? "bg-red-900/60 text-red-300"
                            : "bg-amber-900/60 text-amber-300"
                        }`}
                      >
                        {b.status} • #{b.id}
                      </span>
                      <h3 className="font-bold text-base mt-2">{b.clientName}</h3>
                      <p className="text-xs text-zinc-400">WhatsApp: {b.clientWhatsapp}</p>
                    </div>
                    {b.referenceImage && (
                      <img
                        src={b.referenceImage}
                        alt="Referência do Cliente"
                        className="w-20 h-20 rounded-xl object-cover border border-ember/50"
                      />
                    )}
                  </div>

                  <div className="text-xs space-y-1 bg-surface p-3 rounded-xl border border-wine/30">
                    <p>
                      <strong className="text-ember-gold">Arte:</strong> {b.style} ({b.sizeCm}cm •{" "}
                      {b.bodyPart})
                    </p>
                    <p>
                      <strong className="text-ember-gold">Sessão Estimada:</strong>{" "}
                      {b.estimatedHours}h ({b.priceRange})
                    </p>
                    <p>
                      <strong className="text-ember-gold">Horário Escolhido:</strong>{" "}
                      {b.selectedSlotLabel}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateBookingStatus(b, "aprovado")}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    >
                      ✅ Aprovar & Reservar Agenda
                    </button>
                    <a
                      href={`https://wa.me/55${b.clientWhatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                        `Fala ${b.clientName}! Aqui é o Daniel do Thórin Tattoo. Recebi seu pré-agendamento #${b.id} (${b.style} ${b.sizeCm}cm) para${b.selectedSlotLabel}. Vamos confirmar!`
                      )}`}
                      target="_blank"
                      rel="noopener"
                      className="py-2.5 px-3 rounded-xl bg-ember text-white font-bold text-xs"
                    >
                      Chamar Cliente ↗
                    </a>
                    <button
                      onClick={() => updateBookingStatus(b, "recusado")}
                      className="py-2.5 px-3 rounded-xl bg-red-950/70 text-red-300 font-bold text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* BLOCO 3: GERENCIAR HORÁRIOS LIVRES DA AGENDA & VALOR HORA */}
        <section className="bg-surface border border-wine/40 rounded-2xl p-6 space-y-6">
          <h2 className="font-display text-lg font-bold">
            🕒 Horários Livres na Agenda & Parâmetros de Cálculo
          </h2>

          {/* Adicionar Novo Slot */}
          <div className="grid sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Ex: Quarta-feira • 14:00 às 18:00"
              value={newSlotLabel}
              onChange={(e) => setNewSlotLabel(e.target.value)}
              className="sm:col-span-2 px-4 py-2.5 rounded-xl bg-obsidian border border-wine text-sm"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={10}
                value={newSlotHours}
                onChange={(e) => setNewSlotHours(Number(e.target.value))}
                className="w-24 px-3 py-2.5 rounded-xl bg-obsidian border border-wine text-sm"
                title="Máximo de horas neste turno"
              />
              <button
                onClick={addAvailabilitySlot}
                className="flex-1 px-4 py-2.5 rounded-xl bg-ember text-white font-bold text-xs uppercase"
              >
                + Adicionar Turno
              </button>
            </div>
          </div>

          {/* Lista de Slots */}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {availabilitySlots.map((slot) => (
              <div
                key={slot.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 ${
                  slot.available
                    ? "bg-obsidian border-emerald-500/40"
                    : "bg-obsidian/40 border-red-900/40 opacity-60"
                }`}
              >
                <div>
                  <p className="text-xs font-bold">{slot.label}</p>
                  <p className="text-[10px] text-zinc-400">Suporta até {slot.maxHours}h</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleSlotAvailability(slot.id)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                      slot.available ? "bg-emerald-700 text-white" : "bg-zinc-800 text-zinc-300"
                    }`}
                  >
                    {slot.available ? "Livre" : "Ocupado"}
                  </button>
                  <button
                    onClick={() => removeSlot(slot.id)}
                    className="px-2 py-1 rounded bg-red-950 text-red-300 text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BLOCO 4: POSTAR NOVA FOTO NO PORTFÓLIO */}
        <section className="bg-surface border border-wine/40 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-ember">
            📸 Publicar Nova Tattoo no Portfólio
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Título (ex: Fechamento Braço Blackwork)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="px-4 py-3 rounded-xl bg-obsidian border border-wine text-sm"
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-4 py-3 rounded-xl bg-obsidian border border-wine text-sm"
            >
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-obsidian border border-wine text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={newFeatured}
                onChange={(e) => setNewFeatured(e.target.checked)}
              />
              <span>🔥 Marcar como Destaque</span>
            </label>
          </div>
          <label className="inline-block cursor-pointer px-6 py-3 rounded-xl bg-gradient-to-r from-ember to-ember-bright text-white font-bold text-sm">
            {uploading ? "Otimizando WebP..." : "Selecionar Foto e Publicar"}
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </section>
      </div>
    </div>
  );
}
