import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { SessionGuard } from "@/components/session-guard"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Provence - Plataforma de Terapia Online",
  description: "Conectamos você a psicólogos altamente qualificados para sessões online seguras e confidenciais.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <SessionGuard />
        {children}
        <Toaster />
      </body>
    </html>
  )
}

