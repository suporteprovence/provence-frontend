"use client"

import { useEffect, useState } from "react"
import { Loader2, TrendingUp, Calendar, User, Wallet } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { API_BASE } from "@/lib/api-config"

type Pagamento = {
  id: number
  paciente_nome: string
  data_formatada: string
  valor_pago: number | string
  status: string
}

const brl = (v: number | string) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export function PagamentosProfessional() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [totalMes, setTotalMes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchPagamentos()
  }, [])

  const fetchPagamentos = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/dashboard/get_pagamentos.php`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      })
      const data = await res.json()
      if (data.success && data.data) {
        setPagamentos(Array.isArray(data.data.pagamentos) ? data.data.pagamentos : [])
        setTotalMes(Number(data.data.total_mes) || 0)
      } else {
        setError(data.message || "Não foi possível carregar os pagamentos.")
      }
    } catch {
      setError("Erro de conexão ao carregar os pagamentos.")
    } finally {
      setLoading(false)
    }
  }

  const totalRecebido = pagamentos
    .filter((p) => p.status === "paga" || p.status === "realizada")
    .reduce((s, p) => s + Number(p.valor_pago || 0), 0)

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
        <h2 className="text-2xl font-bold">Pagamentos</h2>
        <p className="text-muted-foreground">Suas receitas das consultas pagas e realizadas.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Recebido no mês</p>
          </div>
          <p className="text-3xl font-bold">{brl(totalMes)}</p>
        </Card>
        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Últimas transações</p>
          </div>
          <p className="text-3xl font-bold">{brl(totalRecebido)}</p>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Últimas transações</h3>
        {pagamentos.length === 0 ? (
          <Card className="p-6 text-center border-border/50">
            <p className="text-muted-foreground">Nenhum pagamento registrado ainda.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {pagamentos.map((p) => (
              <Card key={p.id} className="p-4 border-border/50">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {p.paciente_nome}
                    </div>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {p.data_formatada}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-emerald-600">{brl(p.valor_pago)}</span>
                    <Badge
                      variant="secondary"
                      className={
                        p.status === "realizada"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                      }
                    >
                      {p.status === "realizada" ? "Realizada" : "Paga"}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
