"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar, Clock, Search, Loader2, User } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { API_BASE } from "@/lib/api-config"

type Consulta = {
  id: number
  paciente_nome: string
  data_hora_formatada: string
  data_formatada: string
  duracao_minutos: number
  valor_pago: number | string
  status: string
}

const brl = (v: number | string) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const statusInfo = (s: string): { label: string; cls: string } => {
  switch (s) {
    case "realizada":
    case "confirmada_ambos":
      return {
        label: s === "realizada" ? "Realizada" : "Confirmada",
        cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      }
    case "paga":
    case "link_enviado":
      return {
        label: s === "paga" ? "Paga" : "Link enviado",
        cls: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      }
    case "pendente":
    case "confirmada_paciente":
    case "confirmada_profissional":
      return {
        label: s === "pendente" ? "Pendente" : "Confirmação parcial",
        cls: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      }
    case "cancelada_por_nao_ocorrencia":
      return { label: "Cancelada", cls: "bg-red-500/10 text-red-600 border-red-500/20" }
    default:
      return { label: s, cls: "bg-muted text-muted-foreground" }
  }
}

export function HistoricoProfessional() {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busca, setBusca] = useState("")

  useEffect(() => {
    fetchHistorico()
  }, [])

  const fetchHistorico = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/profissional/get_historico_consultas.php`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      })
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setConsultas(data.data)
      } else {
        setError(data.message || "Não foi possível carregar o histórico.")
      }
    } catch {
      setError("Erro de conexão ao carregar o histórico.")
    } finally {
      setLoading(false)
    }
  }

  const filtradas = useMemo(
    () => consultas.filter((c) => (c.paciente_nome || "").toLowerCase().includes(busca.toLowerCase())),
    [consultas, busca],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Histórico de Consultas</h2>
        <p className="text-muted-foreground">Todas as suas sessões, da mais recente para a mais antiga.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por paciente..."
          className="pl-10 rounded-xl"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {filtradas.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground">Nenhuma consulta encontrada.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtradas.map((c) => {
            const st = statusInfo(c.status)
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {c.paciente_nome}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {c.data_hora_formatada || c.data_formatada}
                      </span>
                      {c.duracao_minutos ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {c.duracao_minutos} min
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{brl(c.valor_pago)}</span>
                    <Badge variant="secondary" className={st.cls}>
                      {st.label}
                    </Badge>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
