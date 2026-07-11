"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar, Clock, User } from "lucide-react"
import { API_BASE } from "@/lib/api-config"
import { ConfirmacaoSessao } from "@/components/consultas/confirmacao-sessao"

type Consulta = {
  id: number
  profissional_nome: string
  data: string
  data_formatada?: string
  horario: string
  status: string
  especialidade?: string
  link_sessao?: string
}

export function ConsultasMarcadas() {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchConsultas()
  }, [])

  const fetchConsultas = async () => {
    setLoading(true)
    setError("")
    try {
      const token = localStorage.getItem("token") || ""
      const res = await fetch(`${API_BASE}/paciente/get_all_consultas.php`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })
      const data = await res.json()
      if (data.success || data.status === "success") {
        const todas = data.consultas || data.data || []
        // Mostra as consultas ativas; esconde só as terminais (enum real).
        setConsultas(
          todas.filter(
            (c: Consulta) =>
              c.status !== "realizada" && c.status !== "cancelada_por_nao_ocorrencia"
          )
        )
      } else {
        setError(data.message || "Erro ao carregar consultas.")
      }
    } catch {
      setError("Erro de conexão ao carregar consultas.")
    } finally {
      setLoading(false)
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmada_ambos":
      case "paga":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{"Confirmada"}</Badge>
      case "link_enviado":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{"Link enviado"}</Badge>
      case "confirmada_paciente":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{"Você confirmou"}</Badge>
      case "confirmada_profissional":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">{"Profissional confirmou"}</Badge>
      case "pendente":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{"Aguardando pagamento"}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

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
        <h2 className="text-2xl font-bold">{"Consultas Marcadas"}</h2>
        <p className="text-muted-foreground mt-1">{"Suas próximas consultas agendadas."}</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {consultas.length === 0 && !error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">{"Você não tem consultas marcadas no momento."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {consultas.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{c.profissional_nome}</span>
                      {c.especialidade && (
                        <span className="text-sm text-muted-foreground">{"- " + c.especialidade}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {c.data_formatada || (c.data ? new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR") : "")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {c.horario}
                      </span>
                    </div>
                    {c.link_sessao && (
                      <a
                        href={c.link_sessao}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {"Acessar sessão online"}
                      </a>
                    )}
                  </div>
                  {statusBadge(c.status)}
                </div>
                <ConfirmacaoSessao consultaId={c.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
