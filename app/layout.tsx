import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Garra Premiada — laboratório de máquinas",
  description: "Entre, escolha uma versão da Garra Premiada e teste a experiência.",
  openGraph: {
    title: "Garra Premiada",
    description: "Três máquinas, três físicas e uma experiência premiada.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Garra Premiada",
    description: "Escolha sua máquina e entre no laboratório.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${geist.variable} ${mono.variable}`}>{children}</body></html>;
}
