"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Loader2,
  Calendar,
  Clock,
  CreditCard,
  User,
  RotateCcw,
  RefreshCw,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
} from "lucide-react"
import { API_BASE } from "@/lib/api-config"

// Contrato de paciente/get_pagamentos.php: uma linha por consulta, com o último
// pagamento, o último reembolso e o que o paciente pode fazer (regra no servidor).
type Pagamento = { id: number; status: string; valor: number; metodo: string | null; data: string | null }
type Reembolso = { id: number; status: string; valor: number; data: string }
type Item = {
  consulta_id: number
  profissional_nome: string
  especialidade: string | null
  data_hora: string
  data_formatada: string
  horario: string
  status_consulta: string
  valor: number
  pagamento: Pagamento | null
  reembolso: Reembolso | null
  pode_pagar: boolean
  pode_pedir_reembolso: boolean
}
type Meta = { pagamento_online: boolean; ambiente: "teste" | "producao" | null; reembolso_horas_min: number }

type Aviso = { variant: "success" | "warning" | "info" | "destructive"; texto: string }
type DialogReembolso = { consultaId: number; valor: number; motivo: string; enviando: boolean; erro: string }

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  const text = await res.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch { json = null }
  if (!res.ok) throw new ApiError(json?.message || `Erro ${res.status}`, res.status)
  if (json && json.success === false) throw new ApiError(json.message || "Não foi possível concluir a ação.", res.status)
  return json
}

const brl = (v: number) => "R$ " + Number(v || 0).toFixed(2).replace(".", ",")

// Parâmetros que a volta do checkout deixa na URL (os nossos e os que o Mercado Pago acrescenta)
const PARAMS_RETORNO = [
  "pagamento", "consulta_id", "payment_id", "status", "collection_id", "collection_status", "external_reference",
  "payment_type", "merchant_order_id", "preference_id", "site_id", "processing_mode", "merchant_account_id",
]

const METODOS: Record<string, string> = {
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  boleto: "Boleto",
  saldo_mp: "Saldo do Mercado Pago",
}
const rotuloMetodo = (m: string | null) => (m ? METODOS[m] || m.replace(/_/g, " ") : "")

// "2026-09-16 15:50:02" -> "16/09/2026 às 15:50"; qualquer outro formato passa como veio
const formataData = (s: string | null) => {
  if (!s) return ""
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/)
  if (!m) return s
  return `${m[3]}/${m[2]}/${m[1]}` + (m[4] ? ` às ${m[4]}:${m[5]}` : "")
}

// Mensagem no topo depois de conferir o pagamento com o Mercado Pago
const mensagemStatus = (status: string | null | undefined, aoAtualizar = false): Aviso => {
  switch (status) {
    case "aprovado":
    case "liberado":
      return { variant: "success", texto: "Pagamento confirmado!" }
    case "pendente":
      return {
        variant: "warning",
        texto: aoAtualizar
          ? "O pagamento ainda está em análise no Mercado Pago. Tente de novo em instantes."
          : "Pagamento em análise, atualizamos assim que o Mercado Pago confirmar.",
      }
    case "falhou":
      return { variant: "destructive", texto: "Pagamento não aprovado. Você pode tentar de novo." }
    case "reembolsado":
      return { variant: "info", texto: "Este pagamento foi reembolsado." }
    default:
      return { variant: "info", texto: "Ainda não recebemos a confirmação do pagamento. Use \"Atualizar status\" em instantes." }
  }
}

const ICONE_AVISO = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  destructive: XCircle,
} as const

