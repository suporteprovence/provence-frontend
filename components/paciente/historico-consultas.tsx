"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Calendar, Clock, User, Star } from "lucide-react"
import { API_BASE } from "@/lib/api-config"

// A lista do paciente devolve c.* (inclui pode_ser_avaliada) + nome/especialidade/data_formatada/horario.
type Consulta = {
  id: number
  profissional_nome: string
  especialidade?: string | null
  data_formatada?: string
  data?: string
  horario: string
  status: string
  pode_ser_avaliada?: number | string | boolean
}

type Avaliacao = {
  consulta_id: number
  nota: number
  comentario: string | null
  criado_em: string
}

type FormAvaliacao = {
  aberto: boolean
  nota: number
  hover: number
  comentario: string
  enviando: boolean
  erro: string
}

const FORM_VAZIO: FormAvaliacao = { aberto: false, nota: 0, hover: 0, comentario: "", enviando: false, erro: "" }

// Mesmo padrão do resto do app: o servidor responde 200 com success:false em erro de regra.
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

const dataBR = (c: Consulta) =>
  c.data_formatada || (c.data ? new Date(c.data + "T12:00:00").toLocaleDateString("pt-BR") : "")

const podeAvaliar = (c: Consulta) => c.status === "realizada" && Number(c.pode_ser_avaliada) === 1

function Estrelas({ nota, hover, onHover, onEscolher, somenteLeitura, tamanho = "w-6 h-6" }: {
  nota: number
  hover?: number
  onHover?: (n: number) => void
  onEscolher?: (n: number) => void
  somenteLeitura?: boolean
  tamanho?: string
}) {
  const ativa = hover || nota
  return (
    <div className="flex items-center gap-1" role={somenteLeitura ? "img" : "radiogroup"} aria-label={somenteLeitura ? `Nota ${nota} de 5` : "Escolha a nota"}>
      {[1, 2, 3, 4, 5].map((n) => {
        const cheia = n <= ativa
        const cls = `${tamanho} ${cheia ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`
        if (somenteLeitura) return <Star key={n} className={cls} aria-hidden="true" />
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={nota === n}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-provence-800"
            onMouseEnter={() => onHover?.(n)}
            onMouseLeave={() => onHover?.(0)}
            onFocus={() => onHover?.(n)}
            onBlur={() => onHover?.(0)}
            onClick={() => onEscolher?.(n)}
          >
            <Star className={cls} />
          </button>
        )
      })}
    </div>
  )
}

