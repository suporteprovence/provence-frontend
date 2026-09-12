"use client"

import { useState } from "react"
import { LogOut } from "lucide-react"
import { logout } from "@/lib/logout"
import { GerenciarAgenda } from "@/components/profissional/gerenciar-agenda"
import { ConsultasMarcadasPro } from "@/components/profissional/consultas-marcadas-pro"
import { ChatProfessional } from "@/components/profissional/chat-professional"
import { HistoricoProfessional } from "@/components/profissional/historico-professional"
import { PerfilProfessional } from "@/components/profissional/perfil-professional"
import { PagamentosProfessional } from "@/components/profissional/pagamentos-professional"
import { MeusHorarios } from "@/components/profissional/meus-horarios"

export default function ProfessionalPage() {
  const [activeSection, setActiveSection] = useState("agenda")

  // Função para renderizar o conteúdo dinâmico
  const renderContent = () => {
    switch (activeSection) {
      case "agenda":
        return <GerenciarAgenda />
      case "horarios":
        return <MeusHorarios />
      case "consultas":
        return <ConsultasMarcadasPro />
      case "chat":
        return <ChatProfessional />
      case "historico":
        return <HistoricoProfessional />
      case "perfil":
        return <PerfilProfessional />
      case "pagamentos":
        return <PagamentosProfessional />
      default:
        return <GerenciarAgenda />
    }
  }

  // Lista de abas para evitar repetição de código (DRY)
  const tabs = [
    { id: "agenda", label: "Agenda" },
    { id: "horarios", label: "Horários" },
    { id: "consultas", label: "Consultas" },
    { id: "chat", label: "Chat" },
    { id: "historico", label: "Histórico" },
    { id: "perfil", label: "Perfil" },
    { id: "pagamentos", label: "Pagamentos" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeSection === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => logout()}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-md text-muted-foreground hover:bg-accent hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto p-6">
        {/* Container com animação simples ou transição pode ser adicionado aqui */}
        <div className="fade-in">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}