export function PagamentosPage() {
  const [itens, setItens] = useState<Item[]>([])
  const [meta, setMeta] = useState<Meta>({ pagamento_online: true, ambiente: null, reembolso_horas_min: 24 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const [pagando, setPagando] = useState<number | null>(null)
  const [sincronizando, setSincronizando] = useState<number | null>(null)
  const [reembolso, setReembolso] = useState<DialogReembolso | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("pagamento") !== "retorno") {
      carregar()
      return
    }
    // Voltamos do checkout do Mercado Pago: confere o pagamento antes de listar
    const consultaId = Number(params.get("consulta_id"))
    const paymentId = params.get("payment_id") || params.get("collection_id") || ""
    // Limpa só os parâmetros do checkout; a aba continua em Pagamentos
    PARAMS_RETORNO.forEach((k) => params.delete(k))
    const resto = params.toString()
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname + (resto ? `?${resto}` : "") + window.location.hash,
    )
    processarRetorno(consultaId, paymentId)
  }, [])

  const carregar = async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    setError("")
    try {
      const json = await fetchJson(`${API_BASE}/paciente/get_pagamentos.php`, { method: "GET" })
      setItens(Array.isArray(json?.data) ? json.data : [])
      const horas = Number(json?.reembolso_horas_min)
      setMeta({
        pagamento_online: json?.pagamento_online !== false,
        ambiente: json?.ambiente === "teste" || json?.ambiente === "producao" ? json.ambiente : null,
        reembolso_horas_min: horas > 0 ? horas : 24,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }

  const sincronizar = async (consultaId: number, paymentId?: string) => {
    const json = await fetchJson(`${API_BASE}/pagamentos/sincronizar_pagamento.php`, {
      method: "POST",
      body: JSON.stringify(paymentId ? { consulta_id: consultaId, payment_id: paymentId } : { consulta_id: consultaId }),
    })
    return json?.data?.status_pagamento as string | null | undefined
  }

  const processarRetorno = async (consultaId: number, paymentId: string) => {
    setLoading(true)
    if (consultaId > 0) {
      try {
        setAviso(mensagemStatus(await sincronizar(consultaId, paymentId || undefined)))
      } catch (e) {
        setAviso({
          variant: "warning",
          texto: e instanceof Error ? e.message : "Não conseguimos confirmar o pagamento agora. Use \"Atualizar status\" em instantes.",
        })
      }
    }
    await carregar()
  }

  const atualizarStatus = async (it: Item) => {
    setSincronizando(it.consulta_id)
    setAviso(null)
    try {
      setAviso(mensagemStatus(await sincronizar(it.consulta_id), true))
      await carregar(true)
    } catch (e) {
      setAviso({ variant: "destructive", texto: e instanceof Error ? e.message : "Não foi possível atualizar o status." })
    } finally {
      setSincronizando(null)
    }
  }

  // Cria a preferência no servidor e leva o paciente ao checkout do Mercado Pago
  const pagar = async (it: Item) => {
    setPagando(it.consulta_id)
    setAviso(null)
    try {
      const json = await fetchJson(`${API_BASE}/pagamentos/criar_pagamento.php`, {
        method: "POST",
        body: JSON.stringify({ consulta_id: it.consulta_id }),
      })
      const url = typeof json?.data?.init_point === "string" ? json.data.init_point : ""
      if (!url) throw new Error("Não recebemos o link de pagamento. Tente de novo.")
      // O botão fica desabilitado enquanto o navegador vai para o Mercado Pago
      window.location.href = url
    } catch (e) {
      if (e instanceof ApiError && e.status === 503) {
        setAviso({ variant: "info", texto: "O pagamento online ainda não está ativo. Fale com a equipe." })
      } else {
        setAviso({ variant: "destructive", texto: e instanceof Error ? e.message : "Não foi possível iniciar o pagamento." })
      }
      setPagando(null)
    }
  }

  const abrirReembolso = (it: Item) =>
    setReembolso({ consultaId: it.consulta_id, valor: it.pagamento?.valor ?? it.valor, motivo: "", enviando: false, erro: "" })

  const enviarReembolso = async () => {
    if (!reembolso) return
    const motivo = reembolso.motivo.trim()
    if (motivo.length < 5) {
      setReembolso({ ...reembolso, erro: "Conte em poucas palavras o motivo do reembolso." })
      return
    }
    if (motivo.length > 500) {
      setReembolso({ ...reembolso, erro: "O motivo deve ter no máximo 500 caracteres." })
      return
    }
    setReembolso({ ...reembolso, enviando: true, erro: "" })
    try {
      const json = await fetchJson(`${API_BASE}/consultas/solicitar_reembolso.php`, {
        method: "POST",
        body: JSON.stringify({ consulta_id: reembolso.consultaId, motivo }),
      })
      setReembolso(null)
      // Estornado na hora (automatico) ou em análise: o servidor explica na message
      setAviso({
        variant: json?.data?.automatico ? "success" : "warning",
        texto: json?.message || (json?.data?.automatico ? "Reembolso feito." : "Pedido de reembolso enviado para análise."),
      })
      await carregar()
    } catch (e) {
      setReembolso((r) => (r ? { ...r, enviando: false, erro: e instanceof Error ? e.message : "Não foi possível enviar o pedido." } : r))
    }
  }

  const badgePagamento = (it: Item) => {
    const p = it.pagamento
    if (!p) return <Badge variant="secondary">{it.pode_pagar ? "Aguardando pagamento" : "Sem pagamento"}</Badge>
    if (it.status_consulta === "cancelada_por_nao_ocorrencia" && (p.status === "aprovado" || p.status === "liberado")) {
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Cancelada, reembolso em análise</Badge>
    }
    switch (p.status) {
      case "aprovado":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Pago, aguardando a sessão</Badge>
      case "liberado":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Liberado</Badge>
      case "pendente":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Aguardando pagamento</Badge>
      case "reembolsado":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Reembolsado</Badge>
      case "falhou":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Não aprovado</Badge>
      default:
        return <Badge variant="secondary">{p.status}</Badge>
    }
  }

  const badgeReembolso = (it: Item) => {
    const r = it.reembolso
    if (!r) return null
    // Pagamento "reembolsado" e reembolso "pago" são a mesma coisa: um badge só
    if (r.status === "pago" && it.pagamento?.status === "reembolsado") return null
    switch (r.status) {
      case "solicitado":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Reembolso em análise</Badge>
      case "aprovado":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Reembolso aprovado</Badge>
      case "recusado":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Reembolso recusado</Badge>
      case "pago":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Reembolsado</Badge>
      default:
        return <Badge variant="secondary">{r.status}</Badge>
    }
  }

  const rotuloConsulta = (s: string) =>
    ({
      pendente: "Aguardando pagamento",
      paga: "Paga",
      link_enviado: "Link da sessão enviado",
      confirmada_paciente: "Você confirmou",
      confirmada_profissional: "Profissional confirmou",
      confirmada_ambos: "Confirmada",
      realizada: "Realizada",
      cancelada_por_nao_ocorrencia: "Cancelada",
    } as Record<string, string>)[s] || s

  const IconeAviso = aviso ? ICONE_AVISO[aviso.variant] : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Pagamentos</h2>
          <p className="text-muted-foreground mt-1">Acompanhe o pagamento das suas consultas e peça reembolso quando precisar.</p>
        </div>
        {meta.ambiente === "teste" && (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Ambiente de teste do Mercado Pago</Badge>
        )}
      </div>

      {!meta.pagamento_online && (
        <Alert variant="info">
          <Info className="h-4 w-4" />
          <AlertDescription>
            O pagamento online ainda não está ativo. Fale com a equipe da Provence para combinar o pagamento da sua consulta.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {aviso && IconeAviso && (
        <Alert variant={aviso.variant}>
          <IconeAviso className="h-4 w-4" />
          <AlertDescription>{aviso.texto}</AlertDescription>
        </Alert>
      )}

      {itens.length === 0 && !error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Nenhuma consulta para pagamento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {itens.map((it) => (
            <Card key={it.consulta_id} data-consulta={it.consulta_id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{it.profissional_nome}</span>
                      {it.especialidade && <span className="text-sm text-muted-foreground">{it.especialidade}</span>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{it.data_formatada}</span>
                      <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{it.horario}</span>
                      <span className="flex items-center gap-1"><CreditCard className="w-4 h-4" />{brl(it.valor)}</span>
                      {it.pagamento?.metodo && (
                        <span className="flex items-center gap-1">
                          <Wallet className="w-4 h-4" />
                          {rotuloMetodo(it.pagamento.metodo)}
                          {it.pagamento.data ? `, ${formataData(it.pagamento.data)}` : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Consulta: {rotuloConsulta(it.status_consulta)}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {badgePagamento(it)}
                      {badgeReembolso(it)}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {it.pode_pagar && (
                        <Button
                          size="sm"
                          className="bg-primary"
                          onClick={() => pagar(it)}
                          disabled={!meta.pagamento_online || pagando === it.consulta_id || sincronizando === it.consulta_id}
                        >
                          {pagando === it.consulta_id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <><CreditCard className="w-4 h-4 mr-2" /> Pagar</>
                          )}
                        </Button>
                      )}
                      {it.pagamento?.status === "pendente" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => atualizarStatus(it)}
                          disabled={sincronizando === it.consulta_id || pagando === it.consulta_id}
                        >
                          {sincronizando === it.consulta_id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Atualizar status
                        </Button>
                      )}
                      {it.pode_pedir_reembolso && (
                        <Button size="sm" variant="outline" onClick={() => abrirReembolso(it)}>
                          <RotateCcw className="w-4 h-4 mr-2" /> Solicitar reembolso
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pedido de reembolso */}
      <Dialog open={reembolso !== null} onOpenChange={(open) => { if (!open && !reembolso?.enviando) setReembolso(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar reembolso</DialogTitle>
          </DialogHeader>
          {reembolso && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Valor a reembolsar: <span className="font-medium text-foreground">{brl(reembolso.valor)}</span>. Ao pedir o reembolso, a consulta é cancelada.
              </p>
              <p className="text-sm text-muted-foreground">
                Cancelamentos com pelo menos {meta.reembolso_horas_min} horas de antecedência são reembolsados na hora; depois disso o pedido passa por análise da Provence.
              </p>
              <div className="space-y-1">
                <Textarea
                  value={reembolso.motivo}
                  maxLength={500}
                  rows={4}
                  placeholder="Conte o motivo do reembolso"
                  onChange={(e) => setReembolso({ ...reembolso, motivo: e.target.value, erro: "" })}
                  disabled={reembolso.enviando}
                  className="rounded-xl"
                  aria-label="Motivo do reembolso"
                />
                <p className="text-xs text-muted-foreground text-right">{reembolso.motivo.length}/500</p>
              </div>
              {reembolso.erro && <p className="text-sm text-red-500">{reembolso.erro}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setReembolso(null)} disabled={reembolso.enviando}>Cancelar</Button>
                <Button className="bg-primary" onClick={enviarReembolso} disabled={reembolso.enviando}>
                  {reembolso.enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Enviar pedido
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
