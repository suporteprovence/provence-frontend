"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Calendar,
  MessageSquare,
  History,
  User,
  CreditCard,
  LogOut,
  LayoutDashboard,
} from "lucide-react"

import { AgendarConsulta, type Profissional } from "@/components/paciente/agendar-consulta"
import { ConsultasMarcadas } from "@/components/paciente/consultas-marcadas"
import { ChatPage } from "@/components/paciente/chat-page"
import { HistoricoConsultas } from "@/components/paciente/historico-consultas"
import { MeuPerfil } from "@/components/paciente/meu-perfil"
import { PagamentosPage } from "@/components/paciente/pagamentos-page"
import { AgendamentoForm } from "@/components/paciente/agendamento-form"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { logout } from "@/lib/logout"

type PatientUser = {
  id?: number
  nome?: string
  email?: string
}

export default function PatientDashboard() {
  const [activeItem, setActiveItem] = useState<
    "dashboard" | "agendar" | "consultas" | "chat" | "historico" | "perfil" | "pagamentos"
  >("dashboard")

  const [showAgendamentoForm, setShowAgendamentoForm] = useState(false)
  const [selectedProfissional, setSelectedProfissional] = useState<Profissional | null>(null)

  // Dados do usuário (sem hardcode)
  const [user, setUser] = useState<PatientUser>({})

  useEffect(() => {
    // Ajuste as chaves conforme você salvou no login
    // Exemplos comuns: "user", "usuario", "auth_user"
    const raw =
      localStorage.getItem("user") ||
      localStorage.getItem("usuario") ||
      localStorage.getItem("auth_user")

    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        setUser(parsed ?? {})
      } catch {
        setUser({})
      }
    }
  }, [])

  const userName = useMemo(() => {
    const nome = (user?.nome || "").trim()
    return nome.length ? nome : "Paciente"
  }, [user])

  const userEmail = useMemo(() => {
    const email = (user?.email || "").trim()
    return email.length ? email : ""
  }, [user])

  const userInitials = useMemo(() => {
    const base = userName === "Paciente" ? "P" : userName
    const parts = base.split(" ").filter(Boolean)
    const a = parts[0]?.[0] ?? "P"
    const b = parts[1]?.[0] ?? ""
    return (a + b).toUpperCase()
  }, [userName])

  const handleScheduleClick = (profissional: Profissional) => {
    setSelectedProfissional(profissional)
    setShowAgendamentoForm(true)
  }

  const handleBackFromForm = () => {
    setShowAgendamentoForm(false)
    setSelectedProfissional(null)
  }

  const goTo = (item: typeof activeItem) => {
    setActiveItem(item)
    // sempre fecha o form ao trocar de tela
    setShowAgendamentoForm(false)
    setSelectedProfissional(null)
  }

  const renderDashboard = () => {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Olá, {userName}!</h1>
          <p className="text-muted-foreground mt-1">Bem-vindo(a) ao seu painel.</p>
        </div>

        {/* Sem dados fictícios: apenas cards informativos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <p className="text-sm font-medium mb-2">Próximas consultas</p>
            <p className="text-sm text-muted-foreground">
              Quando você tiver consultas marcadas, elas vão aparecer aqui.
            </p>
            <Button variant="link" className="px-0 mt-3" onClick={() => goTo("consultas")}>
              Ver consultas marcadas
            </Button>
          </Card>

          <Card className="p-6">
            <p className="text-sm font-medium mb-2">Agendar nova consulta</p>
            <p className="text-sm text-muted-foreground">
              Agende com um profissional disponível em poucos cliques.
            </p>
            <Button variant="link" className="px-0 mt-3" onClick={() => goTo("agendar")}>
              Ir para agendamento
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    if (activeItem === "dashboard") return renderDashboard()

    switch (activeItem) {
      case "agendar":
        return showAgendamentoForm && selectedProfissional ? (
          <AgendamentoForm profissional={selectedProfissional} onBack={handleBackFromForm} />
        ) : (
          <AgendarConsulta onScheduleClick={handleScheduleClick} />
        )
      case "consultas":
        return <ConsultasMarcadas />
      case "chat":
        return <ChatPage />
      case "historico":
        return <HistoricoConsultas />
      case "perfil":
        return <MeuPerfil />
      case "pagamentos":
        return <PagamentosPage />
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0A1E3D] text-white flex flex-col fixed h-full">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-bold">Provence</h1>
          <p className="text-xs text-white/70">Psicologia Online</p>
        </div>

        {/* User Profile */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-blue-500 text-white">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0A1E3D]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{userName}</p>
              {userEmail ? (
                <p className="text-xs text-white/70 truncate">{userEmail}</p>
              ) : (
                <p className="text-xs text-white/70 truncate"> </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => goTo("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeItem === "dashboard" ? "bg-purple-600 text-white" : "text-white/70 hover:bg-white/5"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm font-medium">Dashboard</span>
          </button>

          <button
            onClick={() => goTo("agendar")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeItem === "agendar" ? "bg-purple-600 text-white" : "text-white/70 hover:bg-white/5"
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">Agendar Consulta</span>
          </button>

          <button
            onClick={() => goTo("consultas")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeItem === "consultas" ? "bg-purple-600 text-white" : "text-white/70 hover:bg-white/5"
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">Consultas Marcadas</span>
          </button>

          <button
            onClick={() => goTo("chat")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeItem === "chat" ? "bg-purple-600 text-white" : "text-white/70 hover:bg-white/5"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm font-medium">Chat</span>
          </button>

          <button
            onClick={() => goTo("historico")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeItem === "historico" ? "bg-purple-600 text-white" : "text-white/70 hover:bg-white/5"
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-sm font-medium">Histórico</span>
          </button>

          <button
            onClick={() => goTo("perfil")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeItem === "perfil" ? "bg-purple-600 text-white" : "text-white/70 hover:bg-white/5"
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-sm font-medium">Meu Perfil</span>
          </button>

          <button
            onClick={() => goTo("pagamentos")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeItem === "pagamentos" ? "bg-purple-600 text-white" : "text-white/70 hover:bg-white/5"
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-sm font-medium">Pagamentos</span>
          </button>
        </nav>

        {/* Bottom Actions (sem lógica fictícia) */}
        <div className="p-4 border-t border-white/10 space-y-1">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/70 hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Top Header */}
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="flex items-center justify-end gap-4 px-8 py-4">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">Paciente</p>
              </div>
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-blue-500 text-white">{userInitials}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">{renderContent()}</div>
      </main>
    </div>
  )
}
