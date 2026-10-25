"use client";

import React, { useEffect, useMemo, useState } from "react";

type AdminTab = "calendar" | "whatsapp" | "slots" | "portfolio";
type CalendarViewMode = "month" | "week" | "day" | "schedule";

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const HOURS_GRID = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
];

const DEFAULT_TEMPLATES = {
  confirmacao:
    "Fala *{nome}*! Tudo certo? 🐉\nAqui é o Daniel do *Thórin Tattoo Studio*.\n\nSua sessão foi *CONFIRMADA* na nossa agenda:\n📌 *Protocolo:* #{protocolo}\n📅 *Data:* {data}\n⏰ *Horário:* {horario}\n🎨 *Projeto:* {arte} ({tamanho}cm • {local})\n💰 *Valor Estimado:* {valor}\n📍 *Local:* {endereco}\n\nQualquer dúvida antes da sessão é só chamar por aqui!",
  lembrete:
    "Olá *{nome}*! Passando para lembrar da nossa sessão de tatuagem no *Thórin Tattoo Studio* 🐉\n\n📅 *Data:* {data} às *{horario}*\n🎨 *Projeto:* {arte}\n📍 *Endereço:* {endereco}\n\n💡 *Dicas pré-sessão:*\n• Hidrate bem a pele e beba bastante água\n• Alimente-se bem antes de vir\n• Evite bebidas alcoólicas nas 24h anteriores\n\nNos vemos no estúdio!",
  reagendamento:
    "Olá *{nome}*, aqui é o Daniel do *Thórin Tattoo Studio*.\n\nAtualizamos o horário da sua sessão (#{protocolo}):\n📅 *Nova Data:* {data}\n⏰ *Novo Horário:* {horario}\n🎨 *Projeto:* {arte}\n\nMe confirma por aqui se ficou tudo certo para você!",
  posTattoo:
    "Fala *{nome}*! Muito obrigado pela confiança no *Thórin Tattoo Studio* hoje 🐉🔥\n\n🧴 *Cuidados Essenciais de Cicatrização:*\n1. Lave suavemente com sabonete neutro 2 a 3x ao dia.\n2. Seque sem esfregar (use papel toalha dando leves toques).\n3. Aplique uma camada fina da pomada cicatrizante recomendada.\n4. Evite sol direto, piscina, mar e alimentos muito gordurosos nos primeiros 15 dias.\n5. Não arranque as casquinhas!\n\nQualquer dúvida na cicatrização estou à disposição!",
  comunicado:
    "Fala *{nome}*! Aqui é o Daniel do *Thórin Tattoo Studio* 🐉\n\nEstou passando para avisar que abrimos novos horários especiais na agenda desta quinzena em Barão/RS!\n\nSe quiser tirar sua próxima ideia do papel ou agendar uma sessão, me responde aqui para garantirmos seu horário com prioridade!",
};

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatBrDate(isoDate?: string): string {
  if (!isoDate || !isoDate.includes("-")) return "A definir";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function addHoursToTime(startTime: string, hoursToAdd: number): string {
  const [hStr, mStr] = (startTime || "14:00").split(":");
  const totalMinutes = (Number(hStr) || 14) * 60 + (Number(mStr) || 0) + Math.round((hoursToAdd || 2) * 60);
  const clamped = Math.min(23 * 60 + 30, Math.max(0, totalMinutes));
  const hh = String(Math.floor(clamped / 60)).padStart(2, "0");
  const mm = String(clamped % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function inferBookingDateAndTime(booking: any): {
  date: string;
  startTime: string;
  endTime: string;
} {
  if (booking.date && booking.startTime) {
    return {
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime || addHoursToTime(booking.startTime, Number(booking.estimatedHours) || 2),
    };
  }
  const created = booking.createdAt ? new Date(booking.createdAt) : new Date();
  const fallbackDate = toIsoDate(isNaN(created.getTime()) ? new Date() : created);
  const timeMatches = String(booking.selectedSlotLabel || "").match(/(\d{1,2}:\d{2})/g);
  const startTime = timeMatches?.[0] ? timeMatches[0].padStart(5, "0") : "14:00";
  const endTime = timeMatches?.[1]
    ? timeMatches[1].padStart(5, "0")
    : addHoursToTime(startTime, Number(booking.estimatedHours) || 2);
  return { date: fallbackDate, startTime, endTime };
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("calendar");
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("month");
  const [cursorDate, setCursorDate] = useState<string>(() => toIsoDate(new Date()));
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [studio, setStudio] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [availabilitySlots, setAvailabilitySlots] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [pricingRules, setPricingRules] = useState<any>({
    valorMinimo: 180,
    valorHoraBase: 220,
    multiplicadorComplexidade: { baixa: 1, media: 1.25, alta: 1.55 },
    adicionalCoberturaPct: 25,
  });
  const [whatsappConfig, setWhatsappConfig] = useState<any>({
    provider: "direct",
    apiUrl: "",
    apiKey: "",
    instanceName: "",
    autoSendOnApprove: true,
    templates: DEFAULT_TEMPLATES,
  });
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  // Modal de Agendamento / Evento (Estilo Google Calendar)
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  // Central de Disparo WhatsApp
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<
    "confirmacao" | "lembrete" | "reagendamento" | "posTattoo" | "comunicado"
  >("confirmacao");
  const [selectedBookingForWa, setSelectedBookingForWa] = useState<string>("");
  const [waRecipientName, setWaRecipientName] = useState("");
  const [waRecipientPhone, setWaRecipientPhone] = useState("");
  const [waMessageText, setWaMessageText] = useState("");
  const [sendingWa, setSendingWa] = useState(false);
  const [broadcastFilter, setBroadcastFilter] = useState<"all" | "aprovado" | "pendente">("all");

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
    const savedPwd =
      typeof window !== "undefined" ? sessionStorage.getItem("thorin_admin_pwd") : null;
    if (savedPwd) {
      setPassword(savedPwd);
      setLogged(true);
    }

    fetch("/api/studio")
      .then((r) => r.json())
      .then((d) => {
        setStudio(d.studio);
        setPortfolio(d.portfolio || []);
        setCategories(d.categories || []);
        setAvailabilitySlots(d.availabilitySlots || []);
        const normalizedBookings = (d.bookings || []).map((b: any) => {
          const sched = inferBookingDateAndTime(b);
          return {
            ...b,
            eventType: b.eventType || "sessao",
            date: sched.date,
            startTime: sched.startTime,
            endTime: sched.endTime,
          };
        });
        setBookings(normalizedBookings);
        if (d.pricingRules) setPricingRules(d.pricingRules);
        if (d.whatsappConfig) {
          setWhatsappConfig({
            provider: "direct",
            apiUrl: "",
            apiKey: "",
            instanceName: "",
            autoSendOnApprove: true,
            ...d.whatsappConfig,
            templates: {
              ...DEFAULT_TEMPLATES,
              ...(d.whatsappConfig.templates || {}),
            },
          });
        }
        setWhatsappLogs(d.whatsappLogs || []);
      });
  }, []);

  async function saveAll(
    nextStudio = studio,
    nextPortfolio = portfolio,
    nextSlots = availabilitySlots,
    nextBookings = bookings,
    nextRules = pricingRules,
    redirectToLiveEditor = false,
    nextWaConfig = whatsappConfig
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
        whatsappConfig: nextWaConfig,
      }),
    });
    if (res.ok) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("thorin_admin_pwd", password);
        sessionStorage.setItem("thorin_admin_mode", "true");
      }
      setMsg("✅ Alterações salvas e sincronizadas ao vivo!");
      setLogged(true);
      if (redirectToLiveEditor && typeof window !== "undefined") {
        window.location.href = "/?edit=1";
      }
    } else {
      setMsg("❌ Senha incorreta! (Padrão: thorin2026)");
    }
  }

  // Formata um template de WhatsApp com os dados reais do agendamento
  function buildWhatsappMessage(
    templateKey: "confirmacao" | "lembrete" | "reagendamento" | "posTattoo" | "comunicado",
    booking?: any
  ): string {
    const rawTemplate =
      whatsappConfig?.templates?.[templateKey] || DEFAULT_TEMPLATES[templateKey] || "";
    const target = booking || {
      id: "TH-0000",
      clientName: waRecipientName || "Cliente",
      date: cursorDate,
      startTime: "14:00",
      endTime: "17:00",
      style: "Tattoo Autoral",
      sizeCm: 10,
      bodyPart: "Braço",
      priceRange: "A combinar",
    };

    const horarioStr = target.startTime
      ? `${target.startTime}${target.endTime ? ` às ${target.endTime}` : ""}`
      : target.selectedSlotLabel || "Horário agendado";

    return rawTemplate
      .replace(/\{nome\}/g, target.clientName || "Cliente")
      .replace(/\{protocolo\}/g, target.id || "TH")
      .replace(/\{data\}/g, formatBrDate(target.date))
      .replace(/\{horario\}/g, horarioStr)
      .replace(/\{arte\}/g, target.style || "Tatuagem")
      .replace(/\{tamanho\}/g, String(target.sizeCm || ""))
      .replace(/\{local\}/g, target.bodyPart || "")
      .replace(/\{valor\}/g, target.priceRange || "Sob avaliação")
      .replace(/\{endereco\}/g, studio?.address || "Centro — Barão/RS (Sala 303)");
  }

  // Atualiza a prévia quando escolhe um agendamento ou template na Central WhatsApp
  useEffect(() => {
    if (!studio) return;
    const found = bookings.find((b) => b.id === selectedBookingForWa);
    if (found) {
      setWaRecipientName(found.clientName || "");
      setWaRecipientPhone(found.clientWhatsapp || "");
      setWaMessageText(buildWhatsappMessage(selectedTemplateKey, found));
    } else {
      setWaMessageText(buildWhatsappMessage(selectedTemplateKey));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateKey, selectedBookingForWa, studio]);

  async function triggerWhatsappSend(
    customRecipientName: string,
    customRecipientPhone: string,
    customMessage: string,
    typeLabel: string,
    bookingId: string | null = null,
    openPopup = true
  ) {
    if (!customRecipientPhone || !customMessage) {
      alert("Informe o telefone com DDD e a mensagem antes de enviar!");
      return;
    }
    setSendingWa(true);
    try {
      const res = await fetch("/api/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          recipientName: customRecipientName,
          recipientPhone: customRecipientPhone,
          message: customMessage,
          type: typeLabel,
          bookingId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.whatsappLogs) setWhatsappLogs(data.whatsappLogs);
        setMsg(`📲 WhatsApp (${typeLabel}): ${data.statusInfo}`);
        // Se não foi enviado silenciosamente por API ou o usuário pediu para abrir o WhatsApp
        if (!data.apiSent && openPopup && data.whatsappUrl && typeof window !== "undefined") {
          window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
        }
      }
    } finally {
      setSendingWa(false);
    }
  }

  // Abre modal para criar novo agendamento ou bloqueio em uma data/hora específica
  function openNewEventModal(dateStr = cursorDate, startTime = "14:00", eventType = "sessao") {
    setIsCreatingEvent(true);
    setEditingEvent({
      id: `TH-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
      status: eventType === "bloqueio" ? "bloqueio" : "aprovado",
      eventType,
      clientName: eventType === "bloqueio" ? "Bloqueio de Agenda / Folga" : "",
      clientWhatsapp: "",
      style: eventType === "bloqueio" ? "Indisponível" : "Blackwork & Sombreado",
      sizeCm: 12,
      bodyPart: "Antebraço",
      complexity: "media",
      cobertura: false,
      estimatedHours: 3,
      priceRange: "R$ 450",
      depositPaid: "Sinal R$ 100 Pago",
      date: dateStr,
      startTime,
      endTime: addHoursToTime(startTime, 3),
      notes: "",
      referenceImage: null,
    });
  }

  function saveEventFromModal(sendConfirmationWa = false) {
    if (!editingEvent) return;
    if (!editingEvent.clientName?.trim()) {
      alert("Informe o nome do cliente ou título do bloqueio!");
      return;
    }

    const normalizedEvent = {
      ...editingEvent,
      endTime:
        editingEvent.endTime ||
        addHoursToTime(editingEvent.startTime || "14:00", Number(editingEvent.estimatedHours) || 2),
      selectedSlotLabel: `${formatBrDate(editingEvent.date)} • ${editingEvent.startTime} às ${
        editingEvent.endTime || addHoursToTime(editingEvent.startTime, editingEvent.estimatedHours)
      }`,
    };

    const exists = bookings.some((b) => b.id === normalizedEvent.id);
    const nextBookings = exists
      ? bookings.map((b) => (b.id === normalizedEvent.id ? normalizedEvent : b))
      : [normalizedEvent, ...bookings];

    setBookings(nextBookings);
    setEditingEvent(null);
    setIsCreatingEvent(false);
    saveAll(studio, portfolio, availabilitySlots, nextBookings, pricingRules);

    if (sendConfirmationWa && normalizedEvent.clientWhatsapp) {
      const msgText = buildWhatsappMessage("confirmacao", normalizedEvent);
      triggerWhatsappSend(
        normalizedEvent.clientName,
        normalizedEvent.clientWhatsapp,
        msgText,
        "confirmacao",
        normalizedEvent.id,
        true
      );
    }
  }

  function deleteEvent(id: string) {
    const nextBookings = bookings.filter((b) => b.id !== id);
    setBookings(nextBookings);
    setEditingEvent(null);
    saveAll(studio, portfolio, availabilitySlots, nextBookings, pricingRules);
  }

  function updateBookingStatus(
    booking: any,
    newStatus: "aprovado" | "pendente" | "concluido" | "recusado",
    notifyWhatsapp = false
  ) {
    const nextBookings = bookings.map((b) =>
      b.id === booking.id ? { ...b, status: newStatus } : b
    );
    let nextSlots = availabilitySlots;
    if (newStatus === "aprovado" && booking.selectedSlotId) {
      nextSlots = availabilitySlots.map((s) =>
        s.id === booking.selectedSlotId ? { ...s, available: false } : s
      );
      setAvailabilitySlots(nextSlots);
    }
    setBookings(nextBookings);
    saveAll(studio, portfolio, nextSlots, nextBookings, pricingRules);

    if (notifyWhatsapp && booking.clientWhatsapp) {
      const tplKey =
        newStatus === "aprovado"
          ? "confirmacao"
          : newStatus === "concluido"
          ? "posTattoo"
          : "reagendamento";
      const text = buildWhatsappMessage(tplKey, { ...booking, status: newStatus });
      triggerWhatsappSend(booking.clientName, booking.clientWhatsapp, text, tplKey, booking.id, true);
    }
  }

  // Navegação de Datas Estilo Google Calendar
  function navigateCalendar(delta: number) {
    const [y, m, d] = cursorDate.split("-").map(Number);
    const current = new Date(y, m - 1, d);
    if (calendarView === "month") {
      current.setMonth(current.getMonth() + delta);
    } else if (calendarView === "week") {
      current.setDate(current.getDate() + delta * 7);
    } else {
      current.setDate(current.getDate() + delta);
    }
    setCursorDate(toIsoDate(current));
  }

  // Cálculo dos 42 dias da Grade Mensal (Dom a Sáb)
  const monthDaysGrid = useMemo(() => {
    const [y, m] = cursorDate.split("-").map(Number);
    const firstDayOfMonth = new Date(y, m - 1, 1);
    const startOffset = firstDayOfMonth.getDay(); // 0 (Dom) a 6 (Sáb)
    const gridStart = new Date(y, m - 1, 1 - startOffset);

    return Array.from({ length: 42 }, (_, idx) => {
      const cellDate = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + idx
      );
      const iso = toIsoDate(cellDate);
      return {
        iso,
        dayNumber: cellDate.getDate(),
        isCurrentMonth: cellDate.getMonth() === m - 1,
        isToday: iso === toIsoDate(new Date()),
        weekday: cellDate.getDay(),
      };
    });
  }, [cursorDate]);

  // Cálculo dos 7 dias da Semana Atual (Dom a Sáb)
  const weekDaysList = useMemo(() => {
    const [y, m, d] = cursorDate.split("-").map(Number);
    const base = new Date(y, m - 1, d);
    const dayOfWeek = base.getDay();
    const sunday = new Date(y, m - 1, d - dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i);
      const iso = toIsoDate(dt);
      return {
        iso,
        dayNumber: dt.getDate(),
        monthShort: MONTHS_PT[dt.getMonth()].slice(0, 3),
        weekdayLabel: WEEKDAYS_SHORT[i],
        isToday: iso === toIsoDate(new Date()),
      };
    });
  }, [cursorDate]);

  // Agendamentos filtrados pela busca e status
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((b) => {
        if (statusFilter !== "all" && b.status !== statusFilter) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          String(b.clientName || "").toLowerCase().includes(q) ||
          String(b.id || "").toLowerCase().includes(q) ||
          String(b.style || "").toLowerCase().includes(q) ||
          String(b.clientWhatsapp || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const keyA = `${a.date || "9999-99-99"} ${a.startTime || "00:00"}`;
        const keyB = `${b.date || "9999-99-99"} ${b.startTime || "00:00"}`;
        return keyA.localeCompare(keyB);
      });
  }, [bookings, statusFilter, searchQuery]);

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
          <div className="space-y-2.5">
            <button
              onClick={() => saveAll()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-ember to-ember-gold text-obsidian font-display font-black uppercase tracking-wider text-xs hover:brightness-110 shadow-lg shadow-ember/30"
            >
              📅 Entrar na Agenda & Painel de Controle
            </button>
            <button
              onClick={() =>
                saveAll(studio, portfolio, availabilitySlots, bookings, pricingRules, true)
              }
              className="w-full py-3 rounded-xl bg-obsidian border border-ember/50 text-white font-bold text-xs uppercase tracking-wider hover:bg-wine/40"
            >
              🎨 Entrar e Editar Página Principal ao Vivo ↗
            </button>
          </div>
          {msg && <p className="text-center text-xs text-ember-gold">{msg}</p>}
        </div>
      </div>
    );
  }

  const [cursorY, cursorM, cursorD] = cursorDate.split("-").map(Number);
  const currentMonthTitle = `${MONTHS_PT[(cursorM || 1) - 1]} de ${cursorY}`;

  const pendingCount = bookings.filter((b) => b.status === "pendente").length;
  const approvedCount = bookings.filter((b) => b.status === "aprovado").length;
  const todayBookingsCount = bookings.filter((b) => b.date === toIsoDate(new Date())).length;

  const statusColorBadge = (status: string) => {
    switch (status) {
      case "aprovado":
        return "bg-emerald-950/90 border-emerald-500/60 text-emerald-300";
      case "concluido":
        return "bg-sky-950/90 border-sky-500/60 text-sky-300";
      case "bloqueio":
        return "bg-red-950/90 border-red-500/60 text-red-300";
      case "recusado":
        return "bg-zinc-900 border-zinc-700 text-zinc-400 line-through";
      default:
        return "bg-amber-950/90 border-amber-500/60 text-amber-300";
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-white p-3 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* =====================================================================
            CABEÇALHO SUPERIOR + NAVEGAÇÃO POR ABAS
        ====================================================================== */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-wine/50 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-ember animate-ping" />
              <span className="text-[10px] font-display font-bold uppercase tracking-[0.28em] text-ember-gold">
                Sistema de Gestão • {studio.name}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-white mt-1">
              Central de Agenda, WhatsApp & Portfólio
            </h1>
            {msg && <p className="text-xs text-emerald-400 mt-1 font-medium">{msg}</p>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openNewEventModal(cursorDate, "14:00", "sessao")}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-ember to-ember-gold text-obsidian text-xs font-display font-black uppercase tracking-wider shadow-lg shadow-ember/30 hover:brightness-110"
            >
              + Agendar Sessão
            </button>
            <a
              href="/?edit=1"
              onClick={() => {
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("thorin_admin_mode", "true");
                }
              }}
              className="px-4 py-2.5 rounded-xl bg-surface border border-ember-gold/60 text-ember-gold hover:bg-ember-gold hover:text-obsidian text-xs font-display font-bold uppercase tracking-wider transition-colors"
            >
              ✏️ Editar Site ao Vivo ↗
            </a>
            <a
              href="/"
              className="px-3.5 py-2.5 rounded-xl bg-surface border border-wine text-xs font-bold text-zinc-200 hover:text-white"
            >
              ← Ver Site
            </a>
          </div>
        </div>

        {/* BARRA DE ABAS PRINCIPAIS */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 p-1.5 rounded-2xl bg-surface border border-wine/50">
          <button
            type="button"
            onClick={() => setActiveTab("calendar")}
            className={`px-4 py-2.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === "calendar"
                ? "bg-gradient-to-r from-ember to-ember-gold text-obsidian font-black shadow-lg"
                : "text-zinc-300 hover:text-white hover:bg-obsidian/60"
            }`}
          >
            <span>📅 Agenda Google Calendar</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-obsidian text-ember-gold text-[10px]">
                {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("whatsapp")}
            className={`px-4 py-2.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === "whatsapp"
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400 text-obsidian font-black shadow-lg"
                : "text-zinc-300 hover:text-white hover:bg-obsidian/60"
            }`}
          >
            <span>💬 Avisos & Comunicados WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("slots")}
            className={`px-4 py-2.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === "slots"
                ? "bg-gradient-to-r from-ember to-ember-gold text-obsidian font-black shadow-lg"
                : "text-zinc-300 hover:text-white hover:bg-obsidian/60"
            }`}
          >
            🕒 Turnos Livres & Preços IA
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("portfolio")}
            className={`px-4 py-2.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === "portfolio"
                ? "bg-gradient-to-r from-ember to-ember-gold text-obsidian font-black shadow-lg"
                : "text-zinc-300 hover:text-white hover:bg-obsidian/60"
            }`}
          >
            📸 Portfólio, Site & Copiloto IA
          </button>
        </div>

        {/* =====================================================================
            ABA 1: AGENDA ESTILO GOOGLE CALENDAR (MÊS / SEMANA / DIA / LISTA)
        ====================================================================== */}
        {activeTab === "calendar" && (
          <div className="space-y-5">
            {/* Resumo Rápido de Indicadores da Agenda */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-surface border border-amber-500/40">
                <p className="text-[10px] uppercase tracking-widest text-amber-300 font-bold">
                  Aguardando Aprovação
                </p>
                <p className="font-display text-2xl sm:text-3xl font-black text-white mt-1">
                  {pendingCount}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-surface border border-emerald-500/40">
                <p className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold">
                  Sessões Confirmadas
                </p>
                <p className="font-display text-2xl sm:text-3xl font-black text-white mt-1">
                  {approvedCount}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-surface border border-ember/40">
                <p className="text-[10px] uppercase tracking-widest text-ember-gold font-bold">
                  Sessões Hoje ({formatBrDate(toIsoDate(new Date()))})
                </p>
                <p className="font-display text-2xl sm:text-3xl font-black text-white mt-1">
                  {todayBookingsCount}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-surface border border-wine/60">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                  Turnos Abertos no Site
                </p>
                <p className="font-display text-2xl sm:text-3xl font-black text-ember-gold mt-1">
                  {availabilitySlots.filter((s) => s.available).length}
                </p>
              </div>
            </div>

            {/* BARRA DE FERRAMENTAS DO CALENDÁRIO (ESTILO GOOGLE AGENDA) */}
            <div className="bg-surface border border-ember/40 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Controles de Data: Hoje, Anterior, Próximo, Data Atual */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setCursorDate(toIsoDate(new Date()))}
                  className="px-3.5 py-2 rounded-xl bg-obsidian border border-wine hover:border-ember text-xs font-display font-bold uppercase tracking-wider"
                >
                  Hoje
                </button>
                <div className="flex items-center rounded-xl bg-obsidian border border-wine overflow-hidden">
                  <button
                    type="button"
                    onClick={() => navigateCalendar(-1)}
                    className="px-3 py-2 hover:bg-wine/40 text-sm font-bold"
                    title="Anterior"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateCalendar(1)}
                    className="px-3 py-2 hover:bg-wine/40 text-sm font-bold border-l border-wine/50"
                    title="Próximo"
                  >
                    ▶
                  </button>
                </div>

                <h2 className="font-display text-lg sm:text-xl font-black text-white px-1">
                  {calendarView === "day"
                    ? `${cursorD} de ${currentMonthTitle}`
                    : currentMonthTitle}
                </h2>

                <input
                  type="date"
                  value={cursorDate}
                  onChange={(e) => e.target.value && setCursorDate(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-obsidian border border-wine text-xs text-zinc-200"
                />
              </div>

              {/* Seletores de Modo de Visualização (Mês / Semana / Dia / Programação) + Ações */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-xl bg-obsidian border border-wine p-1 gap-1">
                  {(
                    [
                      { id: "month", label: "🗓️ Mês" },
                      { id: "week", label: "📊 Semana" },
                      { id: "day", label: "🕐 Dia" },
                      { id: "schedule", label: "📋 Lista / Kanban" },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setCalendarView(mode.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition-all ${
                        calendarView === mode.id
                          ? "bg-ember text-obsidian font-black"
                          : "text-zinc-300 hover:text-white"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => openNewEventModal(cursorDate, "09:00", "bloqueio")}
                  className="px-3 py-2 rounded-xl bg-red-950/70 border border-red-500/40 text-red-200 hover:bg-red-900 text-xs font-display font-bold uppercase tracking-wider"
                >
                  🚫 Bloquear Horário
                </button>
              </div>
            </div>

            {/* =================================================================
                MODO 1: GRADE MENSAL (GOOGLE CALENDAR MONTH VIEW)
            ================================================================== */}
            {calendarView === "month" && (
              <div className="bg-surface border border-wine/60 rounded-2xl overflow-hidden shadow-2xl">
                {/* Cabeçalho dos dias da semana */}
                <div className="grid grid-cols-7 bg-obsidian border-b border-wine/50">
                  {WEEKDAYS_SHORT.map((day) => (
                    <div
                      key={day}
                      className="py-3 text-center text-[11px] font-display font-bold uppercase tracking-widest text-ember-gold"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* 42 Células do Mês */}
                <div className="grid grid-cols-7 divide-x divide-y divide-wine/30">
                  {monthDaysGrid.map((cell) => {
                    const dayEvents = bookings
                      .filter((b) => b.date === cell.iso)
                      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
                    const isSelectedDay = cell.iso === cursorDate;

                    return (
                      <div
                        key={cell.iso}
                        onClick={() => setCursorDate(cell.iso)}
                        onDoubleClick={() => openNewEventModal(cell.iso, "14:00", "sessao")}
                        className={`min-h-[105px] sm:min-h-[130px] p-1.5 sm:p-2 transition-colors cursor-pointer flex flex-col justify-between ${
                          cell.isCurrentMonth ? "bg-obsidian/40" : "bg-obsidian/90 opacity-45"
                        } ${
                          isSelectedDay
                            ? "ring-2 ring-inset ring-ember-gold bg-ember/10"
                            : "hover:bg-wine/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-display font-bold ${
                              cell.isToday
                                ? "bg-ember text-obsidian font-black shadow-lg shadow-ember/40"
                                : isSelectedDay
                                ? "text-ember-gold font-black"
                                : "text-zinc-300"
                            }`}
                          >
                            {cell.dayNumber}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openNewEventModal(cell.iso, "14:00", "sessao");
                            }}
                            title="Agendar neste dia"
                            className="opacity-0 hover:opacity-100 focus:opacity-100 w-5 h-5 rounded bg-surface border border-ember/50 text-ember-gold text-xs flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>

                        <div className="space-y-1 mt-1 flex-1">
                          {dayEvents.slice(0, 3).map((ev) => (
                            <div
                              key={ev.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsCreatingEvent(false);
                                setEditingEvent({ ...ev });
                              }}
                              className={`px-1.5 py-1 rounded-lg border text-[10px] leading-tight truncate font-medium transition-transform hover:scale-[1.02] ${statusColorBadge(
                                ev.status
                              )}`}
                            >
                              <span className="font-bold">{ev.startTime}</span>{" "}
                              <span>{ev.clientName}</span>
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <p className="text-[10px] text-ember-gold font-bold pl-1">
                              + {dayEvents.length - 3} mais...
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Rodapé Rápido do Dia Selecionado na Visão Mensal */}
                <div className="p-4 bg-obsidian border-t border-wine/50 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-ember-gold font-bold">
                      Dia Selecionado: {formatBrDate(cursorDate)}
                    </span>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      {bookings.filter((b) => b.date === cursorDate).length} agendamento(s) neste dia. Dê dois cliques em qualquer dia ou use os botões ao lado.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCalendarView("day")}
                      className="px-3.5 py-2 rounded-xl bg-surface border border-ember/50 text-xs font-display font-bold text-ember-gold"
                    >
                      🕐 Ver Grade de Horas do Dia
                    </button>
                    <button
                      type="button"
                      onClick={() => openNewEventModal(cursorDate, "14:00", "sessao")}
                      className="px-4 py-2 rounded-xl bg-ember text-white text-xs font-display font-bold uppercase"
                    >
                      + Agendar em {formatBrDate(cursorDate)}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================
                MODO 2: GRADE SEMANAL DE HORÁRIOS (GOOGLE CALENDAR WEEK VIEW)
            ================================================================== */}
            {calendarView === "week" && (
              <div className="bg-surface border border-wine/60 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <div className="min-w-[820px]">
                    {/* Cabeçalho das 7 colunas da semana */}
                    <div className="grid grid-cols-8 bg-obsidian border-b border-wine/50">
                      <div className="p-3 text-center text-[10px] font-display uppercase tracking-widest text-zinc-400 border-r border-wine/30">
                        Hora
                      </div>
                      {weekDaysList.map((wd) => (
                        <div
                          key={wd.iso}
                          onClick={() => {
                            setCursorDate(wd.iso);
                            setCalendarView("day");
                          }}
                          className={`p-2.5 text-center cursor-pointer border-r border-wine/30 hover:bg-wine/20 ${
                            wd.isToday ? "bg-ember/15" : ""
                          }`}
                        >
                          <p className="text-[10px] font-display font-bold uppercase tracking-wider text-ember-gold">
                            {wd.weekdayLabel}
                          </p>
                          <p
                            className={`text-sm font-display font-black mt-0.5 ${
                              wd.isToday ? "text-ember" : "text-white"
                            }`}
                          >
                            {wd.dayNumber} {wd.monthShort}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Linhas de Horário (08:00 às 21:00) */}
                    <div className="divide-y divide-wine/25">
                      {HOURS_GRID.map((hourLabel) => {
                        const hourPrefix = hourLabel.slice(0, 2);
                        return (
                          <div key={hourLabel} className="grid grid-cols-8 min-h-[60px]">
                            <div className="p-2 text-right pr-3 text-[11px] font-display font-bold text-zinc-400 bg-obsidian/70 border-r border-wine/30">
                              {hourLabel}
                            </div>
                            {weekDaysList.map((wd) => {
                              const slotEvents = bookings.filter(
                                (b) =>
                                  b.date === wd.iso &&
                                  (b.startTime || "14:00").slice(0, 2) === hourPrefix
                              );
                              return (
                                <div
                                  key={`${wd.iso}-${hourLabel}`}
                                  onClick={() => openNewEventModal(wd.iso, hourLabel, "sessao")}
                                  className="p-1 border-r border-wine/20 hover:bg-ember/10 cursor-pointer transition-colors relative group"
                                >
                                  <span className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 text-[9px] text-ember-gold font-bold">
                                    + Agendar
                                  </span>
                                  {slotEvents.map((ev) => (
                                    <div
                                      key={ev.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsCreatingEvent(false);
                                        setEditingEvent({ ...ev });
                                      }}
                                      className={`p-1.5 rounded-lg border text-[10px] mb-1 shadow-md ${statusColorBadge(
                                        ev.status
                                      )}`}
                                    >
                                      <p className="font-bold truncate">
                                        {ev.startTime} - {ev.endTime} • {ev.clientName}
                                      </p>
                                      <p className="opacity-85 truncate">
                                        {ev.style} ({ev.estimatedHours}h)
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================
                MODO 3: VISÃO DIÁRIA HORA A HORA + FICHA DO DIA (DAY VIEW)
            ================================================================== */}
            {calendarView === "day" && (
              <div className="grid lg:grid-cols-12 gap-6">
                {/* Coluna Esquerda: Linha do Tempo Hora a Hora */}
                <div className="lg:col-span-7 bg-surface border border-wine/60 rounded-2xl overflow-hidden">
                  <div className="p-4 bg-obsidian border-b border-wine/50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-display uppercase tracking-widest text-ember-gold font-bold">
                        Grade Horária do Dia
                      </span>
                      <h3 className="font-display text-lg font-black text-white">
                        {formatBrDate(cursorDate)}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => openNewEventModal(cursorDate, "14:00", "sessao")}
                      className="px-3.5 py-2 rounded-xl bg-ember text-white text-xs font-bold"
                    >
                      + Novo Horário neste Dia
                    </button>
                  </div>

                  <div className="divide-y divide-wine/25">
                    {HOURS_GRID.map((hourLabel) => {
                      const hourPrefix = hourLabel.slice(0, 2);
                      const matching = bookings.filter(
                        (b) =>
                          b.date === cursorDate &&
                          (b.startTime || "14:00").slice(0, 2) === hourPrefix
                      );
                      return (
                        <div
                          key={hourLabel}
                          onClick={() => openNewEventModal(cursorDate, hourLabel, "sessao")}
                          className="flex items-stretch min-h-[62px] hover:bg-obsidian/50 cursor-pointer group"
                        >
                          <div className="w-20 shrink-0 p-3 text-xs font-display font-bold text-zinc-400 bg-obsidian/60 border-r border-wine/30">
                            {hourLabel}
                          </div>
                          <div className="flex-1 p-2 space-y-1.5 relative">
                            {matching.length === 0 ? (
                              <span className="opacity-0 group-hover:opacity-100 text-[11px] text-ember-gold font-medium inline-block pt-1 pl-2">
                                + Clique para agendar sessão às {hourLabel}
                              </span>
                            ) : (
                              matching.map((ev) => (
                                <div
                                  key={ev.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsCreatingEvent(false);
                                    setEditingEvent({ ...ev });
                                  }}
                                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${statusColorBadge(
                                    ev.status
                                  )}`}
                                >
                                  <div>
                                    <p className="text-xs font-black">
                                      {ev.startTime} às {ev.endTime} — {ev.clientName} (#{ev.id})
                                    </p>
                                    <p className="text-[11px] opacity-90 mt-0.5">
                                      {ev.style} • {ev.sizeCm}cm ({ev.bodyPart}) • {ev.priceRange}
                                    </p>
                                  </div>
                                  <span className="px-2.5 py-1 rounded-lg bg-black/40 text-[10px] font-bold uppercase shrink-0">
                                    Editar ✎
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Coluna Direita: Fichas Completas e Ações WhatsApp do Dia */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-5 rounded-2xl bg-surface border border-ember/40 space-y-4">
                    <h3 className="font-display text-base font-black text-ember-gold">
                      📋 Clientes & Sessões de {formatBrDate(cursorDate)}
                    </h3>
                    {bookings.filter((b) => b.date === cursorDate).length === 0 ? (
                      <p className="text-xs text-zinc-400">
                        Nenhuma sessão agendada para este dia. Clique em qualquer horário à esquerda para criar!
                      </p>
                    ) : (
                      bookings
                        .filter((b) => b.date === cursorDate)
                        .map((b) => (
                          <div
                            key={b.id}
                            className="p-4 rounded-xl bg-obsidian border border-wine/60 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusColorBadge(
                                    b.status
                                  )}`}
                                >
                                  {b.status} • {b.startTime} às {b.endTime}
                                </span>
                                <h4 className="font-bold text-sm mt-1.5">{b.clientName}</h4>
                                <p className="text-xs text-zinc-400">WhatsApp: {b.clientWhatsapp}</p>
                              </div>
                              {b.referenceImage && (
                                <img
                                  src={b.referenceImage}
                                  alt="Ref"
                                  className="w-14 h-14 rounded-lg object-cover border border-ember/50"
                                />
                              )}
                            </div>

                            <div className="text-xs text-zinc-300 space-y-0.5 bg-surface p-2.5 rounded-lg">
                              <p>
                                <strong className="text-ember-gold">Projeto:</strong> {b.style} (
                                {b.sizeCm}cm • {b.bodyPart})
                              </p>
                              <p>
                                <strong className="text-ember-gold">Valor:</strong> {b.priceRange} •{" "}
                                <strong className="text-ember-gold">Sinal:</strong>{" "}
                                {b.depositPaid || "A verificar"}
                              </p>
                              {b.notes && (
                                <p>
                                  <strong className="text-ember-gold">Obs:</strong> {b.notes}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {b.status !== "aprovado" && b.status !== "bloqueio" && (
                                <button
                                  type="button"
                                  onClick={() => updateBookingStatus(b, "aprovado", true)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
                                >
                                  ✅ Aprovar + WhatsApp
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  const text = buildWhatsappMessage("lembrete", b);
                                  triggerWhatsappSend(
                                    b.clientName,
                                    b.clientWhatsapp,
                                    text,
                                    "lembrete",
                                    b.id,
                                    true
                                  );
                                }}
                                className="px-3 py-1.5 rounded-lg bg-ember text-white text-[11px] font-bold"
                              >
                                ⏰ Lembrete WhatsApp
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingEvent(false);
                                  setEditingEvent({ ...b });
                                }}
                                className="px-3 py-1.5 rounded-lg bg-surface border border-wine text-zinc-200 text-[11px] font-bold"
                              >
                                Editar / Reagendar
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================
                MODO 4: PROGRAMAÇÃO / LISTA & FILTROS (SCHEDULE / KANBAN VIEW)
            ================================================================== */}
            {calendarView === "schedule" && (
              <div className="bg-surface border border-wine/60 rounded-2xl p-5 space-y-5">
                <div className="flex flex-col sm:flex-row gap-3 justify-between">
                  <input
                    type="text"
                    placeholder="Buscar por nome do cliente, protocolo (#TH), WhatsApp ou estilo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-obsidian border border-wine text-xs text-white"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "all", label: "Todos" },
                      { id: "pendente", label: "⏳ Pendentes" },
                      { id: "aprovado", label: "✅ Confirmados" },
                      { id: "concluido", label: "🔥 Concluídos" },
                      { id: "bloqueio", label: "🚫 Bloqueios" },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setStatusFilter(st.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold ${
                          statusFilter === st.id
                            ? "bg-ember text-obsidian"
                            : "bg-obsidian border border-wine text-zinc-300"
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredBookings.length === 0 ? (
                  <p className="text-xs text-zinc-400 py-8 text-center">
                    Nenhum agendamento encontrado para este filtro.
                  </p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {filteredBookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-5 rounded-2xl bg-obsidian border border-wine/50 flex flex-col justify-between gap-4 hover:border-ember/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${statusColorBadge(
                                  b.status
                                )}`}
                              >
                                {b.status} • #{b.id}
                              </span>
                              <span className="px-2.5 py-1 rounded-full bg-surface border border-ember/40 text-ember-gold text-[10px] font-bold">
                                📅 {formatBrDate(b.date)} • {b.startTime} às {b.endTime}
                              </span>
                            </div>
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
                            <strong className="text-ember-gold">Arte:</strong> {b.style} ({b.sizeCm}
                            cm • {b.bodyPart})
                          </p>
                          <p>
                            <strong className="text-ember-gold">Sessão Estimada:</strong>{" "}
                            {b.estimatedHours}h ({b.priceRange})
                          </p>
                          <p>
                            <strong className="text-ember-gold">Sinal / Pagamento:</strong>{" "}
                            {b.depositPaid || "Pendente"}
                          </p>
                          {b.notes && (
                            <p>
                              <strong className="text-ember-gold">Notas:</strong> {b.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => updateBookingStatus(b, "aprovado", true)}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                          >
                            ✅ Aprovar & Avisar no WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingEvent(false);
                              setEditingEvent({ ...b });
                            }}
                            className="py-2.5 px-3 rounded-xl bg-surface border border-ember/50 text-ember-gold font-bold text-xs"
                          >
                            ✏️ Editar / Horário
                          </button>
                          <button
                            type="button"
                            onClick={() => updateBookingStatus(b, "concluido", true)}
                            title="Concluir e enviar cuidados pós-tattoo"
                            className="py-2.5 px-3 rounded-xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs"
                          >
                            🧴 Concluir + Pós-Tattoo
                          </button>
                          <button
                            type="button"
                            onClick={() => updateBookingStatus(b, "recusado", false)}
                            className="py-2.5 px-3 rounded-xl bg-red-950/70 text-red-300 font-bold text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            ABA 2: CENTRAL DE AVISOS, LEMBRETES & COMUNICADOS WHATSAPP
        ====================================================================== */}
        {activeTab === "whatsapp" && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-12 gap-6">
              {/* Coluna Esquerda: Compositor e Disparo de Avisos & Comunicados */}
              <div className="lg:col-span-7 bg-surface border border-emerald-500/40 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-display font-bold uppercase tracking-widest text-emerald-400">
                      Comunicação Direta & Automatizada
                    </span>
                    <h2 className="font-display text-xl font-black text-white">
                      💬 Enviar Aviso, Lembrete ou Comunicado
                    </h2>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase">
                    {whatsappConfig.provider === "direct"
                      ? "Modo WhatsApp Direto"
                      : `API: ${whatsappConfig.provider}`}
                  </span>
                </div>

                {/* Seleção do Tipo de Mensagem */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-zinc-300 block">
                    1. Escolha o Modelo de Aviso / Comunicado:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(
                      [
                        { id: "confirmacao", label: "✅ Confirmação" },
                        { id: "lembrete", label: "⏰ Lembrete 24h" },
                        { id: "reagendamento", label: "📅 Reagendar" },
                        { id: "posTattoo", label: "🧴 Pós-Tattoo" },
                        { id: "comunicado", label: "📢 Comunicado" },
                      ] as const
                    ).map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setSelectedTemplateKey(tpl.id)}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all ${
                          selectedTemplateKey === tpl.id
                            ? "bg-emerald-500 text-obsidian border-emerald-400 font-black"
                            : "bg-obsidian border-wine text-zinc-300 hover:border-emerald-500/50"
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selecionar Cliente da Agenda ou Digitar Manualmente */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-zinc-300">
                      2. Selecionar Cliente da Agenda:
                    </span>
                    <select
                      value={selectedBookingForWa}
                      onChange={(e) => setSelectedBookingForWa(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-obsidian border border-wine text-xs text-white"
                    >
                      <option value="">-- Digitar número avulso abaixo --</option>
                      {bookings
                        .filter((b) => b.status !== "bloqueio")
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.clientName} ({formatBrDate(b.date)} {b.startTime}) — #{b.id}
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-zinc-300">
                      WhatsApp do Destinatário (com DDD):
                    </span>
                    <input
                      type="text"
                      placeholder="Ex: 54 999512776"
                      value={waRecipientPhone}
                      onChange={(e) => setWaRecipientPhone(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-obsidian border border-wine text-xs text-white"
                    />
                  </label>
                </div>

                {/* Mensagem Pronta Editável */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-300">
                      3. Mensagem Personalizada (Você pode editar antes de enviar):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextTemplates = {
                          ...(whatsappConfig.templates || DEFAULT_TEMPLATES),
                          [selectedTemplateKey]: waMessageText,
                        };
                        const nextCfg = { ...whatsappConfig, templates: nextTemplates };
                        setWhatsappConfig(nextCfg);
                        saveAll(
                          studio,
                          portfolio,
                          availabilitySlots,
                          bookings,
                          pricingRules,
                          false,
                          nextCfg
                        );
                      }}
                      className="text-[11px] text-ember-gold hover:underline font-semibold"
                    >
                      💾 Salvar como modelo padrão
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={waMessageText}
                    onChange={(e) => setWaMessageText(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-obsidian border border-wine text-xs text-white leading-relaxed font-sans"
                  />
                  <p className="text-[10px] text-zinc-400">
                    Variáveis suportadas nos modelos:{" "}
                    <code>
                      {"{nome}"}, {"{protocolo}"}, {"{data}"}, {"{horario}"}, {"{arte}"},{" "}
                      {"{tamanho}"}, {"{local}"}, {"{valor}"}, {"{endereco}"}
                    </code>
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    disabled={sendingWa}
                    onClick={() =>
                      triggerWhatsappSend(
                        waRecipientName || "Cliente",
                        waRecipientPhone,
                        waMessageText,
                        selectedTemplateKey,
                        selectedBookingForWa || null,
                        true
                      )
                    }
                    className="flex-1 py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-obsidian font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110"
                  >
                    {sendingWa
                      ? "Enviando..."
                      : "📲 Enviar Agora no WhatsApp"}
                  </button>
                </div>
              </div>

              {/* Coluna Direita: Transmissão de Comunicados & Configuração de API */}
              <div className="lg:col-span-5 space-y-6">
                {/* Bloco de Comunicados para Lista de Clientes */}
                <div className="bg-surface border border-ember/40 rounded-2xl p-5 space-y-3.5">
                  <h3 className="font-display text-base font-black text-ember-gold">
                    📢 Lista de Transmissão / Comunicados Rápidos
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Envie avisos de abertura de agenda, horários vagos de última hora ou lembretes do dia para os clientes cadastrados:
                  </p>
                  <div className="flex gap-1.5">
                    {[
                      { id: "all", label: "Todos Clientes" },
                      { id: "aprovado", label: "Confirmados" },
                      { id: "pendente", label: "Pendentes" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setBroadcastFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold ${
                          broadcastFilter === f.id
                            ? "bg-ember text-obsidian"
                            : "bg-obsidian text-zinc-300 border border-wine"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                    {bookings
                      .filter(
                        (b) =>
                          b.status !== "bloqueio" &&
                          b.clientWhatsapp &&
                          (broadcastFilter === "all" || b.status === broadcastFilter)
                      )
                      .map((b) => (
                        <div
                          key={b.id}
                          className="p-3 rounded-xl bg-obsidian border border-wine/40 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{b.clientName}</p>
                            <p className="text-[10px] text-zinc-400">
                              {b.clientWhatsapp} • {formatBrDate(b.date)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const msgForClient = buildWhatsappMessage(selectedTemplateKey, b);
                              triggerWhatsappSend(
                                b.clientName,
                                b.clientWhatsapp,
                                msgForClient,
                                `comunicado-${selectedTemplateKey}`,
                                b.id,
                                true
                              );
                            }}
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
                          >
                            Enviar ↗
                          </button>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Configuração de Integração de API WhatsApp (Para Preenchimento Futuro ou Uso Imediato) */}
                <div className="bg-surface border border-wine/60 rounded-2xl p-5 space-y-3.5">
                  <div>
                    <span className="text-[10px] font-display uppercase tracking-widest text-ember-gold font-bold">
                      Integração Técnica (Opcional)
                    </span>
                    <h3 className="font-display text-base font-black text-white">
                      ⚙️ Configurar Disparo Automático (API / Webhook)
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      No modo padrão (Direto), os avisos abrem prontos no seu WhatsApp. Caso queira disparo 100% silencioso em segundo plano, selecione o provedor e preencha os dados abaixo:
                    </p>
                  </div>

                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-zinc-300">Modo / Provedor</span>
                    <select
                      value={whatsappConfig.provider || "direct"}
                      onChange={(e) =>
                        setWhatsappConfig({ ...whatsappConfig, provider: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-obsidian border border-wine text-xs text-white"
                    >
                      <option value="direct">
                        Modo Direto (WhatsApp Web / App — Sem custo de API)
                      </option>
                      <option value="evolution">Evolution API (Auto-hospedada / Oficial)</option>
                      <option value="zapi">Z-API</option>
                      <option value="meta">Meta WhatsApp Cloud API (Oficial)</option>
                      <option value="webhook">Webhook Customizado (n8n / Make / Zapier)</option>
                    </select>
                  </label>

                  {whatsappConfig.provider !== "direct" && (
                    <div className="space-y-2.5 pt-1">
                      <input
                        type="text"
                        placeholder="URL da API ou Webhook (ex: https://api.seudominio.com)"
                        value={whatsappConfig.apiUrl || ""}
                        onChange={(e) =>
                          setWhatsappConfig({ ...whatsappConfig, apiUrl: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-obsidian border border-wine text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="Nome da Instância ou Phone Number ID"
                        value={whatsappConfig.instanceName || ""}
                        onChange={(e) =>
                          setWhatsappConfig({ ...whatsappConfig, instanceName: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-obsidian border border-wine text-xs text-white"
                      />
                      <input
                        type="password"
                        placeholder="API Key / Bearer Token"
                        value={whatsappConfig.apiKey || ""}
                        onChange={(e) =>
                          setWhatsappConfig({ ...whatsappConfig, apiKey: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-obsidian border border-wine text-xs text-white"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      saveAll(
                        studio,
                        portfolio,
                        availabilitySlots,
                        bookings,
                        pricingRules,
                        false,
                        whatsappConfig
                      )
                    }
                    className="w-full py-2.5 rounded-xl bg-ember text-white font-display font-bold text-xs uppercase tracking-wider"
                  >
                    Salvar Configuração WhatsApp
                  </button>
                </div>
              </div>
            </div>

            {/* Histórico de Avisos e Comunicados Disparados */}
            <div className="bg-surface border border-wine/50 rounded-2xl p-5 space-y-3">
              <h3 className="font-display text-sm font-black uppercase tracking-wider text-ember-gold">
                📜 Histórico Recente de Avisos & Comunicados ({whatsappLogs.length})
              </h3>
              {whatsappLogs.length === 0 ? (
                <p className="text-xs text-zinc-400">
                  Nenhum aviso disparado ainda nesta sessão.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-wine/40 text-zinc-400">
                        <th className="py-2 pr-3">Data/Hora</th>
                        <th className="py-2 pr-3">Cliente</th>
                        <th className="py-2 pr-3">WhatsApp</th>
                        <th className="py-2 pr-3">Tipo</th>
                        <th className="py-2 pr-3">Status / Canal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-wine/20">
                      {whatsappLogs.slice(0, 15).map((log) => (
                        <tr key={log.id}>
                          <td className="py-2 pr-3 text-zinc-400">
                            {new Date(log.sentAt).toLocaleString("pt-BR")}
                          </td>
                          <td className="py-2 pr-3 font-bold text-white">{log.recipientName}</td>
                          <td className="py-2 pr-3 text-zinc-300">{log.recipientPhone}</td>
                          <td className="py-2 pr-3">
                            <span className="px-2 py-0.5 rounded bg-obsidian border border-ember/40 text-ember-gold text-[10px] uppercase">
                              {log.type}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-emerald-400">{log.statusInfo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            ABA 3: TURNOS LIVRES & PARÂMETROS DE PREÇO DA IA
        ====================================================================== */}
        {activeTab === "slots" && (
          <div className="space-y-6">
            <section className="bg-surface border border-wine/40 rounded-2xl p-6 space-y-6">
              <div>
                <span className="text-[10px] font-display uppercase tracking-widest text-ember-gold font-bold">
                  Triagem Automática do Assistente Virtual
                </span>
                <h2 className="font-display text-xl font-black text-white mt-0.5">
                  🕒 Turnos Sugeridos pela IA no Site
                </h2>
                <p className="text-xs text-zinc-300 mt-1">
                  Estes são os turnos que o Assistente IA oferece aos clientes durante o orçamento automático na página inicial.
                </p>
              </div>

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
                          slot.available
                            ? "bg-emerald-700 text-white"
                            : "bg-zinc-800 text-zinc-300"
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

            {/* Regras de Preço da IA */}
            <section className="bg-surface border border-wine/40 rounded-2xl p-6 space-y-4">
              <h3 className="font-display text-lg font-bold text-ember-gold">
                💰 Parâmetros de Cálculo de Orçamento da IA
              </h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-300 font-bold">Valor Mínimo (R$)</span>
                  <input
                    type="number"
                    value={pricingRules?.valorMinimo || 180}
                    onChange={(e) =>
                      setPricingRules({ ...pricingRules, valorMinimo: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-obsidian border border-wine text-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-300 font-bold">Valor Hora Base (R$)</span>
                  <input
                    type="number"
                    value={pricingRules?.valorHoraBase || 220}
                    onChange={(e) =>
                      setPricingRules({ ...pricingRules, valorHoraBase: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-obsidian border border-wine text-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-zinc-300 font-bold">Adicional Cobertura (%)</span>
                  <input
                    type="number"
                    value={pricingRules?.adicionalCoberturaPct ?? 25}
                    onChange={(e) =>
                      setPricingRules({
                        ...pricingRules,
                        adicionalCoberturaPct: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-obsidian border border-wine text-sm"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() =>
                  saveAll(studio, portfolio, availabilitySlots, bookings, pricingRules)
                }
                className="px-6 py-2.5 rounded-xl bg-ember text-white font-bold text-xs uppercase tracking-wider"
              >
                Salvar Regras de Orçamento
              </button>
            </section>
          </div>
        )}

        {/* =====================================================================
            ABA 4: PORTFÓLIO, EDITOR VISUAL DO SITE & COPILOTO IA
        ====================================================================== */}
        {activeTab === "portfolio" && (
          <div className="space-y-6">
            {/* Destaque p/ o Construtor Visual na Home */}
            <section className="bg-gradient-to-r from-ember/20 via-wine-dark/40 to-surface border-2 border-ember/70 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <span className="text-[10px] font-display font-bold uppercase tracking-[0.25em] text-ember-gold">
                  Construtor Visual em Tempo Real
                </span>
                <h2 className="font-display text-lg sm:text-xl font-black text-white">
                  Edite Textos, Blocos e Fotos Diretamente na Página Principal
                </h2>
                <p className="text-xs text-zinc-200 max-w-2xl leading-relaxed">
                  Clique em qualquer bloco, card ou foto da Home para editar ou adicionar imagens enxergando na hora exatamente como o conteúdo preenche o layout antes de confirmar.
                </p>
              </div>
              <a
                href="/?edit=1"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    sessionStorage.setItem("thorin_admin_mode", "true");
                  }
                }}
                className="shrink-0 px-6 py-3.5 rounded-xl bg-gradient-to-r from-ember via-ember-bright to-ember-gold text-obsidian font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-ember/40 hover:brightness-110 transition-all"
              >
                Abrir Editor Visual na Home ↗
              </a>
            </section>

            {/* Publicar Nova Foto no Portfólio */}
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
                {uploading ? "Enviando Foto..." : "Selecionar Foto e Publicar"}
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </section>

            {/* Copiloto IA do Daniel */}
            <section className="bg-gradient-to-r from-surface via-wine-dark/30 to-surface border border-ember/50 rounded-2xl p-6 space-y-4">
              <h2 className="font-display text-lg font-bold text-ember-gold">
                🤖 Copiloto IA do Daniel (Administração por Comando)
              </h2>
              <p className="text-xs text-zinc-300">
                Digite comandos rápidos como: <code>Abrir Quarta-feira • 14:00 às 18:00 (4h)</code>{" "}
                ou <code>Mudar aviso para: Agenda de Novembro Aberta</code>
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
          </div>
        )}
      </div>

      {/* =====================================================================
          MODAL ESTILO GOOGLE AGENDA (CRIAR / EDITAR SESSÃO OU BLOQUEIO)
      ====================================================================== */}
      {editingEvent && (
        <div
          onClick={() => setEditingEvent(null)}
          className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-obsidian border-2 border-ember/70 rounded-2xl p-5 sm:p-7 shadow-[0_25px_90px_rgba(0,0,0,0.98)] space-y-4 my-auto"
          >
            <div className="flex items-center justify-between border-b border-wine/50 pb-3">
              <div>
                <span className="text-[10px] font-display font-bold uppercase tracking-widest text-ember-gold">
                  {isCreatingEvent ? "Novo Registro na Agenda" : `Editando Protocolo #${editingEvent.id}`}
                </span>
                <h3 className="font-display text-lg sm:text-xl font-black text-white">
                  {editingEvent.eventType === "bloqueio"
                    ? "🚫 Bloqueio de Agenda / Folga"
                    : "📅 Ficha de Sessão & Controle de Horário"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="w-8 h-8 rounded-lg bg-surface border border-wine text-zinc-300 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Seletor de Tipo e Status */}
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block space-y-1 text-xs">
                <span className="text-zinc-300 font-bold">Tipo de Evento</span>
                <select
                  value={editingEvent.eventType || "sessao"}
                  onChange={(e) => {
                    const nextType = e.target.value;
                    setEditingEvent({
                      ...editingEvent,
                      eventType: nextType,
                      status: nextType === "bloqueio" ? "bloqueio" : editingEvent.status,
                      clientName:
                        nextType === "bloqueio" && !editingEvent.clientName
                          ? "Horário Bloqueado"
                          : editingEvent.clientName,
                    });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface border border-wine text-white"
                >
                  <option value="sessao">🎨 Sessão de Tatuagem</option>
                  <option value="retoque">✨ Sessão de Retoque</option>
                  <option value="orcamento">💬 Avaliação / Orçamento Presencial</option>
                  <option value="bloqueio">🚫 Bloqueio de Agenda / Compromisso</option>
                </select>
              </label>

              <label className="block space-y-1 text-xs">
                <span className="text-zinc-300 font-bold">Status na Agenda</span>
                <select
                  value={editingEvent.status || "pendente"}
                  onChange={(e) => setEditingEvent({ ...editingEvent, status: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface border border-wine text-white"
                >
                  <option value="pendente">⏳ Pendente (Aguardando Confirmação)</option>
                  <option value="aprovado">✅ Confirmado / Reservado</option>
                  <option value="concluido">🔥 Sessão Concluída</option>
                  <option value="bloqueio">🚫 Bloqueado / Indisponível</option>
                  <option value="recusado">✕ Cancelado / Recusado</option>
                </select>
              </label>
            </div>

            {/* Data, Hora de Início, Duração e Hora de Término */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <label className="block space-y-1">
                <span className="text-zinc-300 font-bold">Data</span>
                <input
                  type="date"
                  value={editingEvent.date || cursorDate}
                  onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-zinc-300 font-bold">Início</span>
                <input
                  type="time"
                  value={editingEvent.startTime || "14:00"}
                  onChange={(e) => {
                    const st = e.target.value;
                    setEditingEvent({
                      ...editingEvent,
                      startTime: st,
                      endTime: addHoursToTime(st, Number(editingEvent.estimatedHours) || 2),
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-zinc-300 font-bold">Duração (Horas)</span>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  value={editingEvent.estimatedHours || 2}
                  onChange={(e) => {
                    const hrs = Number(e.target.value) || 1;
                    setEditingEvent({
                      ...editingEvent,
                      estimatedHours: hrs,
                      endTime: addHoursToTime(editingEvent.startTime || "14:00", hrs),
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-zinc-300 font-bold">Término</span>
                <input
                  type="time"
                  value={editingEvent.endTime || "17:00"}
                  onChange={(e) => setEditingEvent({ ...editingEvent, endTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                />
              </label>
            </div>

            {/* Dados do Cliente e da Tatuagem */}
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <label className="block space-y-1">
                <span className="text-zinc-300 font-bold">
                  {editingEvent.eventType === "bloqueio" ? "Motivo do Bloqueio" : "Nome do Cliente"}
                </span>
                <input
                  type="text"
                  value={editingEvent.clientName || ""}
                  onChange={(e) => setEditingEvent({ ...editingEvent, clientName: e.target.value })}
                  placeholder="Ex: Lucas Martins"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white font-bold"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-zinc-300 font-bold">WhatsApp do Cliente</span>
                <input
                  type="text"
                  value={editingEvent.clientWhatsapp || ""}
                  onChange={(e) =>
                    setEditingEvent({ ...editingEvent, clientWhatsapp: e.target.value })
                  }
                  placeholder="Ex: 51 99999-9999"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                />
              </label>
            </div>

            {editingEvent.eventType !== "bloqueio" && (
              <>
                <div className="grid sm:grid-cols-3 gap-3 text-xs">
                  <label className="block space-y-1">
                    <span className="text-zinc-300 font-bold">Arte / Estilo</span>
                    <input
                      type="text"
                      value={editingEvent.style || ""}
                      onChange={(e) => setEditingEvent({ ...editingEvent, style: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-zinc-300 font-bold">Tamanho (cm) & Local</span>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        value={editingEvent.sizeCm || 10}
                        onChange={(e) =>
                          setEditingEvent({ ...editingEvent, sizeCm: Number(e.target.value) })
                        }
                        className="w-16 px-2 py-2 rounded-xl bg-surface border border-wine text-white"
                      />
                      <input
                        type="text"
                        value={editingEvent.bodyPart || ""}
                        onChange={(e) =>
                          setEditingEvent({ ...editingEvent, bodyPart: e.target.value })
                        }
                        placeholder="Antebraço"
                        className="flex-1 px-2.5 py-2 rounded-xl bg-surface border border-wine text-white"
                      />
                    </div>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-zinc-300 font-bold">Valor / Sinal</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={editingEvent.priceRange || ""}
                        onChange={(e) =>
                          setEditingEvent({ ...editingEvent, priceRange: e.target.value })
                        }
                        placeholder="R$ 350"
                        className="w-1/2 px-2.5 py-2 rounded-xl bg-surface border border-wine text-white"
                      />
                      <input
                        type="text"
                        value={editingEvent.depositPaid || ""}
                        onChange={(e) =>
                          setEditingEvent({ ...editingEvent, depositPaid: e.target.value })
                        }
                        placeholder="Sinal Pago"
                        className="w-1/2 px-2.5 py-2 rounded-xl bg-surface border border-wine text-emerald-300"
                      />
                    </div>
                  </label>
                </div>

                <label className="block space-y-1 text-xs">
                  <span className="text-zinc-300 font-bold">Observações da Sessão / Agulhas / Referência</span>
                  <textarea
                    rows={2}
                    value={editingEvent.notes || ""}
                    onChange={(e) => setEditingEvent({ ...editingEvent, notes: e.target.value })}
                    placeholder="Anotações internas do Daniel..."
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>
              </>
            )}

            {/* Rodapé do Modal com Ações de Salvar e Avisar no WhatsApp */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-wine/50">
              {!isCreatingEvent ? (
                <button
                  type="button"
                  onClick={() => deleteEvent(editingEvent.id)}
                  className="px-3.5 py-2.5 rounded-xl bg-red-950/90 border border-red-500/40 text-red-300 hover:bg-red-900 text-xs font-bold"
                >
                  🗑️ Excluir da Agenda
                </button>
              ) : (
                <div />
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2.5 rounded-xl bg-surface border border-wine text-zinc-300 text-xs font-bold"
                >
                  Cancelar
                </button>
                {editingEvent.eventType !== "bloqueio" && editingEvent.clientWhatsapp && (
                  <button
                    type="button"
                    onClick={() => saveEventFromModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian font-display font-black text-xs uppercase tracking-wider"
                  >
                    💾 Salvar & Avisar no WhatsApp ↗
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => saveEventFromModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-ember to-ember-gold text-obsidian font-display font-black text-xs uppercase tracking-wider"
                >
                  💾 Salvar na Agenda
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
