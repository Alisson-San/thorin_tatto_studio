"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [logged, setLogged] = useState(false);
  const [studio, setStudio] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [msg, setMsg] = useState("");

  // Campos para Nova Foto
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("fineline");
  const [newFeatured, setNewFeatured] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/studio")
      .then((r) => r.json())
      .then((d) => {
        setStudio(d.studio);
        setPortfolio(d.portfolio);
        setCategories(d.categories);
      });
  }, []);

  async function saveAll(updatedStudio = studio, updatedPortfolio = portfolio) {
    setMsg("Salvando...");
    const res = await fetch("/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password,
        studio: updatedStudio,
        portfolio: updatedPortfolio,
        categories,
      }),
    });
    if (res.ok) {
      setMsg("✅ Alterações salvas com sucesso!");
      setLogged(true);
    } else {
      setMsg("❌ Senha incorreta! (Padrão: thorin2026)");
    }
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
    await saveAll(studio, nextPortfolio);
  }

  function toggleFeatured(id: string) {
    const next = portfolio.map((item) =>
      item.id === id ? { ...item, featured: !item.featured } : item
    );
    setPortfolio(next);
    saveAll(studio, next);
  }

  function deleteItem(id: string) {
    const next = portfolio.filter((item) => item.id !== id);
    setPortfolio(next);
    saveAll(studio, next);
  }

  if (!studio) return <div className="p-10 text-white">Carregando Painel...</div>;

  if (!logged) {
    return (
      <div className="min-h-screen brick-wall-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border border-ember/50 rounded-2xl p-8 space-y-5 shadow-2xl">
          <h1 className="font-gothic text-4xl text-forge-gradient text-center">Thórin Admin</h1>
          <p className="text-xs text-zinc-400 text-center">
            Senha padrão para seu teste local: <strong className="text-ember-gold">thorin2026</strong>
          </p>
          <input
            type="password"
            placeholder="Digite a senha do estúdio"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="flex items-center justify-between border-b border-wine/40 pb-5">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ember-gold">
              Painel Administrativo • Thórin Tattoo
            </h1>
            <p className="text-xs text-zinc-400 mt-1">{msg}</p>
          </div>
          <a href="/" className="px-4 py-2 rounded-lg bg-surface border border-ember text-xs font-bold">
            ← Ver Site ao Vivo
          </a>
        </div>

        {/* BLOCO 1: PUBLICAR NOVA FOTO */}
        <section className="bg-surface border border-ember/40 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-ember">📸 Postar Novo Trabalho no Portfólio</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Título (ex: Leão Blackwork Antebraço)"
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
                <option key={c.id} value={c.id}>{c.label}</option>
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
          <div>
            <label className="inline-block cursor-pointer px-6 py-3 rounded-xl bg-gradient-to-r from-ember to-ember-bright text-white font-bold text-sm">
              {uploading ? "Enviando foto..." : "Selecionar Foto do Celular / PC e Publicar"}
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </section>

        {/* BLOCO 2: INFORMAÇÕES E CONTATOS DO ESTÚDIO */}
        <section className="bg-surface border border-wine/40 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold">⚙️ Informações, Agenda & Contatos</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400">Status da Agenda (Topo do Site)</label>
              <input
                value={studio.statusAgenda}
                onChange={(e) => setStudio({ ...studio, statusAgenda: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 rounded-xl bg-obsidian border border-wine text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400">WhatsApp (Apenas números c/ DDI 55)</label>
              <input
                value={studio.whatsapp}
                onChange={(e) => setStudio({ ...studio, whatsapp: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 rounded-xl bg-obsidian border border-wine text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-400">Endereço Completo</label>
              <input
                value={studio.address}
                onChange={(e) => setStudio({ ...studio, address: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 rounded-xl bg-obsidian border border-wine text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-400">Texto de Apresentação / Bio</label>
              <textarea
                rows={3}
                value={studio.bio}
                onChange={(e) => setStudio({ ...studio, bio: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 rounded-xl bg-obsidian border border-wine text-sm"
              />
            </div>
          </div>
          <button
            onClick={() => saveAll()}
            className="px-6 py-3 rounded-xl bg-ember text-white font-bold text-sm"
          >
            Salvar Informações do Estúdio
          </button>
        </section>

        {/* BLOCO 3: GERENCIAR FOTOS POSTADAS */}
        <section className="bg-surface border border-wine/40 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold">🖼️ Fotos Publicadas ({portfolio.length})</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {portfolio.map((item) => (
              <div key={item.id} className="rounded-xl bg-obsidian border border-wine/40 p-3 space-y-3">
                <img src={item.imageUrl} alt={item.title} className="w-full h-48 object-cover rounded-lg" />
                <p className="font-semibold text-sm">{item.title}</p>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => toggleFeatured(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      item.featured ? "bg-ember text-white" : "bg-surface border border-wine text-zinc-400"
                    }`}
                  >
                    {item.featured ? "🔥 Em Destaque" : "Destacar"}
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-950/60 text-red-300 text-xs font-bold"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
