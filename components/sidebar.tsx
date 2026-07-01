"use client"

import { Calendar, User, CreditCard, Settings, Home, HelpCircle, Plus, LogOut, FileText, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { logout } from "@/lib/logout"

interface UserData {
  id: number
  nome: string
  email: string
  telefone?: string
  cpf?: string
  tipo_usuario: string
  especialidade?: string
  valor_consulta?: number
  bio?: string
  foto_perfil?: string
}

interface SidebarProps {
  userData: UserData
}

export default function Sidebar({ userData }: SidebarProps) {
  const pathname = usePathname()

  // Menu items baseado no tipo de usuário
  const getMenuItems = () => {
    if (userData.tipo_usuario === "profissional") {
      return [
        { icon: Home, label: "Início", href: "/profissional", key: "inicio" },
        { icon: Calendar, label: "Consultas", href: "/profissional/consultas", key: "consultas" },
        { icon: FileText, label: "Histórico", href: "/profissional/historico", key: "historico" },
        { icon: User, label: "Meu Perfil", href: "/profissional/perfil", key: "perfil" },
        { icon: Star, label: "Avaliações", href: "/profissional/avaliacoes", key: "avaliacoes" },
        { icon: HelpCircle, label: "Ajuda", href: "/profissional/ajuda", key: "ajuda" },
        { icon: Settings, label: "Configurações", href: "/profissional/configuracoes", key: "configuracoes" },
      ]
    } else {
      return [
        { icon: Home, label: "Início", href: "/paciente", key: "inicio" },
        { icon: Plus, label: "Agendar Consulta", href: "/paciente/agendar", key: "agendar" },
        { icon: Calendar, label: "Minhas Consultas", href: "/paciente/consultas", key: "consultas" },
        { icon: User, label: "Meu Perfil", href: "/paciente/perfil", key: "perfil" },
        { icon: CreditCard, label: "Histórico de Pagamentos", href: "/paciente/pagamentos", key: "pagamentos" },
        { icon: HelpCircle, label: "Ajuda", href: "/paciente/ajuda", key: "ajuda" },
        { icon: Settings, label: "Configurações", href: "/paciente/configuracoes", key: "configuracoes" },
      ]
    }
  }

  const menuItems = getMenuItems()

  const handleLogout = () => {
    logout()
  }

  const isActive = (href: string) => {
    if (href === "/paciente" || href === "/profissional") {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  return (
    <aside className="w-72 bg-slate-900 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-8 border-b border-slate-700">
        <div className="flex items-center justify-center">
          <Image
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/provence_logo-removebg-preview-tXdqi9KCbWwQ89jwGVxJhaGioGvqwe.png"
            alt="Provence Logo"
            width={180}
            height={72}
            className="h-14 w-auto brightness-0 invert"
            priority
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={`flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive(item.href)
                  ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/25"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon
                className={`h-5 w-5 transition-colors ${
                  isActive(item.href) ? "text-white" : "text-slate-400 group-hover:text-purple-400"
                }`}
              />
              <span className="font-medium">{item.label}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* User Info & Logout */}
      <div className="p-6 border-t border-slate-700">
        <div className="flex items-center space-x-3 mb-4 p-3 bg-slate-800 rounded-xl">
          <Avatar className="h-10 w-10">
            <AvatarImage src={userData.foto_perfil || "/placeholder.svg?height=40&width=40"} />
            <AvatarFallback className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              {userData.nome
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">{userData.nome}</p>
            <p className="text-slate-400 text-xs capitalize">
              {userData.tipo_usuario === "profissional" ? userData.especialidade || "Profissional" : "Paciente"}
            </p>
          </div>
        </div>

        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-slate-300 hover:text-red-400 hover:bg-slate-800 transition-colors"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sair
        </Button>
      </div>
    </aside>
  )
}
