"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Calendar, Clock, CreditCard, User, RotateCcw } from "lucide-react"
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

type DialogReembolso = { consultaId: number; valor: number; motivo: string; enviando: boolean; erro: string }
type InfoPix = { consultaId: number; pix_key: string; valor: number; expires_at: string }

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  const text = await res.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch { json = null }
  if (!res.ok) throw new Error(json?.message || `Erro ${res.status}`)
  if (json && json.success === false) throw new Error(json.message || "Não foi possível concluir a ação.")
  return json
}

const brl = (v: number) => "R$ " + Number(v || 0).toFixed(2).replace(".", ",")

export function PagamentosPage() {
  const [itens, setItens] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sucesso, setSucesso] = useState("")
  const [pagando, setPagando] = useState<number | null>(null)
  const [pix, setPix] = useState<InfoPix | null>(null)
  const [reembolso, setReembolso] = useState<DialogReembolso | null>(null)

  useEffect(() => { carregar() }, [])

  const carregar = async () => {
    setLoading(true)
    setError("")
    try {
      const json = await fetchJson(`${API_BASE}/paciente/get_pagamentos.php`, { method: "GET" })
      setItens(Array.isArray(json?.data) ? json.data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de conexão.")
    } finally {
      setLoading(false)
    }
  }

  // Pagamento online real é a próxima etapa; hoje o servidor devolve um Pix de
  // simulação, e a tela deixa isso explícito para ninguém achar que pagou.
  const pagar = async (it: Item) => {
    setPagando(it.consulta_id)
    setSucesso("")
    setError("")
    try {
      const json = await fetchJson(`${API_BASE}/pagamentos/gerar_qrcode.php`, {
        method: "POST",
        body: JSON.stringify({
          valor: it.valor,
          descricao: `Consulta com ${it.profissional_nome} em ${it.data_formatada} às ${it.horario}`,
        }),
      })
      const d = json?.data || json
      setPix({ consultaId: it.consulta_id, pix_key: String(d?.pix_key || ""), valor: Number(d?.valor ?? it.valor), expires_at: String(d?.expires_at || "") })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível gerar o pagamento.")
    } finally {
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
      setSucesso(json?.message || "Pedido de reembolso enviado.")
      await carregar()
    } catch (e) {
      setReembolso((r) => (r ? { ...r, enviando: false, erro: e instanceof Error ? e.message : "Não foi possível enviar o pedido." } : r))
    }
  }

  const badgePagamento = (p: Pagamento | null) => {
    if (!p) return <Badge variant="secondary">Sem pagamento</Badge>
    switch (p.status) {
      case "aprovado":
      case "liberado":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Pago</Badge>
      case "pendente":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pagamento pendente</Badge>
      case "reembolsado":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Reembolsado</Badge>
      case "falhou":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Pagamento falhou</Badge>
      default:
        return <Badge variant="secondary">{p.status}</Badge>
    }
  }

  const badgeReembolso = (r: Reembolso | null) => {
    if (!r) return null
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
        <p className="text-muted-foreground mt-1">Acompanhe o pagamento das suas consultas e peça reembolso quando precisar.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {sucesso && (
        <Alert variant="success">
          <AlertDescription>{sucesso}</AlertDescription>
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
            <Card key={it.consulta_id}>
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
                    </div>
                    <p className="text-xs text-muted-foreground">Consulta: {rotuloConsulta(it.status_consulta)}</p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {badgePagamento(it.pagamento)}
                      {badgeReembolso(it.reembolso)}
                    </div>
                    <div className="flex items-center gap-2">
                      {it.pode_pagar && (
                        <Button size="sm" className="bg-primary" onClick={() => pagar(it)} disabled={pagando === it.consulta_id}>
                          {pagando === it.consulta_id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Pagar via Pix"}
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
                Valor a reembolsar: <span className="font-medium text-foreground">{brl(reembolso.valor)}</span>. O pedido vai para análise da Provence e a consulta é cancelada.
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

      {/* Pix de simulação (até a integração real de pagamento) */}
      <Dialog open={pix !== null} onOpenChange={(open) => { if (!open) setPix(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagamento via Pix</DialogTitle>
          </DialogHeader>
          {pix && (
            <div className="space-y-3">
              <Alert variant="warning">
                <AlertDescription>
                  Ambiente de teste: este código é uma simulação e não gera cobrança real. O pagamento online de verdade está previsto para a próxima etapa.
                </AlertDescription>
              </Alert>
              <p className="text-sm">Valor: <span className="font-medium">{brl(pix.valor)}</span></p>
              <code className="block break-all rounded-xl border border-provence-300 bg-provence-50/60 p-3 text-xs">{pix.pix_key}</code>
              {pix.expires_at && <p className="text-xs text-muted-foreground">Válido até {pix.expires_at}</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
