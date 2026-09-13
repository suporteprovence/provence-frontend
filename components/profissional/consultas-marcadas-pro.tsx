"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Phone,
  RefreshCw,
  Timer,
  Video,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { API_BASE } from "@/lib/api-config"

// --- Tipagens ---

// Enum real da coluna consultas.status
type StatusConsulta =
  | "pendente"
  | "paga"
  | "link_enviado"
  | "confirmada_paciente"
  | "confirmada_profissional"
  | "confirmada_ambos"
  | "realizada"
  | "cancelada_por_nao_ocorrencia"

// Agrupamento usado nas abas e nas cores dos badges
type GrupoStatus = "pendente" | "confirmada" | "concluida" | "cancelada"

type TipoAtendimento = "video" | "presencial" | "phone"

interface Consulta {
  id: string
  pacienteNome: string
  pacienteEmail: string
  data: string // YYYY-MM-DD (data local do banco)
  hora: string // HH:mm
  duracaoMin: number | null
  valor: number | null
  status: StatusConsulta | string
  grupo: GrupoStatus
  tipo: TipoAtendimento
  linkSessao?: string
}

// Confirmacao de inicio/termino registrada pelo profissional (lado dele)
interface ConfirmacaoLocal {
  inicio: boolean
  fim: boolean
}

// Estados que o backend (consultas/confirmar_sessao.php) aceita confirmar
const STATUS_CONFIRMAVEIS: ReadonlyArray<string> = [
  "paga",
  "link_enviado",
  "confirmada_paciente",
  "confirmada_profissional",
  "confirmada_ambos",
]

// --- Helpers de normalizacao (mesma leitura do gerenciar-agenda) ---

function grupoDoStatus(status: string): GrupoStatus {
  const s = status.toLowerCase().trim()
  if (s.includes("cancel")) return "cancelada"
  if (s === "realizada" || s.includes("concl") || s.includes("final")) return "concluida"
  if (s.includes("confirm") || s === "paga" || s === "link_enviado") return "confirmada"
  return "pendente"
}

function rotuloDoStatus(status: string): string {
  switch (status) {
    case "pendente": return "Aguardando pagamento"
    case "paga": return "Paga"
    case "link_enviado": return "Link enviado"
    case "confirmada_paciente": return "Confirmada pelo paciente"
    case "confirmada_profissional": return "Confirmada por você"
    case "confirmada_ambos": return "Confirmada por ambos"
    case "realizada": return "Realizada"
    case "cancelada_por_nao_ocorrencia": return "Cancelada"
    default: return status || "Sem status"
  }
}

function normalizarTipo(raw: unknown): TipoAtendimento {
  const t = String(raw ?? "").toLowerCase().trim()
  if (t.includes("presen") || t.includes("local")) return "presencial"
  if (t.includes("tel") || t.includes("phone")) return "phone"
  return "video"
}

function somenteData(dateLike: unknown): string {
  const s = String(dateLike ?? "").trim()
  if (!s) return ""
  if (s.includes("T")) return s.split("T")[0]
  if (s.includes(" ")) return s.split(" ")[0]
  return s
}

function somenteHora(timeLike: unknown): string {
  const s = String(timeLike ?? "").trim()
  if (!s) return ""
  // "2026-09-14 10:00:00" -> "10:00"; "10:00:00" -> "10:00"
  const parte = s.includes("T") ? s.split("T")[1] : s.includes(" ") ? s.split(" ")[1] : s
  return (parte || "").slice(0, 5)
}