export function HistoricoConsultas() {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [avaliacoes, setAvaliacoes] = useState<Record<number, Avaliacao>>({})
  const [forms, setForms] = useState<Record<number, FormAvaliacao>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sucesso, setSucesso] = useState("")

  useEffect(() => { carregar() }, [])

  const carregar = async () => {
    setLoading(true)
    setError("")
    try {
      const [lista, minhas] = await Promise.all([
        fetchJson(`${API_BASE}/paciente/get_all_consultas.php`, { method: "GET" }),
        fetchJson(`${API_BASE}/paciente/avaliar-consulta.php`, { method: "GET" }),
      ])
      const todas: Consulta[] = lista?.consultas || lista?.data || []
      // Histórico = só o que já terminou (enum real do banco).
      setConsultas(todas.filter((c) => c.status === "realizada" || c.status === "cancelada_por_nao_ocorrencia"))
      const mapa: Record<number, Avaliacao> = {}
      for (const a of (minhas?.data || []) as Avaliacao[]) mapa[Number(a.consulta_id)] = { ...a, nota: Number(a.nota) }
      setAvaliacoes(mapa)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de conexão ao carregar histórico.")
    } finally {
      setLoading(false)
    }
  }

  const form = (id: number) => forms[id] ?? FORM_VAZIO
  const patchForm = (id: number, p: Partial<FormAvaliacao>) =>
    setForms((prev) => ({ ...prev, [id]: { ...(prev[id] ?? FORM_VAZIO), ...p } }))

  const enviarAvaliacao = async (id: number) => {
    const f = form(id)
    if (f.nota < 1 || f.nota > 5) {
      patchForm(id, { erro: "Escolha de 1 a 5 estrelas." })
      return
    }
    const comentario = f.comentario.trim()
    if (comentario.length > 1000) {
      patchForm(id, { erro: "O comentário deve ter no máximo 1000 caracteres." })
      return
    }
    patchForm(id, { enviando: true, erro: "" })
    setSucesso("")
    try {
      const json = await fetchJson(`${API_BASE}/paciente/avaliar-consulta.php`, {
        method: "POST",
        body: JSON.stringify({ consulta_id: id, nota: f.nota, comentario }),
      })
      setAvaliacoes((prev) => ({
        ...prev,
        [id]: { consulta_id: id, nota: f.nota, comentario: comentario || null, criado_em: new Date().toISOString() },
      }))
      setForms((prev) => ({ ...prev, [id]: { ...FORM_VAZIO } }))
      setSucesso(json?.message || "Obrigado pela avaliação!")
    } catch (e) {
      patchForm(id, { enviando: false, erro: e instanceof Error ? e.message : "Não foi possível enviar a avaliação." })
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "realizada":
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Realizada</Badge>
      case "cancelada_por_nao_ocorrencia":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelada</Badge>
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
        <h2 className="text-2xl font-bold">Histórico de Consultas</h2>
        <p className="text-muted-foreground mt-1">Consultas já realizadas ou canceladas. Você pode avaliar as que aconteceram.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {sucesso && (
        <Alert variant="success">
          <AlertDescription>{sucesso}</AlertDescription>
        </Alert>
      )}

      {consultas.length === 0 && !error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Nenhuma consulta no histórico.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {consultas.map((c) => {
            const av = avaliacoes[c.id]
            const f = form(c.id)
            return (
              <Card key={c.id}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{c.profissional_nome}</span>
                        {c.especialidade && <span className="text-sm text-muted-foreground">{c.especialidade}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{dataBR(c)}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{c.horario}</span>
                      </div>
                    </div>
                    {statusBadge(c.status)}
                  </div>

                  {c.status === "realizada" && (
                    av ? (
                      <div className="rounded-xl border border-provence-300 bg-provence-50/60 p-4 space-y-2">
                        <p className="text-sm font-medium text-provence-950">Sua avaliação</p>
                        <Estrelas nota={av.nota} somenteLeitura tamanho="w-5 h-5" />
                        {av.comentario && <p className="text-sm text-muted-foreground">{av.comentario}</p>}
                      </div>
                    ) : podeAvaliar(c) ? (
                      f.aberto ? (
                        <div className="rounded-xl border border-provence-300 bg-provence-50/60 p-4 space-y-3">
                          <p className="text-sm font-medium text-provence-950">Como foi o atendimento?</p>
                          <Estrelas
                            nota={f.nota}
                            hover={f.hover}
                            onHover={(n) => patchForm(c.id, { hover: n })}
                            onEscolher={(n) => patchForm(c.id, { nota: n, erro: "" })}
                          />
                          <Textarea
                            value={f.comentario}
                            maxLength={1000}
                            rows={3}
                            placeholder="Deixe um comentário (opcional)"
                            onChange={(e) => patchForm(c.id, { comentario: e.target.value, erro: "" })}
                            disabled={f.enviando}
                            className="rounded-xl bg-card/50 border-border/50"
                            aria-label="Comentário da avaliação"
                          />
                          {f.erro && <p className="text-xs text-red-500">{f.erro}</p>}
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-primary" onClick={() => enviarAvaliacao(c.id)} disabled={f.enviando}>
                              {f.enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Enviar avaliação
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setForms((prev) => ({ ...prev, [c.id]: { ...FORM_VAZIO } }))} disabled={f.enviando}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => patchForm(c.id, { aberto: true })}>
                          <Star className="w-4 h-4 mr-2" /> Avaliar atendimento
                        </Button>
                      )
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        A avaliação fica disponível depois que a sessão é confirmada pelos dois lados.
                      </p>
                    )
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
