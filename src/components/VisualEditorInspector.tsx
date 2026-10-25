"use client";

import React, { useEffect, useState } from "react";

export type EditableBlockId =
  | null
  | "header"
  | "hero-content"
  | "hero-stage"
  | "marquees"
  | "manifesto"
  | "essence"
  | "pillars"
  | "featured-header"
  | "gallery-header"
  | "portfolio-item"
  | "contact";

interface VisualEditorInspectorProps {
  isAdminLogged: boolean;
  isEditMode: boolean;
  previewClean: boolean;
  activeBlock: EditableBlockId;
  activePortfolioId: string | null;
  isNewPortfolioDraft: boolean;
  data: any;
  hasUnsavedChanges: boolean;
  saving: boolean;
  statusMessage: string;
  onLogin: (pwd: string) => Promise<boolean>;
  onToggleEditMode: (enabled: boolean) => void;
  onTogglePreviewClean: (clean: boolean) => void;
  onSelectBlock: (block: EditableBlockId, portfolioId?: string | null) => void;
  onUpdateStudio: (partial: Record<string, any>) => void;
  onUpdateCategories: (nextCategories: any[]) => void;
  onUpdatePortfolioItem: (id: string, partial: Record<string, any>) => void;
  onDeletePortfolioItem: (id: string) => void;
  onMovePortfolioItem: (id: string, direction: "up" | "down") => void;
  onStartNewPortfolioItem: (featuredDefault?: boolean) => void;
  onConfirmChanges: () => Promise<void>;
  onRevertBlock: () => void;
  onRevertAll: () => void;
  onLogout: () => void;
}

