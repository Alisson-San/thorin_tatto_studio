"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import TattooAssistantWidget from "@/components/TattooAssistantWidget";

const MANIFESTO_WORDS = [
  "MAIS",
  "DO",
  "QUE",
  "TINTA",
  "SOBRE",
  "A",
  "PELE.",
  "CRIAMOS",
  "IDENTIDADE,",
  "MEMÓRIA",
  "E",
  "ARTE",
  "AUTORAL",
  "COM",
  "PRECISÃO",
  "EM",
  "CADA",
  "TRAÇO.",
];

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [booted, setBooted] = useState(false);
  const [filter, setFilter] = useState("all");
  const [selectedTattoo, setSelectedTattoo] = useState<any>(null);

  // Refs p/ animações 60fps sem re-render do React
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const preloaderRef = useRef<HTMLDivElement | null>(null);
  const preloaderBarRef = useRef<HTMLDivElement | null>(null);
  const preloaderPctRef = useRef<HTMLSpanElement | null>(null);

  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const cursorDotRef = useRef<HTMLDivElement | null>(null);
  const cursorRingRef = useRef<HTMLDivElement | null>(null);
  const cursorTextRef = useRef<HTMLSpanElement | null>(null);

  const scrollBarRef = useRef<HTMLDivElement | null>(null);
  const scrollPctRef = useRef<HTMLSpanElement | null>(null);

  const heroSectionRef = useRef<HTMLElement | null>(null);
  const runeRingRef = useRef<HTMLDivElement | null>(null);
  const dragonLayerRef = useRef<HTMLDivElement | null>(null);
  const portraitLayerRef = useRef<HTMLDivElement | null>(null);
  const monumentTextLeftRef = useRef<HTMLDivElement | null>(null);
  const monumentTextRightRef = useRef<HTMLDivElement | null>(null);

  const marqueeLeftRef = useRef<HTMLDivElement | null>(null);
  const marqueeRightRef = useRef<HTMLDivElement | null>(null);
  const manifestoSectionRef = useRef<HTMLElement | null>(null);
  const horizontalSectionRef = useRef<HTMLElement | null>(null);
  const horizontalTrackRef = useRef<HTMLDivElement | null>(null);
  const horizontalProgressRef = useRef<HTMLDivElement | null>(null);
  const slideCounterBgRef = useRef<HTMLDivElement | null>(null);
  const slideCounterHudRef = useRef<HTMLSpanElement | null>(null);
  const galleryGridRef = useRef<HTMLDivElement | null>(null);

  // Helper de Cursor via DOM Direto (Zero React Re-render no hover)
  const setCursorMode = useCallback((label: string) => {
    const ring = cursorRingRef.current;
    const text = cursorTextRef.current;
    if (!ring || !text) return;
    text.textContent = label;
    if (label) {
      ring.className =
        "hidden lg:flex fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[69] items-center justify-center rounded-full border transition-[width,height,background-color,border-color] duration-200 w-24 h-24 bg-ember/90 border-ember-gold text-obsidian shadow-[0_0_30px_rgba(234,88,12,0.55)]";
    } else {
      ring.className =
        "hidden lg:flex fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[69] items-center justify-center rounded-full border transition-[width,height,background-color,border-color] duration-200 w-10 h-10 border-ember/45 bg-ember/5 text-transparent";
    }
  }, []);

  // 1. Carrega dados do estúdio
  useEffect(() => {
    fetch("/api/studio")
      .then((r) => r.json())
      .then((res) => {
        setData(res);
      });
  }, []);

  // 2. Contador do Preloader Cinematográfico (DOM direto sem re-render a cada frame)
  useEffect(() => {
    const obj = { val: 0 };
    gsap.to(obj, {
      val: 100,
      duration: 1.25,
      ease: "power3.inOut",
      onUpdate: () => {
        const v = Math.round(obj.val);
        if (preloaderBarRef.current) preloaderBarRef.current.style.width = `${v}%`;
        if (preloaderPctRef.current) preloaderPctRef.current.textContent = `${v}%`;
      },
      onComplete: () => setBooted(true),
    });
  }, []);

  // 3. Re-anima cards da galeria ao trocar filtro
  useEffect(() => {
    if (!booted || !galleryGridRef.current) return;
    const cards = galleryGridRef.current.querySelectorAll(".vault-card");
    if (!cards.length) return;
    gsap.fromTo(
      cards,
      { y: 24, opacity: 0, scale: 0.97 },
      { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.05, ease: "power3.out", overwrite: true }
    );
  }, [filter, booted]);

  // 4. Orquestração Principal de Motion 60fps (GSAP + Lenis + GPU QuickTo)
  useEffect(() => {
    if (!data || !booted) return;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const isMobile = window.innerWidth < 1024;
    let lenis: Lenis | null = null;
    let onScrollMobile: (() => void) | null = null;

    const updateScrollHud = (scrollY: number) => {
      const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
      const pct = Math.min(100, Math.max(0, Math.round((scrollY / maxScroll) * 100)));
      if (scrollBarRef.current) scrollBarRef.current.style.height = `${pct}%`;
      if (scrollPctRef.current) scrollPctRef.current.textContent = `${String(pct).padStart(2, "0")}%`;
    };

    if (!isMobile) {
      lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
      lenis.on("scroll", (e: any) => {
        ScrollTrigger.update();
        updateScrollHud(e.scroll);
      });
    } else {
      onScrollMobile = () => updateScrollHud(window.scrollY);
      window.addEventListener("scroll", onScrollMobile, { passive: true });
    }

    const totalFeatured = data.portfolio?.filter((i: any) => i.featured)?.length || 1;

    const ctxGsap = gsap.context(() => {
      // A. Cortina do Preloader + Entrada Coreografada
      const tl = gsap.timeline();
      if (preloaderRef.current) {
        tl.to(preloaderRef.current, {
          clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
          duration: 0.9,
          ease: "power4.inOut",
          onComplete: () => {
            if (preloaderRef.current) preloaderRef.current.style.display = "none";
          },
        });
      }

      tl.fromTo(
        ".hero-editorial-item",
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.85, stagger: 0.08, ease: "power3.out" },
        "-=0.45"
      )
        .fromTo(
          ".hero-rune-layer",
          { scale: 0.82, opacity: 0, rotate: -20 },
          { scale: 1, opacity: 1, rotate: 0, duration: 1.2, ease: "expo.out" },
          "-=0.9"
        )
        .fromTo(
          ".hero-crest-layer",
          { scale: 1.18, opacity: 0 },
          { scale: 1, opacity: 1, duration: 1.15, ease: "expo.out" },
          "-=1.05"
        )
        .fromTo(
          ".hero-portrait-layer",
          { y: 40, scale: 0.95, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, duration: 1.1, ease: "power4.out" },
          "-=0.95"
        );

      // B. Parallax Multi-Plano na Hero durante o Scroll (Apenas Desktop p/ manter o palco mobile sempre alinhado)
      if (heroSectionRef.current) {
        if (!isMobile) {
          if (dragonLayerRef.current) {
            gsap.to(dragonLayerRef.current, {
              yPercent: -14,
              scale: 1.1,
              ease: "none",
              scrollTrigger: {
                trigger: heroSectionRef.current,
                start: "top top",
                end: "bottom top",
                scrub: true,
              },
            });
          }

          if (runeRingRef.current) {
            gsap.to(runeRingRef.current, {
              yPercent: -10,
              scale: 1.15,
              ease: "none",
              scrollTrigger: {
                trigger: heroSectionRef.current,
                start: "top top",
                end: "bottom top",
                scrub: true,
              },
            });
          }

          if (portraitLayerRef.current) {
            gsap.to(portraitLayerRef.current, {
              yPercent: 6,
              ease: "none",
              scrollTrigger: {
                trigger: heroSectionRef.current,
                start: "top top",
                end: "bottom top",
                scrub: true,
              },
            });
          }
        }

        if (monumentTextLeftRef.current) {
          gsap.to(monumentTextLeftRef.current, {
            xPercent: -18,
            ease: "none",
            scrollTrigger: {
              trigger: heroSectionRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        }

        if (monumentTextRightRef.current) {
          gsap.to(monumentTextRightRef.current, {
            xPercent: 18,
            ease: "none",
            scrollTrigger: {
              trigger: heroSectionRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        }
      }

      // C. Faixas Cinéticas Cruzadas (X-Crossed Velocity Marquees)
      if (marqueeLeftRef.current) {
        gsap.to(marqueeLeftRef.current, {
          xPercent: -24,
          ease: "none",
          scrollTrigger: {
            trigger: marqueeLeftRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.4,
          },
        });
      }
      if (marqueeRightRef.current) {
        gsap.fromTo(
          marqueeRightRef.current,
          { xPercent: -24 },
          {
            xPercent: 0,
            ease: "none",
            scrollTrigger: {
              trigger: marqueeRightRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.4,
            },
          }
        );
      }

      // D. Scrollytelling Manifesto: Iluminação Palavra por Palavra no Scroll
      if (manifestoSectionRef.current) {
        const words = manifestoSectionRef.current.querySelectorAll(".manifesto-word");
        if (words.length) {
          gsap.fromTo(
            words,
            { opacity: 0.18, y: 6 },
            {
              opacity: 1,
              y: 0,
              stagger: 0.06,
              ease: "power2.out",
              scrollTrigger: {
                trigger: manifestoSectionRef.current,
                start: "top 82%",
                end: "center 50%",
                scrub: 0.5,
              },
            }
          );
        }
      }

      // E. Reveal Editorial das Seções e Monólitos
      gsap.utils.toArray<HTMLElement>(".section-reveal").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 36, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 88%",
            },
          }
        );
      });

      // F. Scroll Horizontal Pinning c/ Skew Leve 60fps (Apenas Desktop)
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        const track = horizontalTrackRef.current;
        const section = horizontalSectionRef.current;
        if (!track || !section) return;

        const getScrollAmount = () => Math.max(0, track.scrollWidth - window.innerWidth + 160);

        if (getScrollAmount() > 80) {
          const cards = track.querySelectorAll(".featured-vault-card");
          const skewSetter = gsap.quickTo(cards, "skewX", { duration: 0.3, ease: "power3.out" });

          gsap.to(track, {
            x: () => -getScrollAmount(),
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: () => `+=${getScrollAmount() * 1.1}`,
              pin: true,
              scrub: 0.8,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const vel = Math.max(-6, Math.min(6, self.getVelocity() / -380));
                skewSetter(vel);
                if (horizontalProgressRef.current) {
                  horizontalProgressRef.current.style.width = `${Math.round(self.progress * 100)}%`;
                }
                const total = cards.length || totalFeatured;
                const idx = Math.min(total, Math.max(1, Math.ceil(self.progress * total)));
                if (slideCounterBgRef.current) slideCounterBgRef.current.textContent = `0${idx}`;
                if (slideCounterHudRef.current) slideCounterHudRef.current.textContent = `0${idx} / 0${total}`;
              },
              onScrubComplete: () => skewSetter(0),
            },
          });
        }
      });
    });

    // 5. Tocha / Lanterna GPU + Cursor + Parallax 3D com quickTo pré-alocados (Zero GC / Zero Repaint)
    const xSpot = spotlightRef.current ? gsap.quickTo(spotlightRef.current, "x", { duration: 0.35, ease: "power3.out" }) : null;
    const ySpot = spotlightRef.current ? gsap.quickTo(spotlightRef.current, "y", { duration: 0.35, ease: "power3.out" }) : null;

    const xDot = cursorDotRef.current ? gsap.quickTo(cursorDotRef.current, "x", { duration: 0.06, ease: "power3.out" }) : null;
    const yDot = cursorDotRef.current ? gsap.quickTo(cursorDotRef.current, "y", { duration: 0.06, ease: "power3.out" }) : null;
    const xRing = cursorRingRef.current ? gsap.quickTo(cursorRingRef.current, "x", { duration: 0.22, ease: "power3.out" }) : null;
    const yRing = cursorRingRef.current ? gsap.quickTo(cursorRingRef.current, "y", { duration: 0.22, ease: "power3.out" }) : null;

    const xDragon = dragonLayerRef.current ? gsap.quickTo(dragonLayerRef.current, "x", { duration: 0.9, ease: "power2.out" }) : null;
    const yDragon = dragonLayerRef.current ? gsap.quickTo(dragonLayerRef.current, "y", { duration: 0.9, ease: "power2.out" }) : null;
    const xRune = runeRingRef.current ? gsap.quickTo(runeRingRef.current, "x", { duration: 1.1, ease: "power2.out" }) : null;
    const yRune = runeRingRef.current ? gsap.quickTo(runeRingRef.current, "y", { duration: 1.1, ease: "power2.out" }) : null;
    const xPortrait = portraitLayerRef.current ? gsap.quickTo(portraitLayerRef.current, "x", { duration: 0.75, ease: "power2.out" }) : null;
    const yPortrait = portraitLayerRef.current ? gsap.quickTo(portraitLayerRef.current, "y", { duration: 0.75, ease: "power2.out" }) : null;

    if (!isMobile) {
      xSpot?.(window.innerWidth * 0.55);
      ySpot?.(window.innerHeight * 0.45);
    }

    const handlePointerMove = (e: MouseEvent) => {
      if (isMobile) return;
      const xPct = (e.clientX / window.innerWidth - 0.5) * 2;
      const yPct = (e.clientY / window.innerHeight - 0.5) * 2;

      xSpot?.(e.clientX);
      ySpot?.(e.clientY);
      xDot?.(e.clientX);
      yDot?.(e.clientY);
      xRing?.(e.clientX);
      yRing?.(e.clientY);

      if (window.scrollY < window.innerHeight * 1.2) {
        xDragon?.(-xPct * 26);
        yDragon?.(-yPct * 18);
        xRune?.(-xPct * 40);
        yRune?.(-yPct * 28);
        xPortrait?.(xPct * 16);
        yPortrait?.(yPct * 10);
      }
    };

    window.addEventListener("mousemove", handlePointerMove, { passive: true });

    // 6. Canvas de Brasas Vivas Otimizado (DPR = 1, 24 partículas leves)
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    const count = isMobile ? 10 : 24;
    const sparks = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2.2 + 0.6,
      vy: -(Math.random() * 0.8 + 0.25),
      vx: (Math.random() - 0.5) * 0.45,
      wobble: Math.random() * Math.PI * 2,
      alpha: Math.random() * 0.65 + 0.2,
      color: Math.random() > 0.35 ? "#EA580C" : "#FBBF24",
    }));

    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = (time: number) => {
      if (lenis) lenis.raf(time * 1000);
      if (!ctx || !canvas || document.hidden) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        s.wobble += 0.03;
        s.y += s.vy;
        s.x += s.vx + Math.sin(s.wobble) * 0.25;
        if (s.y < -12) {
          s.y = canvas.height + 12;
          s.x = Math.random() * canvas.width;
        }
        if (s.x < -12) s.x = canvas.width + 10;
        if (s.x > canvas.width + 12) s.x = -10;

        ctx.globalAlpha = s.alpha * (0.7 + Math.sin(s.wobble * 2) * 0.3);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    gsap.ticker.add(tick);

    return () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("resize", resize);
      if (onScrollMobile) window.removeEventListener("scroll", onScrollMobile);
      gsap.ticker.remove(tick);
      ctxGsap.revert();
      lenis?.destroy();
    };
  }, [data, booted]);

  // Efeito Tilt 3D Interativo Leve para os Monólitos e Cards
  const handleCardTilt = (e: React.MouseEvent<HTMLElement>) => {
    if (window.innerWidth < 1024) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = (y / rect.height - 0.5) * -9;
    const ry = (x / rect.width - 0.5) * 9;
    gsap.to(el, {
      rotationX: rx,
      rotationY: ry,
      transformPerspective: 900,
      duration: 0.35,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  const resetCardTilt = (e: React.MouseEvent<HTMLElement>) => {
    gsap.to(e.currentTarget, {
      rotationX: 0,
      rotationY: 0,
      duration: 0.55,
      ease: "power3.out",
      overwrite: "auto",
    });
  };

  // Efeito Magnético em Botões
  const handleMagneticMove = (e: React.MouseEvent<HTMLElement>) => {
    if (window.innerWidth < 1024) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.24;
    const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.24;
    gsap.to(el, { x: dx, y: dy, duration: 0.25, ease: "power2.out", overwrite: "auto" });
  };

  const resetMagnetic = (e: React.MouseEvent<HTMLElement>) => {
    gsap.to(e.currentTarget, { x: 0, y: 0, duration: 0.5, ease: "power3.out", overwrite: "auto" });
  };

  if (!data) return null;

  const { studio, categories, portfolio } = data;
  const featuredItems = portfolio.filter((item: any) => item.featured);
  const filteredPortfolio = portfolio.filter((item: any) => {
    if (filter === "all") return true;
    return item.category === filter;
  });

  const waLink = (msg: string) =>
    `https://wa.me/${studio.whatsapp}?text=${encodeURIComponent(msg)}`;

  return (
    <main className="relative min-h-screen selection:bg-ember selection:text-obsidian overflow-x-hidden">
      {/* =====================================================================
          FUNDO ARQUITETÔNICO DE TIJOLOS BICOLOR + TOCHA GPU (ZERO REPAINT)
      ====================================================================== */}
      <div className="fixed inset-0 pointer-events-none z-0 brick-wall-fixed" />
      <div ref={spotlightRef} className="hidden lg:block fixed top-0 left-0 z-[1] torch-spotlight" />
      <div className="fixed inset-0 pointer-events-none z-[2] brick-vignette-fixed" />

      {/* CURSOR INTERATIVO (DESKTOP - ATUALIZADO VIA REF S/ RE-RENDER) */}
      <div
        ref={cursorDotRef}
        className="hidden lg:block fixed top-0 left-0 w-2.5 h-2.5 -ml-1.25 -mt-1.25 rounded-full bg-ember-gold pointer-events-none z-[70] shadow-[0_0_12px_#EA580C]"
      />
      <div
        ref={cursorRingRef}
        className="hidden lg:flex fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[69] items-center justify-center rounded-full border transition-[width,height,background-color,border-color] duration-200 w-10 h-10 border-ember/45 bg-ember/5 text-transparent"
      >
        <span
          ref={cursorTextRef}
          className="font-display text-[10px] font-black tracking-[0.18em] uppercase text-center px-2"
        />
      </div>

      {/* PRELOADER CINEMATOGRÁFICO */}
      <div
        ref={preloaderRef}
        style={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }}
        className="fixed inset-0 z-[80] bg-obsidian flex flex-col items-center justify-center px-6 border-b border-ember/40 text-center"
      >
        <div className="relative w-32 h-32 sm:w-48 sm:h-48 mb-5 sm:mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-ember/25 animate-spin-slow" />
          <div className="absolute inset-3 sm:inset-4 rounded-full border border-dashed border-ember-gold/30 animate-spin-reverse-slow" />
          <div className="absolute inset-5 sm:inset-6 rounded-full bg-ember/25 blur-2xl" />
          <img
            src={studio.logoUrl}
            alt="Thórin Logo"
            className="relative w-24 h-24 sm:w-32 sm:h-32 object-contain"
          />
        </div>
        <p className="font-gothic text-3xl sm:text-6xl text-forge-gradient tracking-wider">
          Thórin Tattoo Studio
        </p>
        <div className="w-56 sm:w-64 h-[2px] bg-wine-dark/80 mt-5 sm:mt-6 overflow-hidden rounded-full">
          <div
            ref={preloaderBarRef}
            className="h-full bg-gradient-to-r from-wine via-ember to-ember-gold"
            style={{ width: "0%" }}
          />
        </div>
        <div className="flex items-center gap-3 sm:gap-4 mt-3 font-display text-[10px] sm:text-[11px] tracking-[0.3em] sm:tracking-[0.38em] text-ember-gold uppercase">
          <span>Preparando Estúdio</span>
          <span>•</span>
          <span ref={preloaderPctRef}>0%</span>
        </div>
      </div>

      {/* CANVAS DE BRASAS VIVAS */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-10 opacity-85" />

      {/* MOLDURA ARQUITETÔNICA / HUD LATERAL (ATUALIZADO VIA DOM REF) */}
      <aside className="hidden xl:flex fixed left-5 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-6 pointer-events-none">
        <span className="[writing-mode:vertical-rl] rotate-180 font-display text-[10px] tracking-[0.38em] uppercase text-zinc-400">
          BARÃO • RS // SALA 303 // EST. {studio.since}
        </span>
        <div className="w-[2px] h-28 bg-wine-dark/80 rounded-full overflow-hidden relative">
          <div
            ref={scrollBarRef}
            className="w-full bg-gradient-to-b from-ember to-ember-gold"
            style={{ height: "0%" }}
          />
        </div>
        <span ref={scrollPctRef} className="font-display text-[11px] font-bold text-ember-gold tracking-widest">
          00%
        </span>
      </aside>

      {/* DOCK FLUTUANTE CENTRALIZADO (COM NAVEGAÇÃO RÁPIDA MOBILE) */}
      <header className="fixed top-2.5 sm:top-5 inset-x-0 z-40 px-3 sm:px-4 pointer-events-none flex flex-col items-center gap-1.5">
        <div className="pointer-events-auto w-full max-w-6xl rounded-full bg-obsidian/85 backdrop-blur-md border border-ember/35 shadow-[0_12px_40px_rgba(0,0,0,0.85)] px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-ember/20 blur-md group-hover:bg-ember/40 transition-colors" />
              <img
                src={studio.logoUrl}
                alt="Logo"
                className="relative w-7 h-7 sm:w-9 sm:h-9 object-contain group-hover:scale-110 transition-transform"
              />
            </div>
            <div className="leading-none">
              <span className="font-gothic text-[22px] sm:text-[28px] text-forge-gradient block">
                Thórin
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.22em] sm:tracking-[0.3em] text-zinc-300 block">
                Tattoo Studio • {studio.since}
              </span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-1 bg-surface/85 border border-wine/50 rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.2em] font-semibold text-zinc-200">
            <a href="#identidade" className="px-3.5 py-1.5 rounded-full hover:bg-wine/50 hover:text-ember-gold transition-all">
              O Estúdio
            </a>
            <a href="#destaques" className="px-3.5 py-1.5 rounded-full hover:bg-wine/50 hover:text-ember-gold transition-all">
              Destaques
            </a>
            <a href="#galeria" className="px-3.5 py-1.5 rounded-full hover:bg-wine/50 hover:text-ember-gold transition-all">
              Portfólio
            </a>
            <a href="#contato" className="px-3.5 py-1.5 rounded-full hover:bg-wine/50 hover:text-ember-gold transition-all">
              Contato
            </a>
            <a href="/admin" className="px-3 py-1.5 rounded-full text-zinc-400 hover:text-ember-gold transition-colors">
              Admin
            </a>
          </nav>

          <a
            href={waLink("Olá Daniel! Vi o site do Thórin Tattoo Studio e gostaria de fazer um orçamento.")}
            target="_blank"
            rel="noopener"
            onMouseMove={handleMagneticMove}
            onMouseLeave={(e) => {
              resetMagnetic(e);
              setCursorMode("");
            }}
            onMouseEnter={() => setCursorMode("ORÇAR")}
            className="clip-forge-btn px-3.5 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-wine via-ember to-ember-bright text-white text-[10px] sm:text-xs font-extrabold uppercase tracking-wider shadow-lg shadow-ember/30 hover:brightness-110 transition-all shrink-0"
          >
            <span className="sm:hidden">Agendar ↗</span>
            <span className="hidden sm:inline">Agendar Sessão</span>
          </a>
        </div>

        {/* Barra de Navegação Compacta p/ Mobile */}
        <nav className="md:hidden pointer-events-auto flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-obsidian/85 backdrop-blur-md border border-wine/50 shadow-lg max-w-full overflow-x-auto no-scrollbar">
          <a
            href="#identidade"
            className="px-3 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-wider text-zinc-200 active:bg-ember active:text-obsidian whitespace-nowrap"
          >
            Estúdio
          </a>
          <a
            href="#destaques"
            className="px-3 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-wider text-zinc-200 active:bg-ember active:text-obsidian whitespace-nowrap"
          >
            Destaques
          </a>
          <a
            href="#galeria"
            className="px-3 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-wider text-zinc-200 active:bg-ember active:text-obsidian whitespace-nowrap"
          >
            Portfólio
          </a>
          <a
            href="#contato"
            className="px-3 py-1 rounded-full text-[10px] font-display font-bold uppercase tracking-wider text-zinc-200 active:bg-ember active:text-obsidian whitespace-nowrap"
          >
            Contato
          </a>
        </nav>
      </header>

      {/* =====================================================================
          ATO I: HERO ASSIMÉTRICO (PALCO CONCÊNTRICO MOBILE & DESKTOP)
      ====================================================================== */}
      <section
        ref={heroSectionRef}
        className="relative min-h-[100svh] pt-28 sm:pt-32 pb-12 sm:pb-16 flex items-center overflow-hidden perspective-stage z-20"
      >
        {/* PLANO 0: Tipografia Monumental Dupla em Contra-Movimento no Fundo */}
        <div className="pointer-events-none select-none absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col gap-6 sm:gap-8 z-0 opacity-20 sm:opacity-30">
          <div
            ref={monumentTextLeftRef}
            className="whitespace-nowrap font-display font-black text-[18vw] sm:text-[14vw] leading-none text-stroke-monument gpu-layer"
          >
            THÓRIN TATTOO STUDIO • DANIEL BOURSCHEID • DESDE 2017 •
          </div>
          <div
            ref={monumentTextRightRef}
            className="whitespace-nowrap font-display font-black text-[18vw] sm:text-[14vw] leading-none text-stroke-gold opacity-45 gpu-layer"
          >
            • BLACKWORK • REALISMO • FINE LINE • BARÃO RS • SALA 303 •
          </div>
        </div>

        {/* CONTAINER PRINCIPAL EM 12 COLUNAS */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-10 grid lg:grid-cols-12 gap-8 lg:gap-8 items-center">
          {/* =================================================================
              ALA ESQUERDA (COL 1-7): IDENTIDADE MONUMENTAL, PROPOSTA & CTAs
          ================================================================== */}
          <div className="lg:col-span-7 flex flex-col items-center text-center lg:items-start lg:text-left space-y-5 sm:space-y-6 order-2 lg:order-1">
            {/* Selo de Status & Localização */}
            <div className="hero-editorial-item flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full bg-obsidian/85 border border-ember/50 text-ember-gold text-[10px] sm:text-[11px] font-display font-bold uppercase tracking-[0.18em] sm:tracking-[0.22em] shadow-lg">
                <span className="w-2 h-2 rounded-full bg-ember animate-ping shrink-0" />
                <span>{studio.statusAgenda}</span>
              </div>
              <span className="px-3 sm:px-3.5 py-1.5 rounded-full bg-wine-dark/75 border border-wine-light/40 text-[9px] sm:text-[10px] font-display uppercase tracking-[0.22em] sm:tracking-[0.28em] text-zinc-200">
                Barão / RS • Sala 303
              </span>
            </div>

            {/* Nome Monumental do Estúdio */}
            <div className="hero-editorial-item space-y-2">
              <p className="font-display text-[10px] sm:text-sm font-bold uppercase tracking-[0.28em] sm:tracking-[0.42em] text-ember-gold">
                Estúdio de Tatuagem Autoral • Desde {studio.since}
              </p>
              <h1 className="font-gothic text-[2.85rem] sm:text-7xl xl:text-[5.5rem] text-forge-gradient leading-[0.96] sm:leading-[0.94] tracking-wide drop-shadow-[0_12px_30px_rgba(0,0,0,0.95)]">
                {studio.name}
              </h1>
              <p className="font-display font-black text-lg sm:text-2xl xl:text-3xl tracking-tight text-white/95 pt-1">
                TRAÇO PRECISO, PERSONALIDADE E <span className="text-ember-gold">ARTE NA PELE.</span>
              </p>
            </div>

            {/* Bio / Proposta */}
            <p className="hero-editorial-item text-zinc-200 text-sm sm:text-lg leading-relaxed max-w-2xl border-l-0 lg:border-l-2 border-t lg:border-t-0 border-ember/60 lg:border-ember lg:pl-4 bg-obsidian/55 px-4 lg:pr-4 py-3 lg:py-2 rounded-xl lg:rounded-none lg:rounded-r-xl">
              {studio.bio}
            </p>

            {/* Botões de Ação Magnéticos (Empilhados c/ largura total no celular) */}
            <div className="hero-editorial-item flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-1 w-full sm:w-auto">
              <a
                href={waLink("Olá Daniel! Vim pelo site do Thórin Tattoo e quero orçar minha ideia.")}
                target="_blank"
                rel="noopener"
                onMouseMove={handleMagneticMove}
                onMouseLeave={(e) => {
                  resetMagnetic(e);
                  setCursorMode("");
                }}
                onMouseEnter={() => setCursorMode("WHATSAPP")}
                className="clip-forge-btn text-center px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-ember via-ember-bright to-ember-gold text-obsidian font-display font-black text-xs sm:text-sm uppercase tracking-[0.14em] sm:tracking-[0.16em] shadow-[0_15px_40px_rgba(234,88,12,0.4)] hover:brightness-110 transition-all"
              >
                Orçar Minha Ideia ↗
              </a>
              <a
                href="#destaques"
                onMouseEnter={() => setCursorMode("EXPLORAR")}
                onMouseLeave={() => setCursorMode("")}
                className="clip-forge-btn text-center px-6 sm:px-7 py-3.5 sm:py-4 brick-surface-card border border-ember/45 hover:border-ember-gold text-zinc-100 font-display text-xs sm:text-sm font-bold uppercase tracking-[0.14em] sm:tracking-[0.16em] transition-colors"
              >
                Explorar Obras
              </a>
            </div>

            {/* Telemetria de Autoridade (Proporcionada para telas de 360px+) */}
            <div className="hero-editorial-item w-full pt-1 sm:pt-2 grid grid-cols-3 gap-2 sm:gap-4 max-w-xl">
              <div className="clip-forge-btn brick-surface-card border border-wine-light/40 p-2.5 sm:p-4 text-center lg:text-left">
                <p className="font-display text-xl sm:text-3xl font-black text-ember-gold">{studio.since}</p>
                <p className="text-[9px] sm:text-[10px] text-zinc-300 uppercase tracking-wider sm:tracking-[0.22em] mt-0.5 truncate">
                  Fundação
                </p>
              </div>
              <div className="clip-forge-btn brick-surface-card border border-wine-light/40 p-2.5 sm:p-4 text-center lg:text-left">
                <p className="font-display text-xl sm:text-3xl font-black text-white">{studio.postsCount}</p>
                <p className="text-[9px] sm:text-[10px] text-zinc-300 uppercase tracking-wider sm:tracking-[0.22em] mt-0.5 truncate">
                  Publicações
                </p>
              </div>
              <div className="clip-forge-btn brick-surface-card border border-wine-light/40 p-2.5 sm:p-4 text-center lg:text-left">
                <p className="font-display text-xl sm:text-3xl font-black text-ember">{studio.followersCount}</p>
                <p className="text-[9px] sm:text-[10px] text-zinc-300 uppercase tracking-wider sm:tracking-[0.22em] mt-0.5 truncate">
                  Seguidores
                </p>
              </div>
            </div>
          </div>

          {/* =================================================================
              ALA DIREITA (COL 8-12): PALCO 3D CONCÊNTRICO DO TATUADOR + BRASÃO
              (Palco isolado do plinto inferior p/ manter Anel, Dragão e Avatar 100% centralizados)
          ================================================================== */}
          <div className="lg:col-span-5 relative flex flex-col items-center justify-center order-1 lg:order-2">
            {/* PALCO CONCÊNTRICO: Anel + Dragão + Retrato */}
            <div className="relative w-[270px] h-[300px] sm:w-[420px] sm:h-[460px] xl:w-[460px] xl:h-[500px] flex items-end justify-center">
              {/* PLANO 1 (Fundo): Geometria Sutil Girando */}
              <div
                ref={runeRingRef}
                className="hero-rune-layer absolute inset-0 m-auto w-[265px] h-[265px] sm:w-[420px] sm:h-[420px] xl:w-[460px] xl:h-[460px] pointer-events-none flex items-center justify-center z-[1] gpu-layer"
              >
                <svg viewBox="0 0 600 600" className="w-full h-full animate-spin-slow opacity-55">
                  <circle
                    cx="300"
                    cy="300"
                    r="284"
                    fill="none"
                    stroke="rgba(234,88,12,0.4)"
                    strokeWidth="1.2"
                  />
                  <circle
                    cx="300"
                    cy="300"
                    r="264"
                    fill="none"
                    stroke="rgba(251,191,36,0.35)"
                    strokeWidth="1"
                    strokeDasharray="6 14"
                  />
                  <circle
                    cx="300"
                    cy="300"
                    r="230"
                    fill="none"
                    stroke="rgba(234,88,12,0.25)"
                    strokeWidth="1"
                    strokeDasharray="2 10"
                  />
                  <polygon
                    points="300,22 540,438 60,438"
                    fill="none"
                    stroke="rgba(180,35,45,0.32)"
                    strokeWidth="1"
                  />
                  <polygon
                    points="300,578 540,162 60,162"
                    fill="none"
                    stroke="rgba(234,88,12,0.26)"
                    strokeWidth="1"
                  />
                </svg>
              </div>

              {/* PLANO 2 (Meio-Fundo): Brasão do Dragão Atrás dos Ombros */}
              <div
                ref={dragonLayerRef}
                className="hero-crest-layer absolute inset-x-0 top-1 sm:top-2 mx-auto w-[240px] h-[240px] sm:w-[380px] sm:h-[380px] xl:w-[420px] xl:h-[420px] pointer-events-none flex items-center justify-center z-[2] gpu-layer"
              >
                <div
                  className="absolute inset-4 sm:inset-6 rounded-full opacity-80"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(234,88,12,0.42) 0%, rgba(107,20,26,0.28) 50%, transparent 72%)",
                  }}
                />
                <img
                  src={studio.logoUrl}
                  alt="Brasão Dragão Thórin"
                  className="w-full h-full object-contain opacity-85"
                />
                <img
                  src="/assets/dragon-fire-glow.webp"
                  alt=""
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  className="absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-95"
                />
              </div>

              {/* PLANO 3 (Primeiro Plano Limpo): Daniel Bourscheid Recortado 100% Visível */}
              <div
                ref={portraitLayerRef}
                className="hero-portrait-layer relative z-[5] w-[215px] sm:w-[335px] xl:w-[375px] pointer-events-none gpu-layer"
              >
                <img
                  src={studio.avatarUrl}
                  alt={studio.artist}
                  className="w-full h-auto object-contain block"
                />
              </div>
            </div>

            {/* Plinto Inferior (Abaixo dos Braços Cruzados — Não cobre o avatar) */}
            <div className="relative z-[6] -mt-1 w-full max-w-[310px] sm:max-w-sm clip-forge-btn brick-surface-card border border-ember/55 px-4 sm:px-5 py-2.5 sm:py-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] flex items-center justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <p className="text-[8px] sm:text-[9px] font-display font-bold uppercase tracking-[0.22em] sm:tracking-[0.28em] text-ember-gold">
                  Tatuador & Fundador
                </p>
                <p className="font-display text-sm sm:text-lg font-black text-white leading-tight truncate">
                  {studio.artist}
                </p>
              </div>
              <a
                href={`https://instagram.com/${studio.instagramArtist}`}
                target="_blank"
                rel="noopener"
                onMouseEnter={() => setCursorMode("PERFIL")}
                onMouseLeave={() => setCursorMode("")}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-ember/20 border border-ember/50 text-[10px] sm:text-[11px] font-display font-bold text-ember-gold hover:bg-ember hover:text-obsidian transition-colors shrink-0"
              >
                @{studio.instagramArtist} ↗
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          FAIXAS CINÉTICAS CRUZADAS (ESPAÇAMENTO CORRIGIDO NO MOBILE)
      ====================================================================== */}
      <div className="relative py-6 sm:py-10 overflow-hidden z-20 select-none">
        {/* Faixa 1 */}
        <div className="-rotate-1 sm:-rotate-2 scale-105 py-3 sm:py-4 brick-surface-card border-y border-ember/45 shadow-[0_10px_40px_rgba(0,0,0,0.9)]">
          <div ref={marqueeLeftRef} className="flex whitespace-nowrap gap-8 sm:gap-12 items-center gpu-layer">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-8 sm:gap-12">
                <span className="font-gothic text-2xl sm:text-4xl text-forge-gradient">Thórin Tattoo Studio</span>
                <span className="text-[10px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] text-zinc-100">
                  • ARTE AUTORAL DESDE {studio.since}
                </span>
                <span className="font-display text-sm sm:text-lg font-black text-ember-gold">
                  BLACKWORK • FINE LINE • SOMBREADO
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Faixa 2 (Sem sobreposição excessiva em telas estreitas) */}
        <div className="rotate-1 sm:rotate-2 scale-105 mt-2 sm:-mt-6 py-2.5 sm:py-3.5 bg-ember/95 text-obsidian border-y border-ember-gold shadow-2xl">
          <div ref={marqueeRightRef} className="flex whitespace-nowrap gap-8 sm:gap-12 items-center gpu-layer">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-8 sm:gap-12">
                <span className="font-display text-xs sm:text-base font-black uppercase tracking-[0.22em] sm:tracking-[0.3em]">
                  DANIEL BOURSCHEID • TRAÇO EXCLUSIVO
                </span>
                <span className="font-gothic text-xl sm:text-3xl">Barão • Rio Grande do Sul</span>
                <span className="font-display text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.25em] sm:tracking-[0.35em]">
                  • SESSÕES EXCLUSIVAS COM HORA MARCADA
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =====================================================================
          ATO II: IDENTIDADE DO ESTÚDIO & PILARES DE TRABALHO
      ====================================================================== */}
      <section id="identidade" ref={manifestoSectionRef} className="py-16 sm:py-32 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Manifesto Iluminado por Scroll */}
          <div className="max-w-5xl mx-auto text-center mb-12 sm:mb-20">
            <span className="inline-block px-3.5 sm:px-4 py-1.5 rounded-full bg-obsidian/75 border border-ember/40 text-ember-gold text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] sm:tracking-[0.35em] mb-4 sm:mb-6">
              Assinatura & Identidade • Desde {studio.since}
            </span>
            <h2 className="font-display text-2xl sm:text-5xl lg:text-6xl font-black leading-[1.2] sm:leading-[1.14] tracking-tight flex flex-wrap justify-center gap-x-2 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 drop-shadow-[0_6px_24px_rgba(0,0,0,0.95)]">
              {MANIFESTO_WORDS.map((word, idx) => {
                const isHighlight = ["CRIAMOS", "IDENTIDADE,", "ARTE", "AUTORAL", "PRECISÃO", "TRAÇO."].includes(word);
                return (
                  <span
                    key={idx}
                    className={`manifesto-word inline-block ${
                      isHighlight ? "text-forge-gradient" : "text-zinc-100"
                    }`}
                  >
                    {word}
                  </span>
                );
              })}
            </h2>
          </div>

          {/* Composição Assimétrica: Identidade Thórin + 3 Pilares Interativos */}
          <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
            {/* Coluna Esquerda: Brasão Oficial & Essência Thórin */}
            <div
              onMouseMove={handleCardTilt}
              onMouseLeave={resetCardTilt}
              className="lg:col-span-5 section-reveal clip-forge-card brick-surface-card relative p-6 sm:p-10 border border-ember/50 shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col justify-between overflow-hidden group gpu-layer"
            >
              <div className="absolute -right-8 -top-8 sm:-right-12 sm:-top-12 font-gothic text-[120px] sm:text-[180px] leading-none text-ember/15 select-none pointer-events-none">
                Th
              </div>
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="text-[10px] font-display font-bold uppercase tracking-[0.25em] sm:tracking-[0.3em] text-ember-gold">
                  Identidade Oficial
                </span>
                <span className="px-3 py-1 rounded-full bg-obsidian/80 border border-ember/40 text-[10px] uppercase tracking-widest text-zinc-200">
                  Barão / RS
                </span>
              </div>

              <div className="relative my-6 sm:my-8 flex items-center justify-center">
                <div
                  className="absolute w-48 h-48 sm:w-64 sm:h-64 rounded-full opacity-75"
                  style={{
                    background: "radial-gradient(circle, rgba(234,88,12,0.32) 0%, transparent 70%)",
                  }}
                />
                <img
                  src={studio.logoUrl}
                  alt="Brasão Oficial Thórin Tattoo Studio"
                  className="relative w-44 sm:w-64 mx-auto object-contain group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              <div className="relative z-10 border-t border-ember/30 pt-4 sm:pt-5 bg-obsidian/55 -mx-6 -mb-6 sm:-mx-10 sm:-mb-10 p-5 sm:p-8">
                <p className="font-gothic text-2xl sm:text-3xl text-forge-gradient">A Essência Thórin</p>
                <p className="text-xs sm:text-sm text-zinc-200 mt-1.5 leading-relaxed">
                  Assim como o lendário mestre artesão que inspira nosso nome, tratamos cada tatuagem como uma obra única — unindo dedicação ao detalhe, traço firme e mais de{" "}
                  <strong className="text-ember-gold">{studio.postsCount}</strong> trabalhos compartilhados.
                </p>
              </div>
            </div>

            {/* Coluna Direita: 3 Pilares Escalonados */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-4 sm:gap-6">
              {[
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
                  desc: `Localizado em ${studio.address}. Um estúdio reservado, climatizado e preparado para desenvolver sua ideia com tranquilidade.`,
                },
              ].map((pillar, i) => (
                <div
                  key={pillar.roman}
                  onMouseMove={handleCardTilt}
                  onMouseLeave={resetCardTilt}
                  className={`section-reveal clip-forge-card brick-surface-card relative p-5 sm:p-8 border border-ember/35 hover:border-ember transition-colors shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden group gpu-layer ${
                    i === 1 ? "lg:ml-10" : i === 2 ? "lg:ml-4" : ""
                  }`}
                >
                  <span className="pointer-events-none select-none absolute right-4 top-3 sm:right-6 sm:top-1/2 sm:-translate-y-1/2 font-gothic text-5xl sm:text-8xl text-ember/15 sm:text-ember/20 group-hover:text-ember/35 transition-colors">
                    {pillar.roman}
                  </span>
                  <div className="relative z-10 max-w-xl space-y-1.5 sm:space-y-2 pr-8 sm:pr-0">
                    <span className="text-[9px] sm:text-[10px] font-display font-bold uppercase tracking-[0.22em] sm:tracking-[0.3em] text-ember-gold block">
                      0{i + 1} // {pillar.tag}
                    </span>
                    <h3 className="font-display text-lg sm:text-2xl font-black text-white group-hover:text-ember-gold transition-colors leading-snug">
                      {pillar.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">{pillar.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          ATO III: VITRINE DE DESTAQUES (RESPONSIVA NO MOBILE / PINNED NO DESKTOP)
      ====================================================================== */}
      {featuredItems.length > 0 && (
        <section
          id="destaques"
          ref={horizontalSectionRef}
          className="py-16 sm:py-24 bg-obsidian/65 border-y border-ember/35 relative z-20 overflow-hidden flex flex-col justify-center lg:min-h-screen"
        >
          {/* Contador Gigante de Fundo */}
          <div
            ref={slideCounterBgRef}
            className="pointer-events-none select-none absolute right-4 sm:right-8 bottom-4 sm:bottom-6 font-display font-black text-[28vw] sm:text-[22vw] leading-none text-stroke-monument opacity-20 sm:opacity-30 z-0"
          >
            01
          </div>

          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 mb-8 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 relative z-10 text-center sm:text-left">
            <div>
              <span className="text-ember-gold text-[10px] sm:text-xs font-bold uppercase tracking-[0.28em] sm:tracking-[0.35em]">
                Seleção de Trabalhos • Vitrine Interativa
              </span>
              <h2 className="font-display text-2xl sm:text-5xl font-black mt-1">
                OBRAS EM <span className="text-forge-gradient">DESTAQUE</span>
              </h2>
            </div>

            {/* Barra de Progresso Horizontal (Desktop) */}
            <div className="hidden lg:flex items-center gap-4">
              <span ref={slideCounterHudRef} className="font-display text-xs font-bold text-ember-gold">
                01 / 0{featuredItems.length}
              </span>
              <div className="w-48 h-[3px] bg-wine-dark rounded-full overflow-hidden">
                <div
                  ref={horizontalProgressRef}
                  className="h-full bg-gradient-to-r from-ember to-ember-gold w-1/4"
                />
              </div>
              <span className="text-[11px] uppercase tracking-[0.25em] text-zinc-300">
                Role p/ navegar →
              </span>
            </div>
          </div>

          <div
            ref={horizontalTrackRef}
            className={`flex gap-6 sm:gap-10 px-4 sm:px-6 lg:px-20 overflow-x-auto no-scrollbar lg:overflow-visible snap-x snap-mandatory pb-4 sm:pb-6 relative z-10 items-center ${
              featuredItems.length === 1 ? "justify-center lg:justify-start" : ""
            }`}
          >
            {featuredItems.map((item: any, index: number) => (
              <div
                key={item.id}
                onClick={() => setSelectedTattoo(item)}
                onMouseEnter={() => setCursorMode("VER OBRA")}
                onMouseLeave={() => setCursorMode("")}
                className="featured-vault-card clip-forge-card snap-center shrink-0 w-full max-w-[350px] sm:max-w-none sm:w-[420px] lg:w-[470px] cursor-pointer group relative overflow-hidden brick-surface-card border border-ember/45 shadow-[0_25px_65px_rgba(0,0,0,0.92)] gpu-layer"
              >
                <div className="aspect-[4/5] overflow-hidden relative bg-obsidian">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/20 to-transparent" />

                  <div className="absolute top-4 left-4 right-4 sm:top-5 sm:left-5 sm:right-5 flex items-center justify-between gap-2">
                    <span className="px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-obsidian/85 border border-ember/50 text-ember-gold text-[10px] sm:text-[11px] font-display font-bold uppercase tracking-widest">
                      Obra #{String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="px-2.5 py-1 sm:px-3 rounded-full bg-ember text-obsidian text-[9px] sm:text-[10px] font-display font-black uppercase tracking-widest">
                      {item.category}
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-7 flex items-center justify-between gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.22em] sm:tracking-[0.28em] text-ember-gold">
                      Arte Autoral • Thórin Tattoo
                    </p>
                    <h3 className="font-display text-lg sm:text-2xl font-black text-white mt-0.5 sm:mt-1 group-hover:text-ember-gold transition-colors truncate">
                      {item.title}
                    </h3>
                  </div>
                  <span className="clip-forge-btn shrink-0 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-wine group-hover:bg-ember text-white text-[10px] sm:text-xs font-display font-bold uppercase tracking-wider transition-colors">
                    Detalhes ↗
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================================================
          ATO IV: PORTFÓLIO OFICIAL ASSIMÉTRICO
      ====================================================================== */}
      <section id="galeria" className="py-16 sm:py-32 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 sm:mb-16 gap-5 sm:gap-8 section-reveal text-center sm:text-left">
            <div>
              <span className="text-ember-gold text-[10px] sm:text-xs font-bold uppercase tracking-[0.28em] sm:tracking-[0.35em]">
                Galeria de Trabalhos
              </span>
              <h2 className="font-display text-2xl sm:text-5xl lg:text-6xl font-black mt-1">
                PORTFÓLIO DO <span className="text-forge-gradient">ESTÚDIO</span>
              </h2>
            </div>

            {/* Dock de Filtros Interativo (Deslizável horizontalmente no celular) */}
            <div className="flex overflow-x-auto no-scrollbar sm:flex-wrap gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-obsidian/85 border border-ember/40 max-w-full">
              <button
                onClick={() => setFilter("all")}
                className={`shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-display font-bold uppercase tracking-wider transition-all ${
                  filter === "all"
                    ? "bg-gradient-to-r from-ember to-ember-gold text-obsidian shadow-lg shadow-ember/30"
                    : "text-zinc-200 hover:text-white hover:bg-surface"
                }`}
              >
                Todos ({portfolio.length})
              </button>
              {categories.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => setFilter(cat.id)}
                  className={`shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-display font-bold uppercase tracking-wider transition-all ${
                    filter === cat.id
                      ? "bg-gradient-to-r from-ember to-ember-gold text-obsidian shadow-lg shadow-ember/30"
                      : "text-zinc-200 hover:text-white hover:bg-surface"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid Editorial Desalinhado (Coluna Central Deslocada no Desktop) */}
          <div ref={galleryGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 pb-6 sm:pb-12">
            {filteredPortfolio.map((item: any, idx: number) => {
              const isMiddleColumn = idx % 3 === 1;
              return (
                <article
                  key={item.id}
                  onClick={() => setSelectedTattoo(item)}
                  onMouseMove={handleCardTilt}
                  onMouseLeave={(e) => {
                    resetCardTilt(e);
                    setCursorMode("");
                  }}
                  onMouseEnter={() => setCursorMode("AMPLIAR")}
                  className={`vault-card clip-forge-card brick-surface-card cursor-pointer group overflow-hidden border border-ember/35 hover:border-ember transition-colors duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.85)] gpu-layer ${
                    isMiddleColumn ? "lg:translate-y-12" : ""
                  }`}
                >
                  <div className="aspect-[4/5] overflow-hidden bg-obsidian relative">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-obsidian/30 opacity-80 group-hover:opacity-50 transition-opacity" />
                    <span className="absolute top-3.5 left-3.5 sm:top-4 sm:left-4 px-3 py-1 rounded-full bg-obsidian/85 border border-ember/40 text-[10px] font-display font-bold tracking-widest text-ember-gold uppercase">
                      #TH-{String(idx + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="p-5 sm:p-6 flex items-center justify-between gap-3 sm:gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] text-ember-gold uppercase tracking-[0.22em] sm:tracking-[0.25em] font-bold">
                        {item.category}
                      </p>
                      <h3 className="font-display font-bold text-white text-base sm:text-lg mt-0.5 group-hover:text-ember-gold transition-colors truncate">
                        {item.title}
                      </h3>
                    </div>
                    <span className="clip-forge-btn shrink-0 text-[11px] sm:text-xs px-3.5 sm:px-4 py-2 bg-wine/80 group-hover:bg-ember text-white font-display font-bold uppercase tracking-wider transition-colors">
                      Ver +
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          ATO V: CONTATO & LOCALIZAÇÃO
      ====================================================================== */}
      <section
        id="contato"
        className="relative py-16 sm:py-32 border-t border-ember/35 overflow-hidden z-20 bg-gradient-to-b from-transparent via-obsidian/50 to-obsidian/90"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 section-reveal">
          <div className="clip-forge-card brick-surface-card border border-ember/55 p-6 sm:p-14 lg:p-16 shadow-[0_30px_90px_rgba(0,0,0,0.95)]">
            <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 items-center">
              <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-center sm:text-left">
                <span className="inline-flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-[0.28em] sm:tracking-[0.35em] text-ember-gold font-bold">
                  <span className="w-2 h-2 rounded-full bg-ember animate-ping shrink-0" />
                  Thórin Tattoo Studio • Barão / RS
                </span>
                <h2 className="font-display text-2xl sm:text-5xl lg:text-6xl font-black leading-[1.1] sm:leading-[1.05]">
                  PRONTO PARA <span className="text-forge-gradient">ETERNIZAR</span> SUA PRÓXIMA TATTOO?
                </h2>
                <p className="text-zinc-200 text-sm sm:text-lg max-w-xl mx-auto sm:mx-0 leading-relaxed">
                  Traga sua referência ou ideia para desenvolvermos um projeto exclusivo. Atendimento com hora marcada no Centro de Barão.
                </p>

                <div className="pt-4 grid sm:grid-cols-2 gap-4 text-xs sm:text-sm text-zinc-200 border-t border-ember/30">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-ember-gold font-bold">Endereço</p>
                    <p className="mt-1 font-medium text-white">{studio.address}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-ember-gold font-bold">Redes Oficiais</p>
                    <div className="mt-1 flex items-center justify-center sm:justify-start gap-4 flex-wrap">
                      <a
                        href={`https://instagram.com/${studio.instagramStudio}`}
                        target="_blank"
                        rel="noopener"
                        className="text-ember-gold hover:text-white font-bold underline"
                      >
                        @{studio.instagramStudio}
                      </a>
                      <a
                        href={`https://instagram.com/${studio.instagramArtist}`}
                        target="_blank"
                        rel="noopener"
                        className="text-zinc-200 hover:text-white underline"
                      >
                        @{studio.instagramArtist}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col gap-3 sm:gap-4">
                <a
                  href={waLink("Olá Daniel! Gostaria de fazer um orçamento de tatuagem no Thórin Tattoo Studio.")}
                  target="_blank"
                  rel="noopener"
                  onMouseMove={handleMagneticMove}
                  onMouseLeave={(e) => {
                    resetMagnetic(e);
                    setCursorMode("");
                  }}
                  onMouseEnter={() => setCursorMode("WHATSAPP")}
                  className="clip-forge-btn w-full py-4 sm:py-5 px-4 sm:px-7 bg-gradient-to-r from-ember via-ember-bright to-ember-gold text-obsidian font-display font-black text-xs sm:text-sm uppercase tracking-wider sm:tracking-[0.15em] text-center shadow-2xl shadow-ember/40 hover:brightness-110 transition-all"
                >
                  WhatsApp (51) 99876-1246 ↗
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(studio.address)}`}
                  target="_blank"
                  rel="noopener"
                  onMouseMove={handleMagneticMove}
                  onMouseLeave={resetMagnetic}
                  className="clip-forge-btn w-full py-3.5 sm:py-4 px-4 sm:px-7 bg-obsidian/85 border border-ember/40 hover:border-ember-gold text-zinc-100 font-display font-bold text-[11px] sm:text-xs uppercase tracking-[0.16em] sm:tracking-[0.2em] text-center transition-colors"
                >
                  Ver Localização no Google Maps ↗
                </a>
              </div>
            </div>
          </div>

          <footer className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 text-[10px] sm:text-xs text-zinc-400 uppercase tracking-[0.2em] sm:tracking-[0.25em] text-center">
            <span>© {new Date().getFullYear()} {studio.name} • Todos os direitos reservados</span>
            <span>Daniel Bourscheid • Barão/RS</span>
          </footer>
        </div>
      </section>

      {/* =====================================================================
          MODAL LIGHTBOX DE INSPEÇÃO DE OBRA (RESPONSIVO MOBILE & DESKTOP)
      ====================================================================== */}
      {selectedTattoo && (
        <div
          onClick={() => setSelectedTattoo(null)}
          className="fixed inset-0 z-[90] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="clip-forge-card brick-surface-card max-w-3xl w-full max-h-[90svh] overflow-y-auto border border-ember/60 shadow-[0_30px_100px_rgba(0,0,0,0.98)] grid md:grid-cols-12"
          >
            <div className="md:col-span-7 bg-black flex items-center justify-center">
              <img
                src={selectedTattoo.imageUrl}
                alt={selectedTattoo.title}
                className="w-full max-h-[46vh] md:max-h-[75vh] object-contain md:object-cover"
              />
            </div>
            <div className="md:col-span-5 p-5 sm:p-8 flex flex-col justify-between gap-5 sm:gap-6 bg-obsidian/85">
              <div className="space-y-2.5 sm:space-y-3">
                <span className="inline-block px-3 py-1 rounded-full bg-wine/60 border border-ember/40 text-[10px] font-display font-bold uppercase tracking-widest text-ember-gold">
                  {selectedTattoo.category}
                </span>
                <h3 className="font-display text-xl sm:text-2xl font-black text-white">{selectedTattoo.title}</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Trabalho autoral executado por <strong className="text-white">{studio.artist}</strong> no{" "}
                  {studio.name} em Barão/RS.
                </p>
              </div>

              <div className="space-y-2.5 sm:space-y-3">
                <a
                  href={waLink(
                    `Olá Daniel! Vi a obra "${selectedTattoo.title}" no site e quero orçar uma tatuagem nesse estilo.`
                  )}
                  target="_blank"
                  rel="noopener"
                  className="clip-forge-btn block w-full py-3.5 sm:py-4 px-4 bg-gradient-to-r from-ember to-ember-gold text-obsidian font-display font-black text-center text-xs uppercase tracking-wider"
                >
                  Orçar nesse Estilo via WhatsApp ↗
                </a>
                <button
                  onClick={() => setSelectedTattoo(null)}
                  className="clip-forge-btn block w-full py-3 bg-obsidian border border-wine hover:border-ember text-zinc-200 font-display text-xs uppercase tracking-widest"
                >
                  Fechar Inspeção
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TattooAssistantWidget />
    </main>
  );
}
