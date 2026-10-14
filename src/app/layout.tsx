import type { Metadata } from "next";
import { Cinzel, Plus_Jakarta_Sans, UnifrakturMaguntia } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({ subsets: ["latin"], weight: ["600", "700", "900"], variable: "--font-display" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" });
const gothic = UnifrakturMaguntia({ subsets: ["latin"], weight: ["400"], variable: "--font-gothic" });

export const metadata: Metadata = {
  title: "Thórin Tattoo Studio | Daniel Bourscheid — Barão, RS",
  description: "Arte na pele desde 2017 em Barão/RS. Blackwork, Fine Line, Realismo e projetos exclusivos por Daniel Bourscheid.",
  icons: {
    icon: "/assets/logo-thorin.webp",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cinzel.variable} ${jakarta.variable} ${gothic.variable} scroll-smooth`}>
      <body className="font-sans antialiased selection:bg-ember selection:text-white">{children}</body>
    </html>
  );
}