function numeroOuNulo(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function mapearConsulta(item: any): Consulta {
  const id = String(item?.id ?? item?.consulta_id ?? item?.id_consulta ?? "")
  const nome = item?.paciente_nome ?? item?.nome_paciente ?? item?.paciente?.nome ?? "Paciente"
  const status = String(item?.status ?? item?.situacao ?? "pendente").toLowerCase().trim()
  const data = somenteData(item?.data ?? item?.data_consulta ?? item?.data_hora)
  const hora = somenteHora(item?.horario ?? item?.hora ?? item?.data_hora)
  const link = item?.link_sessao ?? item?.link_reuniao ?? ""

  return {
    id,
    pacienteNome: String(nome),
    pacienteEmail: String(item?.paciente_email ?? ""),
    data,
    hora,
    duracaoMin: numeroOuNulo(item?.duracao_minutos ?? item?.duracao),
    valor: numeroOuNulo(item?.valor_pago ?? item?.valor),
    status,
    grupo: grupoDoStatus(status),
    tipo: normalizarTipo(item?.tipo ?? item?.tipo_atendimento),
    linkSessao: link ? String(link) : undefined,
  }
}

// Data de hoje no fuso LOCAL do navegador. Nunca usar toISOString aqui:
// ele converte para UTC e, no Brasil, vira o dia seguinte a partir das 21h.
function hojeLocal(): string {
  const agora = new Date()
  const y = agora.getFullYear()
  const m = String(agora.getMonth() + 1).padStart(2, "0")
  const d = String(agora.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function chaveOrdenacao(c: Consulta): string {
  return `${c.data} ${c.hora}`
}

function formatarData(data: string): string {
  if (!data) return "Data não informada"
  const [y, m, d] = data.split("-").map(Number)
  if (!y || !m || !d) return data
  // Monta a data por partes para nao sofrer deslocamento de fuso
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
}

function formatarValor(valor: number | null): string {
  if (valor === null) return "Valor não informado"
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

// --- Componente ---

export function ConsultasMarcadasPro() {
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const [hoje, setHoje] = useState(hojeLocal)

  // Estado de confirmacao por consulta (lado do profissional)
  const [confirmacoes, setConfirmacoes] = useState<Record<string, ConfirmacaoLocal>>({})
  const [acaoEmAndamento, setAcaoEmAndamento] = useState<string | null>(null)
  const [mensagemCard, setMensagemCard] = useState<Record<string, { tipo: "ok" | "erro"; texto: string }>>({})

  const lerJson = async (res: Response) => {
    const texto = await res.text()
    try {
      return texto ? JSON.parse(texto) : null
    } catch {
      return null
    }
  }

  const carregarConfirmacoes = useCallback(async (lista: Consulta[]) => {
    const confirmaveis = lista.filter((c) => STATUS_CONFIRMAVEIS.includes(c.status))
    if (confirmaveis.length === 0) return
    const resultados = await Promise.all(
      confirmaveis.map(async (c) => {
        try {
          const res = await fetch(`${API_BASE}/consultas/confirmar_sessao.php?consulta_id=${encodeURIComponent(c.id)}`, {
            credentials: "include",
            headers: { Accept: "application/json" },
          })
          const data = await lerJson(res)
          if (data?.success && data?.data) {
            return [c.id, { inicio: !!data.data.inicio?.profissional, fim: !!data.data.fim?.profissional }] as const
          }
        } catch {
          // silencioso: sem o estado, o card mostra "Confirmar início" e o backend valida
        }
        return null
      }),
    )
    setConfirmacoes((prev) => {
      const novo = { ...prev }
      for (const r of resultados) if (r) novo[r[0]] = r[1]
      return novo
    })
  }, [])

  const carregarConsultas = useCallback(async () => {
    setLoading(true)
    setErro("")
    try {
      const res = await fetch(`${API_BASE}/profissional/get_all_consultas.php`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      })
      const data = await lerJson(res)
      if (!res.ok) throw new Error(data?.message || `Erro ${res.status}`)
      // O backend responde HTTP 200 com success:false; nao tratar como sucesso.
      if (data && data.success === false) throw new Error(data.message || "Não foi possível carregar as consultas.")

      const lista = Array.isArray(data) ? data : data?.data ?? []
      const mapeadas: Consulta[] = lista.map(mapearConsulta)
      mapeadas.sort((a, b) => chaveOrdenacao(a).localeCompare(chaveOrdenacao(b)))

      setHoje(hojeLocal())
      setConsultas(mapeadas)
      setMensagemCard({})
      void carregarConfirmacoes(mapeadas)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar consultas.")
    } finally {
      setLoading(false)
    }
  }, [carregarConfirmacoes])

  useEffect(() => {
    void carregarConsultas()
  }, [carregarConsultas])

  // POST consultas/confirmar_sessao.php  { consulta_id, fase: "inicio" | "fim" }
  const confirmarSessao = async (consulta: Consulta, fase: "inicio" | "fim") => {
    const chave = `${consulta.id}:${fase}`
    setAcaoEmAndamento(chave)
    setMensagemCard((prev) => {
      const { [consulta.id]: _removida, ...resto } = prev
      return resto
    })
    try {
      const res = await fetch(`${API_BASE}/consultas/confirmar_sessao.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ consulta_id: Number(consulta.id) || consulta.id, fase }),
      })
      const data = await lerJson(res)
      if (!res.ok || !data?.success) {
        setMensagemCard((prev) => ({
          ...prev,
          [consulta.id]: { tipo: "erro", texto: data?.message || "Não foi possível confirmar." },
        }))
        return
      }

      // Resposta: { success, message, pagamento_liberado, status_consulta, estado: { inicio: {...}, fim: {...} } }
      const estado = data.estado
      setConfirmacoes((prev) => ({
        ...prev,
        [consulta.id]: {
          inicio: estado?.inicio?.profissional ?? (fase === "inicio" ? true : prev[consulta.id]?.inicio ?? false),
          fim: estado?.fim?.profissional ?? (fase === "fim" ? true : prev[consulta.id]?.fim ?? false),
        },
      }))
      if (data.status_consulta) {
        const novoStatus = String(data.status_consulta)
        setConsultas((prev) =>
          prev.map((c) => (c.id === consulta.id ? { ...c, status: novoStatus, grupo: grupoDoStatus(novoStatus) } : c)),
        )
      }
      setMensagemCard((prev) => ({
        ...prev,
        [consulta.id]: { tipo: "ok", texto: data.message || "Confirmação registrada." },
      }))
    } catch {
      setMensagemCard((prev) => ({ ...prev, [consulta.id]: { tipo: "erro", texto: "Erro de conexão." } }))
    } finally {
      setAcaoEmAndamento(null)
    }
  }

  // --- Listas das abas (data LOCAL) ---
  const ativa = (c: Consulta) => c.grupo === "pendente" || c.grupo === "confirmada"

  const consultasHoje = useMemo(() => consultas.filter((c) => ativa(c) && c.data === hoje), [consultas, hoje])
  const consultasProximas = useMemo(() => consultas.filter((c) => ativa(c) && c.data > hoje), [consultas, hoje])
  const consultasConcluidas = useMemo(
    () => consultas.filter((c) => c.grupo === "concluida").slice().reverse(),
    [consultas],
  )
  const consultasTodas = useMemo(() => consultas.slice().reverse(), [consultas])

  // --- Visual ---
  const corDoGrupo = (grupo: GrupoStatus) => {
    switch (grupo) {
      case "confirmada": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
      case "pendente": return "bg-amber-500/10 text-amber-600 border-amber-500/20"
      case "cancelada": return "bg-red-500/10 text-red-600 border-red-500/20"
      case "concluida": return "bg-blue-500/10 text-blue-600 border-blue-500/20"
    }
  }

  const iconeDoTipo = (tipo: TipoAtendimento) => {
    switch (tipo) {
      case "video": return <Video className="w-4 h-4" />
      case "presencial": return <Calendar className="w-4 h-4" />
      case "phone": return <Phone className="w-4 h-4" />
    }
  }

  const rotuloDoTipo = (tipo: TipoAtendimento) => {
    switch (tipo) {
      case "video": return "Videochamada"
      case "presencial": return "Presencial"
      case "phone": return "Telefone"
    }
  }

  const renderCard = (consulta: Consulta) => {
    const podeConfirmar = STATUS_CONFIRMAVEIS.includes(consulta.status)
    const conf = confirmacoes[consulta.id] ?? { inicio: false, fim: false }
    const mostrarInicio = podeConfirmar && !conf.inicio
    const mostrarFim = podeConfirmar && conf.inicio && !conf.fim
    const aguardandoPaciente = podeConfirmar && conf.inicio && conf.fim
    // Link so faz sentido em consulta ativa (nao cancelada nem ja realizada)
    const mostrarLink = !!consulta.linkSessao && ativa(consulta)
    const msg = mensagemCard[consulta.id]

    return (
      <Card key={consulta.id} className="glass p-4 sm:p-6 border-border/50 hover:shadow-xl transition-all">
        <div className="flex items-start gap-3 sm:gap-4">
          <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-primary/20 shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-provence-800 to-provence-950 text-white font-semibold">
              {iniciais(consulta.pacienteNome) || "P"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-lg truncate">{consulta.pacienteNome}</h4>
                <p className="text-sm text-muted-foreground">
                  {"Consulta #" + consulta.id}
                  {consulta.pacienteEmail ? " · " + consulta.pacienteEmail : ""}
                </p>
              </div>
              <Badge variant="secondary" className={corDoGrupo(consulta.grupo)}>
                {rotuloDoStatus(consulta.status)}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 shrink-0" />
                {formatarData(consulta.data)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 shrink-0" />
                {consulta.hora || "Hora não informada"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Timer className="w-4 h-4 shrink-0" />
                {consulta.duracaoMin !== null ? consulta.duracaoMin + " min" : "Duração não informada"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Banknote className="w-4 h-4 shrink-0" />
                {formatarValor(consulta.valor)}
              </div>
              <Badge variant="secondary" className="bg-card/50 border-border/50">
                {iconeDoTipo(consulta.tipo)}
                <span className="ml-1">{rotuloDoTipo(consulta.tipo)}</span>
              </Badge>
            </div>

            {(mostrarInicio || mostrarFim || aguardandoPaciente || mostrarLink) && (
              <div className="flex flex-wrap items-center gap-2">
                {mostrarInicio && (
                  <Button
                    size="sm"
                    className="rounded-xl bg-gradient-to-r from-provence-800 to-provence-950 text-white"
                    disabled={acaoEmAndamento !== null}
                    onClick={() => confirmarSessao(consulta, "inicio")}
                  >
                    {acaoEmAndamento === `${consulta.id}:inicio` ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Confirmar início
                  </Button>
                )}
                {mostrarFim && (
                  <Button
                    size="sm"
                    className="rounded-xl bg-gradient-to-r from-provence-800 to-provence-950 text-white"
                    disabled={acaoEmAndamento !== null}
                    onClick={() => confirmarSessao(consulta, "fim")}
                  >
                    {acaoEmAndamento === `${consulta.id}:fim` ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                    )}
                    Confirmar término
                  </Button>
                )}
                {aguardandoPaciente && (
                  <span className="text-sm text-muted-foreground">Aguardando o paciente confirmar o término.</span>
                )}
                {mostrarLink && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-provence-300 bg-transparent"
                    onClick={() => window.open(consulta.linkSessao, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir link
                  </Button>
                )}
              </div>
            )}

            {msg && (
              <p className={`text-xs mt-2 ${msg.tipo === "erro" ? "text-red-600" : "text-emerald-600"}`}>{msg.texto}</p>
            )}
          </div>
        </div>
      </Card>
    )
  }

  const renderLista = (lista: Consulta[]) =>
    lista.length === 0 ? (
      <p className="text-center py-10 text-muted-foreground">Nenhuma consulta nesta lista.</p>
    ) : (
      lista.map(renderCard)
    )

  const triggerClass = "rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white"

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Consultas Marcadas</h2>
          <p className="text-muted-foreground">Gerencie suas sessões agendadas</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-4 py-2">
            {consultasHoje.length + (consultasHoje.length === 1 ? " sessão hoje" : " sessões hoje")}
          </Badge>
          <Button variant="outline" size="sm" className="rounded-xl border-provence-300" onClick={carregarConsultas} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Atualizar
          </Button>
        </div>
      </div>

      {erro && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="hoje" className="space-y-6">
          <TabsList className="glass-strong border-border/50 p-1 h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="hoje" className={triggerClass}>
              {"Hoje (" + consultasHoje.length + ")"}
            </TabsTrigger>
            <TabsTrigger value="proximas" className={triggerClass}>
              {"Próximas (" + consultasProximas.length + ")"}
            </TabsTrigger>
            <TabsTrigger value="concluidas" className={triggerClass}>
              {"Concluídas (" + consultasConcluidas.length + ")"}
            </TabsTrigger>
            <TabsTrigger value="todas" className={triggerClass}>
              {"Todas (" + consultasTodas.length + ")"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hoje" className="space-y-4">
            {renderLista(consultasHoje)}
          </TabsContent>
          <TabsContent value="proximas" className="space-y-4">
            {renderLista(consultasProximas)}
          </TabsContent>
          <TabsContent value="concluidas" className="space-y-4">
            {renderLista(consultasConcluidas)}
          </TabsContent>
          <TabsContent value="todas" className="space-y-4">
            {renderLista(consultasTodas)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
