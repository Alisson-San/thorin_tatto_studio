# Thórin Tattoo Studio — Barão/RS

Site institucional e portfólio interativo do **Thórin Tattoo Studio** (comandado pelo tatuador **Daniel Bourscheid** desde 2017 em Barão/RS), construído com **Next.js 14 (App Router)**, **GSAP + ScrollTrigger**, **Lenis Smooth Scroll**, **Tailwind CSS** e pipeline automatizado de processamento de imagens via **Sharp**.

---

## 🚀 Arquitetura & Pipeline de Build

- **Pipeline de Assets (`npm run assets` / `prebuild`)**:
  O script [`build-assets.mjs`](./build-assets.mjs) é executado automaticamente antes de cada `npm run build` (`prebuild`), processando as imagens de [`raw/`](./raw) com `sharp` para gerar em [`public/assets/`](./public/assets):
  - `logo-thorin.webp` & `dragon-fire-glow.webp`: Brasão oficial com canal alpha e camada de brilho quente separada.
  - `avatar-daniel.webp`: Retrato recortado do tatuador Daniel Bourscheid com remoção de fundo e *de-spill* de borda.
  - `brick-texture.webp`: Textura procedural *seamless* de tijolos bicolores com rejunte mineral para a identidade visual do estúdio.
  - `tattoo-fe.webp`: Fotografia otimizada para a vitrine e portfólio.
- **CI/CD via GitHub Actions**:
  O workflow [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) valida automaticamente em cada `push` ou `pull_request` na branch `main`:
  1. Instalação limpa (`npm ci` em Node.js 20)
  2. Compilação dos assets (`npm run assets`)
  3. Verificação estática de tipos (`npm run typecheck`)
  4. Build de produção do Next.js (`npm run build`)

---

## 💻 Desenvolvimento Local

```bash
# 1. Instalar dependências (Node.js >= 20.9.0)
npm install

# 2. Gerar/atualizar assets otimizados em public/assets
npm run assets

# 3. Iniciar servidor de desenvolvimento
npm run dev
```

- **Site principal**: `http://localhost:3000`
- **Painel Admin**: `http://localhost:3000/admin` (Senha padrão: `thorin2026` ou variável de ambiente `ADMIN_PASSWORD`)

---

## ▲ Deploy na Vercel

O repositório já está configurado com [`vercel.json`](./vercel.json), [`.nvmrc`](./.nvmrc) e `engines` no [`package.json`](./package.json):

1. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório `Alisson-San/thorin_tatto_studio`.
2. As configurações são detectadas automaticamente:
   - **Framework Preset**: `Next.js`
   - **Install Command**: `npm ci`
   - **Build Command**: `npm run build` (executa automaticamente `prebuild` → `node build-assets.mjs` seguido de `next build`)
   - **Node.js Version**: `20.x`
3. *(Opcional)* Adicione a variável de ambiente `ADMIN_PASSWORD` no painel da Vercel caso queira alterar a senha padrão do `/admin`.
