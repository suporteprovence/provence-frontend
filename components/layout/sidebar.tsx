"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Calendar,
  MessageSquare,
  Settings,
  Home,
  Users,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  userType: "patient" | "professional" | null
}

export function Sidebar({ userType }: SidebarProps) {
  const pathname = usePathname()

  const professionalLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/agenda", label: "Agenda", icon: Calendar },
    { href: "/dashboard/pacientes", label: "Pacientes", icon: Users },
    { href: "/dashboard/mensagens", label: "Mensagens", icon: MessageSquare },
    { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
  ]

  const patientLinks = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/consultas", label: "Minhas Consultas", icon: Calendar },
    { href: "/dashboard/mensagens", label: "Mensagens", icon: MessageSquare },
    { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings },
  ]

  const links = userType === "professional" ? professionalLinks : patientLinks

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-[#4B0082]">Provence</h2>
      </div>
      <nav className="flex-1 px-4 pb-4">
        <ul className="space-y-1">
          {links.map((link) => {
            const isActive = pathname === link.href
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive ? "bg-[#3681AB] text-white" : "text-gray-700 hover:bg-gray-100",
                  )}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
