"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, CalendarDays, Clock, CreditCard, Loader2 } from "lucide-react"
import type { Profissional } from "./agendar-consulta"
import { API_BASE } from "@/lib/api-config"

interface Props {
  profissional: Profissional
  onBack: () => void
}

type HorarioDisponivel = {
  data: string
  horarios: string[]
}

export function AgendamentoForm({ profissional, onBack }: Props) {
  const [horariosData, setHorariosData] = useState<HorarioDisponivel[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  // Id da consulta recém-criada: enquanto existir, a tela oferece "Pagar agora".
  const [consultaCriadaId, setConsultaCriadaId] = useState<number | null>(null)
  const [pagando, setPagando] = useState(false)

  useEffect(() => {
    carregarHorarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profissional.id])

  // Próximos 14 dias em ISO (data local, sem o fuso empurrar pro dia anterior).
  const proximosDias = (qtd = 14) => {
    const out: string[] = []
    const hoje = new Date()
    for (let i = 0; i < qtd; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i)
      out.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      )
    }
    return out
  }

  // O backend devolve horários POR data (exige profissional_id + data). Buscamos
  // os próximos dias em paralelo e ficamos só com os que têm horário disponível.
  const carregarHorarios = async () => {
    setLoading(true)
    setError("")
    setSelectedDate("")
    setSelectedTime("")
    try {
      const resultados = await Promise.all(
        proximosDias(14).map(async (iso) => {
          try {
            const res = await fetch(
              `${API_BASE}/agendamento/get-horarios-disponiveis.php?profissional_id=${profissional.id}&data=${iso}`,
              { method: "GET", headers: { Accept: "application/json" }, credentials: "include" }
            )
            const data = await res.json()
            const horarios =
              data.success || data.status === "success" ? data.data || data.horarios || [] : []
            return { data: iso, horarios: Array.isArray(horarios) ? horarios : [] }
          } catch {
            return { data: iso, horarios: [] as string[] }
          }
        })
      )
      setHorariosData(resultados.filter((r) => r.horarios.length > 0))
    } catch {
      setError("Erro de conexão ao carregar horários.")
    } finally {
      setLoading(false)
    }
  }

  const handleAgendar = async () => {
    if (!selectedDate || !selectedTime) {
      setError("Selecione uma data e um horário.")
      return
    }

    setSubmitting(true)
    setError("")
    setSuccess("")
    setConsultaCriadaId(null)

    try {
      const token = localStorage.getItem("token") || ""
      const res = await fetch(`${API_BASE}/agendamento/agendar-consulta.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          profissional_id: profissional.id,
          data: selectedDate,
          horario: selectedTime,
        }),
      })
      const data = await res.json()
      if (data.success || data.status === "success") {
        setSuccess(data.message || "Consulta agendada com sucesso!")
        setSelectedDate("")
        setSelectedTime("")
        const novoId = Number(data.data?.consulta_id)
        setConsultaCriadaId(Number.isFinite(novoId) && novoId > 0 ? novoId : null)
      } else {
        setError(data.message || "Erro ao agendar consulta.")
      }
    } catch {
      setError("Erro de conexão ao agendar consulta.")
    } finally {
      setSubmitting(false)
    }
  }

  // Cria a preferência no Mercado Pago para a consulta recém-agendada e vai para o checkout.
  const pagarAgora = async () => {
    if (!consultaCriadaId) return
    setPagando(true)
    setError("")
    let redirecionou = false
    try {
      const token = localStorage.getItem("token") || ""
      const res = await fetch(`${API_BASE}/pagamentos/criar_pagamento.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ consulta_id: consultaCriadaId }),
      })
      if (res.status === 503) {
        setError("O pagamento online ainda não está ativo.")
        return
      }
      const data = await res.json().catch(() => null)
      const initPoint = data?.data?.init_point
      if (res.ok && data?.success && typeof initPoint === "string" && initPoint) {
        redirecionou = true
        window.location.href = initPoint
        return
      }
      setError(data?.message || "Não foi possível iniciar o pagamento. Tente novamente.")
    } catch {
      setError("Erro de conexão ao iniciar o pagamento.")
    } finally {
      // Mantém o spinner enquanto o navegador troca de página.
      if (!redirecionou) setPagando(false)
    }
  }

  const horariosForDate = horariosData.find((h) => h.data === selectedDate)?.horarios || []

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        {"Voltar"}
      </Button>

      {/* Info do profissional */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              {profissional.foto_perfil && (
                <AvatarImage src={profissional.foto_perfil} alt={profissional.nome} />
              )}
              <AvatarFallback className="bg-blue-500 text-white text-lg">
                {profissional.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{profissional.nome}</h3>
              <p className="text-sm text-muted-foreground">{profissional.especialidade || "Psicologia"}</p>
              <Badge variant="outline" className="mt-1">
                {"R$ " + Number(profissional.valor_consulta).toFixed(2).replace(".", ",")}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription className="text-emerald-700">
            <p className="font-medium">{success}</p>
            {consultaCriadaId && (
              <div className="mt-3 space-y-3">
                <p className="text-muted-foreground">
                  {"Para garantir o horário, faça o pagamento agora. Se preferir, você pode pagar depois em Consultas Marcadas ou na aba Pagamentos."}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={pagarAgora} disabled={pagando} className="gap-2">
                    {pagando ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {"Abrindo pagamento..."}
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        {"Pagar agora"}
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setConsultaCriadaId(null)} disabled={pagando}>
                    {"Pagar depois"}
                  </Button>
                </div>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : horariosData.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">{"Nenhum horário disponível no momento."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Selecionar Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="w-5 h-5" />
                {"Selecione a data"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {horariosData.map((item) => (
                  <Button
                    key={item.data}
                    variant={selectedDate === item.data ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => {
                      setSelectedDate(item.data)
                      setSelectedTime("")
                    }}
                  >
                    {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selecionar Horário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-5 h-5" />
                {"Selecione o horário"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-sm text-muted-foreground">{"Selecione uma data primeiro."}</p>
              ) : horariosForDate.length === 0 ? (
                <p className="text-sm text-muted-foreground">{"Nenhum horário para esta data."}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {horariosForDate.map((horario) => (
                    <Button
                      key={horario}
                      variant={selectedTime === horario ? "default" : "outline"}
                      onClick={() => setSelectedTime(horario)}
                    >
                      {horario}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmar */}
      {selectedDate && selectedTime && (
        <div className="flex justify-end">
          <Button onClick={handleAgendar} disabled={submitting} className="min-w-[200px]">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {"Agendando..."}
              </>
            ) : (
              "Confirmar Agendamento"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
