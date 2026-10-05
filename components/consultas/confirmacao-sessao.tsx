"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { API_BASE } from "@/lib/api-config"

type Fase = "inicio" | "fim"

type Estado = {
  meu_papel: "paciente" | "profissional"
  status_consulta: string
  inicio: { paciente: boolean; profissional: boolean }
  fim: { paciente: boolean; profissional: boolean }
}

const nomePapel = (p: "paciente" | "profissional") => (p === "paciente" ? "paciente" : "profissional")

/**
 * Confirmação de início e fim da sessão pelos dois lados.
 * Reutilizável nas telas do profissional e do paciente.
 * Quando os dois confirmam o fim, a consulta vira realizada e o pagamento é liberado.
 */
export function ConfirmacaoSessao({ consultaId }: { consultaId: number | string }) {
  const [estado, setEstado] = useState<Estado | null>(null)
  const [loading, setLoading] = useState(true)
  const [acao, setAcao] = useState<Fase | null>(null)
  const [erro, setErro] = useState("")

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultaId])

  const carregar = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/consultas/confirmar_sessao.php?consulta_id=${consultaId}`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      })
      const data = await res.json()
      if (data.success) setEstado(data.data)
    } catch {
      // silencioso: apenas não mostra a confirmação
    } finally {
      setLoading(false)
    }
  }

  const confirmar = async (fase: Fase) => {
    setAcao(fase)
    setErro("")
    try {
      const res = await fetch(`${API_BASE}/consultas/confirmar_sessao.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ consulta_id: consultaId, fase }),
      })
      const data = await res.json()
      if (data.success) {
        await carregar()
      } else {
        setErro(data.message || "Não foi possível confirmar.")
      }
    } catch {
      setErro("Erro de conexão.")
    } finally {
      setAcao(null)
    }
  }

  if (loading || !estado) return null

  const papel = estado.meu_papel
  const outro = papel === "paciente" ? "profissional" : "paciente"
  const jaRealizada = estado.status_consulta === "realizada"
  const meuInicio = estado.inicio[papel]

  const linha = (fase: Fase) => {
    const meu = estado[fase][papel]
    const doOutro = estado[fase][outro]
    return (
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm">
        <span className="flex items-center gap-2 whitespace-nowrap">
          {meu ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <Circle className="w-4 h-4 text-muted-foreground" />
          )}
          {fase === "inicio" ? "Início da sessão" : "Fim da sessão"}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {doOutro ? `${nomePapel(outro)} confirmou` : `aguardando ${nomePapel(outro)}`}
          </span>
          {!meu && !jaRealizada && (
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg h-7"
              disabled={acao !== null || (fase === "fim" && !meuInicio)}
              onClick={() => confirmar(fase)}
            >
              {acao === fase ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirmar"}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-border/50 bg-card/30 p-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Confirmação da sessão</p>
      {linha("inicio")}
      {linha("fim")}
      {jaRealizada && (
        <p className="text-xs text-emerald-600">Sessão confirmada pelos dois lados. Pagamento liberado.</p>
      )}
      {erro && <p className="text-xs text-red-500">{erro}</p>}
    </div>
  )
}