export default function VisualEditorInspector({
  isAdminLogged,
  isEditMode,
  previewClean,
  activeBlock,
  activePortfolioId,
  isNewPortfolioDraft,
  data,
  hasUnsavedChanges,
  saving,
  statusMessage,
  onLogin,
  onToggleEditMode,
  onTogglePreviewClean,
  onSelectBlock,
  onUpdateStudio,
  onUpdateCategories,
  onUpdatePortfolioItem,
  onDeletePortfolioItem,
  onMovePortfolioItem,
  onStartNewPortfolioItem,
  onConfirmChanges,
  onRevertBlock,
  onRevertAll,
  onLogout,
}: VisualEditorInspectorProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [newCatLabel, setNewCatLabel] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && !isAdminLogged) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("edit") === "1") {
        setShowLoginModal(true);
      }
    }
  }, [isAdminLogged]);

  const { studio, categories = [], portfolio = [] } = data || {};
  const activePortfolioItem = portfolio.find((p: any) => p.id === activePortfolioId) || null;

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const ok = await onLogin(pwdInput);
    if (ok) {
      setShowLoginModal(false);
      setPwdInput("");
    } else {
      setLoginError("Senha incorreta! (Padrão: thorin2026)");
    }
  }

  async function uploadImageAndApply(
    e: React.ChangeEvent<HTMLInputElement>,
    fieldKey: string,
    onUrlReady: (url: string) => void
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview instantâneo local com ObjectURL enquanto envia para o servidor
    const localPreviewUrl = URL.createObjectURL(file);
    onUrlReady(localPreviewUrl);

    setUploadingField(fieldKey);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.url) {
        onUrlReady(json.url);
      }
    } catch {
      // Mantém o preview se falhar
    } finally {
      setUploadingField(null);
    }
  }

  const pillars = studio?.pillars || [
    {
      roman: "I",
      tag: "VERSATILIDADE TÉCNICA",
      title: "Domínio do Fine Line ao Blackwork Sólido",
      desc: "Caligrafias delicadas como o 'Fé' com cruz em traço fino ou fechamentos sombreados de alto impacto: cada agulha e composição são pensadas para a anatomia do seu corpo.",
    },
    {
      roman: "II",
      tag: "RIGOR & SEGURANÇA",
      title: "Biossegurança & Pigmentos de Alta Performance",
      desc: "Materiais 100% descartáveis, bancada esterilizada a cada sessão e tintas de altíssima estabilidade para garantir cicatrização limpa e contraste duradouro ao longo dos anos.",
    },
    {
      roman: "III",
      tag: "ATENDIMENTO EXCLUSIVO • SALA 303",
      title: "Sessões Individuais no Centro de Barão",
      desc: `Localizado em ${studio?.address || ""}. Um estúdio reservado, climatizado e preparado para desenvolver sua ideia com tranquilidade.`,
    },
  ];

  function updatePillar(idx: number, partial: Record<string, any>) {
    const next = pillars.map((p: any, i: number) => (i === idx ? { ...p, ...partial } : p));
    onUpdateStudio({ pillars: next });
  }

  function addPillar() {
    const romans = ["I", "II", "III", "IV", "V", "VI"];
    const next = [
      ...pillars,
      {
        roman: romans[pillars.length] || String(pillars.length + 1),
        tag: "NOVO PILAR",
        title: "Título do Diferencial",
        desc: "Descreva como esse diferencial aparece no estúdio.",
      },
    ];
    onUpdateStudio({ pillars: next });
  }

  function removePillar(idx: number) {
    const next = pillars.filter((_: any, i: number) => i !== idx);
    onUpdateStudio({ pillars: next });
  }

  function addCategory() {
    if (!newCatLabel.trim()) return;
    const id = newCatLabel
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-");
    onUpdateCategories([...categories, { id, label: newCatLabel.trim() }]);
    setNewCatLabel("");
  }

  return (
    <>
      {/* =====================================================================
          MODAL DE LOGIN RÁPIDO NA HOME (CASO NÃO AUTENTICADO AINDA)
      ====================================================================== */}
      {showLoginModal && !isAdminLogged && (
        <div
          onClick={() => setShowLoginModal(false)}
          className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleLoginSubmit}
            className="w-full max-w-md bg-obsidian border border-ember/60 rounded-2xl p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.95)] space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-display font-bold uppercase tracking-[0.28em] text-ember-gold">
                Modo Administrador Visual
              </span>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <h3 className="font-gothic text-3xl text-forge-gradient">
              Ativar Edição na Página
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Digite a senha do painel (padrão: <strong className="text-ember-gold">thorin2026</strong>) para clicar e editar qualquer texto, bloco ou foto diretamente nesta página com pré-visualização em tempo real.
            </p>
            <input
              type="password"
              placeholder="Senha do administrador..."
              value={pwdInput}
              onChange={(e) => setPwdInput(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-surface border border-wine focus:border-ember outline-none text-white text-sm"
            />
            {loginError && <p className="text-xs text-red-400 font-semibold">{loginError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-ember to-ember-gold text-obsidian font-display font-black text-xs uppercase tracking-wider"
              >
                Ativar Editor Visual ↗
              </button>
              <a
                href="/admin"
                className="px-4 py-3 rounded-xl bg-surface border border-wine/60 text-zinc-200 hover:text-white text-xs font-display font-bold uppercase tracking-wider flex items-center"
              >
                Painel Completo
              </a>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          BARRA FLUTUANTE DO EDITOR VISUAL (QUANDO ADMIN ESTÁ LOGADO)
      ====================================================================== */}
      {isAdminLogged && (
        <div className="fixed bottom-4 left-4 right-20 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-[105] max-w-4xl w-auto">
          <div className="rounded-2xl bg-obsidian/95 backdrop-blur-xl border-2 border-ember shadow-[0_20px_60px_rgba(0,0,0,0.95)] px-3.5 py-2.5 sm:px-5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isEditMode && !previewClean ? "bg-emerald-400 animate-ping" : "bg-amber-400"
                }`}
              />
              <div>
                <p className="font-display text-[10px] sm:text-xs font-black uppercase tracking-wider text-white">
                  {isEditMode
                    ? previewClean
                      ? "👁️ Visualizando Limpo (Sem Bordas)"
                      : "✏️ Modo Editor Visual Ativo"
                    : "🔒 Modo Admin Conectado"}
                </p>
                <p className="text-[10px] text-ember-gold hidden sm:block">
                  {statusMessage ||
                    (isEditMode
                      ? "Clique em qualquer bloco, texto ou foto na página para editar ao vivo"
                      : "Ative o Editor Visual para alterar os blocos direto na tela")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => onToggleEditMode(!isEditMode)}
                className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider transition-all ${
                  isEditMode
                    ? "bg-surface border border-ember/50 text-ember-gold hover:bg-wine/40"
                    : "bg-gradient-to-r from-ember to-ember-gold text-obsidian font-black"
                }`}
              >
                {isEditMode ? "Pausar Bordas" : "✏️ Editar Página"}
              </button>

              {isEditMode && (
                <>
                  <button
                    type="button"
                    onClick={() => onStartNewPortfolioItem(false)}
                    className="px-3 py-1.5 rounded-xl bg-wine hover:bg-ember text-white text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider transition-colors"
                  >
                    + Nova Foto
                  </button>

                  <button
                    type="button"
                    onClick={() => onTogglePreviewClean(!previewClean)}
                    className={`px-3 py-1.5 rounded-xl border text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider transition-colors ${
                      previewClean
                        ? "bg-ember-gold text-obsidian border-ember-gold"
                        : "bg-obsidian border-wine text-zinc-200 hover:border-ember"
                    }`}
                  >
                    {previewClean ? "Voltar a Editar" : "👁️ Ver Limpo"}
                  </button>
                </>
              )}

              {hasUnsavedChanges && (
                <>
                  <button
                    type="button"
                    onClick={onRevertAll}
                    className="px-2.5 py-1.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider hover:bg-red-900"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={onConfirmChanges}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-obsidian font-display font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30"
                  >
                    {saving ? "Salvando..." : "✅ Confirmar Alterações"}
                  </button>
                </>
              )}

              <a
                href="/admin"
                className="px-2.5 py-1.5 rounded-xl bg-surface border border-wine/60 text-zinc-300 hover:text-white text-[10px] sm:text-xs font-display font-bold uppercase"
              >
                Painel
              </a>
              <button
                type="button"
                onClick={onLogout}
                title="Sair do modo administrador"
                className="px-2 py-1.5 rounded-xl bg-obsidian border border-wine/40 text-zinc-400 hover:text-red-400 text-[10px]"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          INSPETOR LATERAL AO VIVO (EDITA E MOSTRA NA PÁGINA EM TEMPO REAL)
      ====================================================================== */}
      {isAdminLogged && isEditMode && activeBlock && (
        <aside className="fixed top-20 right-3 sm:right-5 bottom-20 z-[110] w-[calc(100vw-24px)] sm:w-[400px] bg-obsidian/95 backdrop-blur-xl border-2 border-ember/80 rounded-2xl shadow-[0_25px_90px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden">
          {/* Cabeçalho do Inspetor */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-surface via-wine-dark/50 to-surface border-b border-ember/40 flex items-center justify-between gap-2">
            <div>
              <span className="text-[9px] font-display font-bold uppercase tracking-[0.25em] text-ember-gold block">
                Edição em Tempo Real • Pré-visualização Ativa
              </span>
              <h3 className="font-display text-sm sm:text-base font-black text-white">
                {activeBlock === "header" && "Barra de Topo & Logo"}
                {activeBlock === "hero-content" && "Bloco Principal (Hero)"}
                {activeBlock === "hero-stage" && "Foto do Tatuador & Brasão"}
                {activeBlock === "marquees" && "Faixas Cruzadas em Movimento"}
                {activeBlock === "manifesto" && "Frase do Manifesto"}
                {activeBlock === "essence" && "Card: A Essência Thórin"}
                {activeBlock === "pillars" && "Pilares do Estúdio (I, II, III)"}
                {activeBlock === "featured-header" && "Título de Obras em Destaque"}
                {activeBlock === "gallery-header" && "Título & Categorias do Portfólio"}
                {activeBlock === "portfolio-item" &&
                  (isNewPortfolioDraft ? "✨ Nova Obra no Portfólio" : "Editar Obra do Portfólio")}
                {activeBlock === "contact" && "Bloco de Contato & Endereço"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onSelectBlock(null)}
              className="w-8 h-8 rounded-lg bg-obsidian border border-wine/60 text-zinc-300 hover:text-white flex items-center justify-center text-sm"
            >
              ✕
            </button>
          </div>

          {/* Corpo com Campos que Atualizam a Página Instantaneamente */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            <div className="p-2.5 rounded-xl bg-ember/10 border border-ember/30 text-ember-gold text-[11px] leading-relaxed">
              💡 Tudo o que você digitar ou enviar abaixo <strong>já preenche o bloco na página ao vivo</strong>. Confira o resultado visual e clique em <strong>Confirmar</strong> abaixo!
            </div>

            {/* 1. HEADER */}
            {activeBlock === "header" && (
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Ano de Fundação (Menu & Selos)</span>
                  <input
                    type="text"
                    value={studio.since || ""}
                    onChange={(e) => onUpdateStudio({ since: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>
                <div className="space-y-1.5">
                  <span className="text-zinc-300 font-bold block">Logo Oficial (Menu & Brasão)</span>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface border border-wine/50">
                    <img
                      src={studio.logoUrl}
                      alt="Logo preview"
                      className="w-12 h-12 object-contain bg-obsidian rounded-lg p-1 border border-ember/30"
                    />
                    <label className="flex-1 cursor-pointer py-2 px-3 rounded-xl bg-ember text-obsidian font-display font-black text-center uppercase tracking-wider">
                      {uploadingField === "logoUrl" ? "Enviando..." : "📷 Trocar Imagem da Logo"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          uploadImageAndApply(e, "logoUrl", (url) => onUpdateStudio({ logoUrl: url }))
                        }
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* 3. HERO CONTENT */}
            {activeBlock === "hero-content" && (
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Selo de Status da Agenda</span>
                  <input
                    type="text"
                    value={studio.statusAgenda || ""}
                    onChange={(e) => onUpdateStudio({ statusAgenda: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Selo de Cidade / Sala</span>
                  <input
                    type="text"
                    value={studio.locationBadge ?? "Barão / RS • Sala 303"}
                    onChange={(e) => onUpdateStudio({ locationBadge: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Subtítulo Acima do Nome</span>
                  <input
                    type="text"
                    value={studio.heroKicker ?? `Estúdio de Tatuagem Autoral • Desde ${studio.since}`}
                    onChange={(e) => onUpdateStudio({ heroKicker: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Nome Principal (Título Gótico)</span>
                  <input
                    type="text"
                    value={studio.name || ""}
                    onChange={(e) => onUpdateStudio({ name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <span className="text-zinc-300 font-bold">Slogan (Parte Branca)</span>
                    <input
                      type="text"
                      value={studio.heroTagline ?? "TRAÇO PRECISO, PERSONALIDADE E"}
                      onChange={(e) => onUpdateStudio({ heroTagline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-zinc-300 font-bold">Slogan (Destaque Ouro)</span>
                    <input
                      type="text"
                      value={studio.heroTaglineAccent ?? "ARTE NA PELE."}
                      onChange={(e) => onUpdateStudio({ heroTaglineAccent: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-ember-gold"
                    />
                  </label>
                </div>

                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Texto de Apresentação (Bio)</span>
                  <textarea
                    rows={4}
                    value={studio.bio || ""}
                    onChange={(e) => onUpdateStudio({ bio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <label className="block space-y-1">
                    <span className="text-zinc-400 text-[10px] font-bold">Fundação</span>
                    <input
                      type="text"
                      value={studio.since || ""}
                      onChange={(e) => onUpdateStudio({ since: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl bg-surface border border-wine text-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-zinc-400 text-[10px] font-bold">Publicações</span>
                    <input
                      type="text"
                      value={studio.postsCount || ""}
                      onChange={(e) => onUpdateStudio({ postsCount: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl bg-surface border border-wine text-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-zinc-400 text-[10px] font-bold">Seguidores</span>
                    <input
                      type="text"
                      value={studio.followersCount || ""}
                      onChange={(e) => onUpdateStudio({ followersCount: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-xl bg-surface border border-wine text-white"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 4. HERO STAGE (FOTO DO TATUADOR & BRASÃO) */}
            {activeBlock === "hero-stage" && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-surface border border-wine/60 space-y-2.5">
                  <span className="text-zinc-200 font-bold block">Foto Principal do Tatuador (Palco)</span>
                  <div className="flex items-center gap-3">
                    <img
                      src={studio.avatarUrl}
                      alt={studio.artist}
                      className="w-16 h-20 object-contain bg-obsidian rounded-xl border border-ember/40 p-1"
                    />
                    <div className="flex-1 space-y-2">
                      <label className="block cursor-pointer py-2.5 px-3 rounded-xl bg-gradient-to-r from-ember to-ember-gold text-obsidian font-display font-black text-center uppercase tracking-wider">
                        {uploadingField === "avatarUrl" ? "Carregando..." : "📷 Enviar Nova Foto"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            uploadImageAndApply(e, "avatarUrl", (url) => onUpdateStudio({ avatarUrl: url }))
                          }
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        placeholder="Ou cole a URL da imagem..."
                        value={studio.avatarUrl || ""}
                        onChange={(e) => onUpdateStudio({ avatarUrl: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-obsidian border border-wine text-[11px] text-zinc-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-surface border border-wine/60 space-y-2.5">
                  <span className="text-zinc-200 font-bold block">Brasão / Dragão Atrás do Tatuador</span>
                  <div className="flex items-center gap-3">
                    <img
                      src={studio.logoUrl}
                      alt="Brasão"
                      className="w-16 h-16 object-contain bg-obsidian rounded-xl border border-ember/40 p-1"
                    />
                    <label className="flex-1 cursor-pointer py-2.5 px-3 rounded-xl bg-wine hover:bg-ember text-white font-display font-bold text-center uppercase tracking-wider transition-colors">
                      {uploadingField === "logoUrl" ? "Carregando..." : "📷 Trocar Brasão"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          uploadImageAndApply(e, "logoUrl", (url) => onUpdateStudio({ logoUrl: url }))
                        }
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Título no Plinto (Abaixo da Foto)</span>
                  <input
                    type="text"
                    value={studio.artistRole ?? "Tatuador & Fundador"}
                    onChange={(e) => onUpdateStudio({ artistRole: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Nome do Tatuador</span>
                  <input
                    type="text"
                    value={studio.artist || ""}
                    onChange={(e) => onUpdateStudio({ artist: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Instagram do Tatuador (sem @)</span>
                  <input
                    type="text"
                    value={studio.instagramArtist || ""}
                    onChange={(e) => onUpdateStudio({ instagramArtist: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>
              </div>
            )}

            {/* 5. MARQUEES */}
            {activeBlock === "marquees" && (
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Especialidades na Faixa 1</span>
                  <input
                    type="text"
                    value={studio.marqueeSpecialties ?? "BLACKWORK • FINE LINE • SOMBREADO"}
                    onChange={(e) => onUpdateStudio({ marqueeSpecialties: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Destaque na Faixa 2 (Laranja)</span>
                  <input
                    type="text"
                    value={studio.marqueeHighlight ?? "DANIEL BOURSCHEID • TRAÇO EXCLUSIVO"}
                    onChange={(e) => onUpdateStudio({ marqueeHighlight: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Complemento na Faixa 2</span>
                  <input
                    type="text"
                    value={studio.marqueeSub ?? "• SESSÕES EXCLUSIVAS COM HORA MARCADA"}
                    onChange={(e) => onUpdateStudio({ marqueeSub: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>
              </div>
            )}

            {/* 6. MANIFESTO */}
            {activeBlock === "manifesto" && (
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Selo Acima do Manifesto</span>
                  <input
                    type="text"
                    value={studio.manifestoBadge ?? `Assinatura & Identidade • Desde ${studio.since}`}
                    onChange={(e) => onUpdateStudio({ manifestoBadge: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Frase Completa do Manifesto</span>
                  <textarea
                    rows={4}
                    value={
                      studio.manifestoText ??
                      "MAIS DO QUE TINTA SOBRE A PELE. CRIAMOS IDENTIDADE, MEMÓRIA E ARTE AUTORAL COM PRECISÃO EM CADA TRAÇO."
                    }
                    onChange={(e) => onUpdateStudio({ manifestoText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>
              </div>
            )}

            {/* 7. ESSENCE CARD */}
            {activeBlock === "essence" && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-surface border border-wine/60 space-y-2">
                  <span className="text-zinc-200 font-bold block">Imagem Central do Card</span>
                  <div className="flex items-center gap-3">
                    <img
                      src={studio.essenceImageUrl || studio.logoUrl}
                      alt="Essência"
                      className="w-16 h-16 object-contain bg-obsidian rounded-xl border border-ember/40 p-1"
                    />
                    <label className="flex-1 cursor-pointer py-2.5 px-3 rounded-xl bg-ember text-obsidian font-display font-black text-center uppercase tracking-wider">
                      {uploadingField === "essenceImageUrl" ? "Carregando..." : "📷 Trocar Imagem"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          uploadImageAndApply(e, "essenceImageUrl", (url) =>
                            onUpdateStudio({ essenceImageUrl: url })
                          )
                        }
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Título do Card</span>
                  <input
                    type="text"
                    value={studio.essenceTitle ?? "A Essência Thórin"}
                    onChange={(e) => onUpdateStudio({ essenceTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Texto da Essência</span>
                  <textarea
                    rows={4}
                    value={
                      studio.essenceText ??
                      `Assim como o lendário mestre artesão que inspira nosso nome, tratamos cada tatuagem como uma obra única — unindo dedicação ao detalhe, traço firme e mais de ${studio.postsCount} trabalhos compartilhados.`
                    }
                    onChange={(e) => onUpdateStudio({ essenceText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>
              </div>
            )}

            {/* 8. PILLARS */}
            {activeBlock === "pillars" && (
              <div className="space-y-4">
                {pillars.map((pillar: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-surface border border-wine/70 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-ember-gold">
                        Pilar #{idx + 1} ({pillar.roman})
                      </span>
                      {pillars.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePillar(idx)}
                          className="text-red-400 hover:text-red-300 text-[11px]"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={pillar.roman || ""}
                        onChange={(e) => updatePillar(idx, { roman: e.target.value })}
                        placeholder="I, II..."
                        className="px-2.5 py-1.5 rounded-lg bg-obsidian border border-wine text-white"
                      />
                      <input
                        type="text"
                        value={pillar.tag || ""}
                        onChange={(e) => updatePillar(idx, { tag: e.target.value })}
                        placeholder="Tag superior"
                        className="col-span-2 px-2.5 py-1.5 rounded-lg bg-obsidian border border-wine text-ember-gold"
                      />
                    </div>
                    <input
                      type="text"
                      value={pillar.title || ""}
                      onChange={(e) => updatePillar(idx, { title: e.target.value })}
                      placeholder="Título do pilar"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-obsidian border border-wine text-white font-bold"
                    />
                    <textarea
                      rows={3}
                      value={pillar.desc || ""}
                      onChange={(e) => updatePillar(idx, { desc: e.target.value })}
                      placeholder="Descrição..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-obsidian border border-wine text-zinc-200"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPillar}
                  className="w-full py-2.5 rounded-xl bg-wine/60 hover:bg-ember text-white font-display font-bold uppercase tracking-wider transition-colors"
                >
                  + Adicionar Novo Bloco de Pilar
                </button>
              </div>
            )}

            {/* 9. FEATURED HEADER */}
            {activeBlock === "featured-header" && (
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Subtítulo Superior</span>
                  <input
                    type="text"
                    value={studio.featuredSubtitle ?? "Seleção de Trabalhos • Vitrine Interativa"}
                    onChange={(e) => onUpdateStudio({ featuredSubtitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Título da Seção</span>
                  <input
                    type="text"
                    value={studio.featuredTitle ?? "OBRAS EM DESTAQUE"}
                    onChange={(e) => onUpdateStudio({ featuredTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onStartNewPortfolioItem(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-ember to-ember-gold text-obsidian font-display font-black uppercase tracking-wider"
                >
                  + Adicionar Nova Obra em Destaque
                </button>
              </div>
            )}

            {/* 10. GALLERY HEADER & CATEGORIAS */}
            {activeBlock === "gallery-header" && (
              <div className="space-y-4">
                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Subtítulo da Galeria</span>
                  <input
                    type="text"
                    value={studio.gallerySubtitle ?? "Galeria de Trabalhos"}
                    onChange={(e) => onUpdateStudio({ gallerySubtitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Título da Galeria</span>
                  <input
                    type="text"
                    value={studio.galleryTitle ?? "PORTFÓLIO DO ESTÚDIO"}
                    onChange={(e) => onUpdateStudio({ galleryTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>

                <div className="p-3 rounded-xl bg-surface border border-wine/60 space-y-2">
                  <span className="font-bold text-ember-gold block">Categorias de Filtro</span>
                  {categories.map((cat: any, i: number) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={cat.label}
                        onChange={(e) => {
                          const next = categories.map((c: any, idx: number) =>
                            idx === i ? { ...c, label: e.target.value } : c
                          );
                          onUpdateCategories(next);
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-obsidian border border-wine text-white"
                      />
                      {categories.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateCategories(categories.filter((_: any, idx: number) => idx !== i))
                          }
                          className="px-2 py-1 rounded bg-red-950 text-red-300"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Nova categoria..."
                      value={newCatLabel}
                      onChange={(e) => setNewCatLabel(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-obsidian border border-wine text-white"
                    />
                    <button
                      type="button"
                      onClick={addCategory}
                      className="px-3 py-1.5 rounded-lg bg-ember text-obsidian font-bold"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 11. PORTFOLIO ITEM (EDITAR OU NOVA FOTO COM PREVIEW NO CARD) */}
            {activeBlock === "portfolio-item" && activePortfolioItem && (
              <div className="space-y-3.5">
                <div className="p-3 rounded-xl bg-surface border border-ember/50 space-y-2.5">
                  <span className="text-zinc-200 font-bold block">
                    Fotografia da Tatuagem (Pré-visualizando no Card)
                  </span>
                  <div className="flex items-center gap-3">
                    <img
                      src={activePortfolioItem.imageUrl}
                      alt={activePortfolioItem.title}
                      className="w-20 h-24 object-cover rounded-xl border border-ember/50 bg-obsidian"
                    />
                    <div className="flex-1 space-y-2">
                      <label className="block cursor-pointer py-2.5 px-3 rounded-xl bg-gradient-to-r from-ember to-ember-gold text-obsidian font-display font-black text-center uppercase tracking-wider">
                        {uploadingField === "portfolioImg" ? "Enviando..." : "📷 Escolher Foto"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            uploadImageAndApply(e, "portfolioImg", (url) =>
                              onUpdatePortfolioItem(activePortfolioItem.id, { imageUrl: url })
                            )
                          }
                          className="hidden"
                        />
                      </label>
                      <input
                        type="text"
                        placeholder="Ou cole a URL da imagem..."
                        value={activePortfolioItem.imageUrl || ""}
                        onChange={(e) =>
                          onUpdatePortfolioItem(activePortfolioItem.id, { imageUrl: e.target.value })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-obsidian border border-wine text-[11px] text-zinc-300"
                      />
                    </div>
                  </div>
                </div>

                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Título da Obra</span>
                  <input
                    type="text"
                    value={activePortfolioItem.title || ""}
                    onChange={(e) =>
                      onUpdatePortfolioItem(activePortfolioItem.id, { title: e.target.value })
                    }
                    placeholder="Ex: Fechamento de Braço Blackwork"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white font-bold"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Categoria</span>
                  <select
                    value={activePortfolioItem.category || "fineline"}
                    onChange={(e) =>
                      onUpdatePortfolioItem(activePortfolioItem.id, { category: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  >
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.label} ({c.id})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-wine cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(activePortfolioItem.featured)}
                    onChange={(e) =>
                      onUpdatePortfolioItem(activePortfolioItem.id, { featured: e.target.checked })
                    }
                  />
                  <span className="font-bold text-ember-gold">
                    🔥 Exibir também na Vitrine de Destaques
                  </span>
                </label>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onMovePortfolioItem(activePortfolioItem.id, "up")}
                    className="flex-1 py-2 rounded-xl bg-surface border border-wine hover:border-ember text-zinc-200 font-bold"
                  >
                    ↑ Mover p/ Início
                  </button>
                  <button
                    type="button"
                    onClick={() => onMovePortfolioItem(activePortfolioItem.id, "down")}
                    className="flex-1 py-2 rounded-xl bg-surface border border-wine hover:border-ember text-zinc-200 font-bold"
                  >
                    ↓ Mover p/ Final
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePortfolioItem(activePortfolioItem.id)}
                    className="px-3 py-2 rounded-xl bg-red-950/90 border border-red-500/40 text-red-300 hover:bg-red-900 font-bold"
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            )}

            {/* 12. CONTACT */}
            {activeBlock === "contact" && (
              <div className="space-y-3">
                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Título de Chamada</span>
                  <input
                    type="text"
                    value={studio.contactTitle ?? "PRONTO PARA ETERNIZAR SUA PRÓXIMA TATTOO?"}
                    onChange={(e) => onUpdateStudio({ contactTitle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Texto de Convite</span>
                  <textarea
                    rows={3}
                    value={
                      studio.contactText ??
                      "Traga sua referência ou ideia para desenvolvermos um projeto exclusivo. Atendimento com hora marcada no Centro de Barão."
                    }
                    onChange={(e) => onUpdateStudio({ contactText: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">Endereço Completo</span>
                  <input
                    type="text"
                    value={studio.address || ""}
                    onChange={(e) => onUpdateStudio({ address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-zinc-300 font-bold">WhatsApp (com DDI 55 + DDD)</span>
                  <input
                    type="text"
                    value={studio.whatsapp || ""}
                    onChange={(e) => onUpdateStudio({ whatsapp: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1">
                    <span className="text-zinc-300 font-bold">Instagram Estúdio</span>
                    <input
                      type="text"
                      value={studio.instagramStudio || ""}
                      onChange={(e) => onUpdateStudio({ instagramStudio: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-zinc-300 font-bold">Instagram Tatuador</span>
                    <input
                      type="text"
                      value={studio.instagramArtist || ""}
                      onChange={(e) => onUpdateStudio({ instagramArtist: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-wine text-white"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Rodapé do Inspetor: Confirmar ou Reverter Bloco */}
          <div className="p-3.5 bg-surface border-t border-ember/40 flex items-center gap-2">
            <button
              type="button"
              onClick={onRevertBlock}
              className="px-3.5 py-2.5 rounded-xl bg-obsidian border border-wine hover:border-red-500 text-zinc-300 hover:text-white font-display font-bold text-[11px] uppercase tracking-wider"
            >
              ↩️ Reverter Bloco
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onConfirmChanges}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-obsidian font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 hover:brightness-110 transition-all"
            >
              {saving ? "Salvando..." : "✅ Confirmar Alteração"}
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
