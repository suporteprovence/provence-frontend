"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarOff, Clock, Info, Loader2, Plus, Save, Trash2, X } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { API_BASE } from "@/lib/api-config"

// --- Tipagens ---
type Dia = "segunda" | "terca" | "quarta" | "quinta" | "sexta" | "sabado" | "domingo"

type Faixa = { inicio: string; fim: string }

type DiaState = { ativo: boolean; faixas: Faixa[] }

type Agenda = Record<Dia, DiaState>

type HorarioApi = {
  id: number
  dia_semana: Dia
  horario_inicio: string
  horario_fim: string
}

type DiaBloqueado = {
  id: number
  data_bloqueada: string
  motivo: string | null
}

const DIAS: { key: Dia; label: string }[] = [
  { key: "segunda", label: "Segunda-feira" },
  { key: "terca", label: "Terça-feira" },
  { key: "quarta", label: "Quarta-feira" },
  { key: "quinta", label: "Quinta-feira" },
  { key: "sexta", label: "Sexta-feira" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
]

const FAIXA_PADRAO: Faixa = { inicio: "09:00", fim: "12:00" }

const agendaVazia = (): Agenda => ({
  segunda: { ativo: false, faixas: [] },
  terca: { ativo: false, faixas: [] },
  quarta: { ativo: false, faixas: [] },
  quinta: { ativo: false, faixas: [] },
  sexta: { ativo: false, faixas: [] },
  sabado: { ativo: false, faixas: [] },
  domingo: { ativo: false, faixas: [] },
})

// --- Helpers ---
const hhmm = (v: string) => String(v ?? "").slice(0, 5)

const minutos = (v: string) => {
  const [h, m] = hhmm(v).split(":").map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN
  return h * 60 + m
}

const hojeISO = () => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${mm}-${dd}`
}

const formatarDataBR = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  if (isNaN(d.getTime())) return iso
  const txt = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  return txt.charAt(0).toUpperCase() + txt.slice(1)
}

// Só o que vai para o servidor: dias ativos, faixas normalizadas.
const montarPayload = (agenda: Agenda) =>
  DIAS.flatMap(({ key }) =>
    agenda[key].ativo
      ? agenda[key].faixas.map((f) => ({
          dia_semana: key,
          horario_inicio: hhmm(f.inicio),
          horario_fim: hhmm(f.fim),
        }))
      : [],
  )

const agendaDaApi = (lista: HorarioApi[]): Agenda => {
  const a = agendaVazia()
  for (const h of lista) {
    const dia = a[h.dia_semana]
    if (!dia) continue
    dia.faixas.push({ inicio: hhmm(h.horario_inicio), fim: hhmm(h.horario_fim) })
  }
  for (const { key } of DIAS) {
    a[key].faixas.sort((x, y) => minutos(x.inicio) - minutos(y.inicio))
    a[key].ativo = a[key].faixas.length > 0
  }
  return a
}

// Mesma resposta HTTP 200 + success:false do resto do painel: tratar como erro.
async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json", ...(init?.headers || {}) },
  })
  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  if (!res.ok) throw new Error(json?.message || `Erro ${res.status}`)
  if (json && json.success === false) {
    const err = new Error(json.message || "Não foi possível concluir a ação.") as Error & { erros?: string[] }
    if (Array.isArray(json.erros)) err.erros = json.erros
    throw err
  }
  return json
}

// --- Componente Exportado ---
export function MeusHorarios() {
  // Seção A: agenda semanal
  const [agenda, setAgenda] = useState<Agenda>(agendaVazia())
  const [agendaSalva, setAgendaSalva] = useState<string>(JSON.stringify(montarPayload(agendaVazia())))
  const [loadingAgenda, setLoadingAgenda] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erroAgenda, setErroAgenda] = useState("")
  const [errosServidor, setErrosServidor] = useState<string[]>([])
  const [errosDia, setErrosDia] = useState<Partial<Record<Dia, string[]>>>({})
  const [sucessoAgenda, setSucessoAgenda] = useState("")
  const [confirmarVazio, setConfirmarVazio] = useState(false)

  // Seção B: dias bloqueados
  const [bloqueios, setBloqueios] = useState<DiaBloqueado[]>([])
  const [loadingBloqueios, setLoadingBloqueios] = useState(true)
  const [erroBloqueios, setErroBloqueios] = useState("")
  const [novaData, setNovaData] = useState("")
  const [novoMotivo, setNovoMotivo] = useState("")
  const [erroForm, setErroForm] = useState("")
  const [bloqueando, setBloqueando] = useState(false)
  const [removendoId, setRemovendoId] = useState<number | null>(null)
  const [sucessoBloqueio, setSucessoBloqueio] = useState("")

  const hoje = useMemo(hojeISO, [])

  useEffect(() => {
    carregarAgenda()
    carregarBloqueios()
  }, [])

  // ---------- Seção A ----------
  const carregarAgenda = async () => {
    setLoadingAgenda(true)
    setErroAgenda("")
    try {
      const json = await fetchJson(`${API_BASE}/profissionais/listar_horarios.php`, { method: "GET" })
      const lista: HorarioApi[] = Array.isArray(json?.data) ? json.data : []
      const a = agendaDaApi(lista)
      setAgenda(a)
      setAgendaSalva(JSON.stringify(montarPayload(a)))
      setErrosDia({})
      setErrosServidor([])
      setConfirmarVazio(false)
    } catch (e) {
      setErroAgenda(e instanceof Error ? e.message : "Erro de conexão ao carregar os horários.")
    } finally {
      setLoadingAgenda(false)
    }
  }

  const temAlteracoes = useMemo(
    () => JSON.stringify(montarPayload(agenda)) !== agendaSalva,
    [agenda, agendaSalva],
  )

  const diasAtivos = useMemo(() => DIAS.filter(({ key }) => agenda[key].ativo).length, [agenda])

  const limparFeedbackAgenda = (dia?: Dia) => {
    setSucessoAgenda("")
    setErroAgenda("")
    setErrosServidor([])
    setConfirmarVazio(false)
    if (dia) {
      setErrosDia((atual) => {
        if (!atual[dia]) return atual
        const novo = { ...atual }
        delete novo[dia]
        return novo
      })
    }
  }

  const alternarDia = (dia: Dia, ativo: boolean) => {
    limparFeedbackAgenda(dia)
    setAgenda((atual) => ({
      ...atual,
      [dia]: {
        ativo,
        // Ligar um dia sem faixas já entrega uma faixa para editar.
        faixas: ativo && atual[dia].faixas.length === 0 ? [{ ...FAIXA_PADRAO }] : atual[dia].faixas,
      },
    }))
  }

  const adicionarFaixa = (dia: Dia) => {
    limparFeedbackAgenda(dia)
    setAgenda((atual) => {
      const faixas = atual[dia].faixas
      const ultima = faixas[faixas.length - 1]
      // Sugere a próxima faixa começando onde a última terminou.
      let nova: Faixa = { ...FAIXA_PADRAO }
      if (ultima && Number.isFinite(minutos(ultima.fim))) {
        const ini = minutos(ultima.fim)
        const fim = Math.min(ini + 60, 23 * 60 + 59)
        const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
        nova = ini + 60 <= 23 * 60 + 59 ? { inicio: fmt(ini), fim: fmt(fim) } : { inicio: "", fim: "" }
      }
      return { ...atual, [dia]: { ...atual[dia], faixas: [...faixas, nova] } }
    })
  }

  const removerFaixa = (dia: Dia, idx: number) => {
    limparFeedbackAgenda(dia)
    setAgenda((atual) => {
      const faixas = atual[dia].faixas.filter((_, i) => i !== idx)
      return { ...atual, [dia]: { ativo: faixas.length > 0 ? atual[dia].ativo : false, faixas } }
    })
  }

  const setFaixa = (dia: Dia, idx: number, campo: keyof Faixa, valor: string) => {
    limparFeedbackAgenda(dia)
    setAgenda((atual) => ({
      ...atual,
      [dia]: {
        ...atual[dia],
        faixas: atual[dia].faixas.map((f, i) => (i === idx ? { ...f, [campo]: hhmm(valor) } : f)),
      },
    }))
  }

  // Validação no cliente: replica as regras do servidor para o erro aparecer junto do dia.
  const validarAgenda = (): Partial<Record<Dia, string[]>> => {
    const erros: Partial<Record<Dia, string[]>> = {}
    for (const { key } of DIAS) {
      const d = agenda[key]
      if (!d.ativo) continue
      const lista: string[] = []
      if (d.faixas.length === 0) lista.push("Adicione ao menos uma faixa ou desligue o dia.")
      d.faixas.forEach((f, i) => {
        const n = i + 1
        const ini = minutos(f.inicio)
        const fim = minutos(f.fim)
        if (!f.inicio || !f.fim || isNaN(ini) || isNaN(fim)) {
          lista.push(`Faixa ${n}: preencha início e fim.`)
          return
        }
        if (ini >= fim) lista.push(`Faixa ${n}: o início deve ser antes do fim.`)
      })
      // Sobreposição entre faixas válidas do mesmo dia.
      const validas = d.faixas
        .map((f, i) => ({ i: i + 1, ini: minutos(f.inicio), fim: minutos(f.fim) }))
        .filter((f) => !isNaN(f.ini) && !isNaN(f.fim) && f.ini < f.fim)
        .sort((a, b) => a.ini - b.ini)
      for (let k = 1; k < validas.length; k++) {
        if (validas[k].ini < validas[k - 1].fim) {
          lista.push(`Faixas ${validas[k - 1].i} e ${validas[k].i} se sobrepõem.`)
        }
      }
      if (lista.length) erros[key] = lista
    }
    return erros
  }

  const salvarAgenda = async () => {
    setSucessoAgenda("")
    setErroAgenda("")
    setErrosServidor([])
    const e = validarAgenda()
    setErrosDia(e)
    if (Object.keys(e).length > 0) {
      setErroAgenda("Corrija os dias destacados antes de salvar.")
      return
    }
    const horarios = montarPayload(agenda)
    if (horarios.length === 0 && !confirmarVazio) {
      // Primeiro clique só avisa; o segundo confirma o envio da lista vazia.
      setConfirmarVazio(true)
      return
    }

    setSalvando(true)
    try {
      const json = await fetchJson(`${API_BASE}/profissionais/definir_horarios.php`, {
        method: "POST",
        body: JSON.stringify({ horarios }),
      })
      const total = Number(json?.total ?? horarios.length)
      setSucessoAgenda(
        total === 0
          ? "Agenda salva. Você está sem horários disponíveis para agendamento."
          : json?.message || `Horários salvos: ${total} faixa${total === 1 ? "" : "s"} na semana.`,
      )
      await carregarAgenda()
    } catch (err) {
      const e2 = err as Error & { erros?: string[] }
      setErroAgenda(e2.message || "Não foi possível salvar os horários.")
      if (e2.erros?.length) setErrosServidor(e2.erros)
    } finally {
      setSalvando(false)
      setConfirmarVazio(false)
    }
  }

  // ---------- Seção B ----------
  const carregarBloqueios = async () => {
    setLoadingBloqueios(true)
    setErroBloqueios("")
    try {
      const json = await fetchJson(`${API_BASE}/profissionais/listar_dias_bloqueados.php`, { method: "GET" })
      const lista: DiaBloqueado[] = Array.isArray(json?.data) ? json.data : []
      lista.sort((a, b) => a.data_bloqueada.localeCompare(b.data_bloqueada))
      setBloqueios(lista)
    } catch (e) {
      setErroBloqueios(e instanceof Error ? e.message : "Erro de conexão ao carregar os dias bloqueados.")
    } finally {
      setLoadingBloqueios(false)
    }
  }

  const bloquearData = async () => {
    setErroForm("")
    setErroBloqueios("")
    setSucessoBloqueio("")
    if (!novaData) {
      setErroForm("Escolha a data que deseja bloquear.")
      return
    }
    if (novaData < hoje) {
      setErroForm("Não é possível bloquear uma data que já passou.")
      return
    }
    if (bloqueios.some((b) => b.data_bloqueada === novaData)) {
      setErroForm("Essa data já está bloqueada.")
      return
    }
    const motivo = novoMotivo.trim()
    if (motivo.length > 200) {
      setErroForm("O motivo deve ter no máximo 200 caracteres.")
      return
    }
    setBloqueando(true)
    try {
      const body: { data_bloqueada: string; motivo?: string } = { data_bloqueada: novaData }
      if (motivo) body.motivo = motivo
      const json = await fetchJson(`${API_BASE}/profissionais/bloquear_data.php`, {
        method: "POST",
        body: JSON.stringify(body),
      })
      setSucessoBloqueio(json?.message || `${formatarDataBR(novaData)} bloqueada.`)
      setNovaData("")
      setNovoMotivo("")
      await carregarBloqueios()
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : "Não foi possível bloquear a data.")
    } finally {
      setBloqueando(false)
    }
  }

  const desbloquearData = async (id: number) => {
    setErroBloqueios("")
    setSucessoBloqueio("")
    setRemovendoId(id)
    try {
      const json = await fetchJson(`${API_BASE}/profissionais/desbloquear_data.php`, {
        method: "POST",
        body: JSON.stringify({ id }),
      })
      setSucessoBloqueio(json?.message || "Bloqueio removido.")
      await carregarBloqueios()
    } catch (e) {
      setErroBloqueios(e instanceof Error ? e.message : "Não foi possível remover o bloqueio.")
    } finally {
      setRemovendoId(null)
    }
  }

  const ocupado = salvando || bloqueando || removendoId !== null

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Meus Horários</h2>
          <p className="text-muted-foreground">Defina quando você atende e os dias em que não vai atender.</p>
        </div>
        {temAlteracoes && !loadingAgenda && (
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
            Alterações não salvas
          </Badge>
        )}
      </div>

      {/* ---------- A) Horários de atendimento ---------- */}
      <Card className="p-6 border-border/50">
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-provence-900" />
              Horários de atendimento
            </h3>
            <p className="text-sm text-muted-foreground">Sua agenda semanal. Vale para todas as semanas.</p>
          </div>
          <Button
            onClick={salvarAgenda}
            disabled={loadingAgenda || ocupado || (!temAlteracoes && !confirmarVazio)}
            className="rounded-xl bg-gradient-to-r from-provence-800 to-provence-950"
          >
            {salvando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {confirmarVazio ? "Confirmar e salvar" : "Salvar horários"}
              </>
            )}
          </Button>
        </div>

        <Alert variant="info" className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            O paciente só consegue agendar dentro destes horários, em blocos de 1 hora (por exemplo, uma faixa das
            09:00 às 12:00 abre os horários 09:00, 10:00 e 11:00). Ligue os dias em que você atende e informe as
            faixas de cada um.
          </AlertDescription>
        </Alert>

        {erroAgenda && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              <p>{erroAgenda}</p>
              {errosServidor.length > 0 && (
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {errosServidor.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}
        {sucessoAgenda && (
          <Alert variant="success" className="mb-4">
            <AlertDescription>{sucessoAgenda}</AlertDescription>
          </Alert>
        )}
        {confirmarVazio && (
          <Alert variant="warning" className="mb-4">
            <AlertDescription>
              Nenhum dia está ligado. Ao salvar, você ficará sem horários disponíveis e os pacientes não conseguirão
              agendar. Clique em &quot;Confirmar e salvar&quot; para continuar.
            </AlertDescription>
          </Alert>
        )}

        {loadingAgenda ? (
          <div className="space-y-3">
            {DIAS.map(({ key }) => (
              <Skeleton key={key} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {DIAS.map(({ key, label }) => {
              const d = agenda[key]
              const erros = errosDia[key]
              const idSwitch = `dia-${key}`
              return (
                <div
                  key={key}
                  className={`rounded-xl border p-4 transition-colors ${
                    erros ? "border-red-500" : d.ativo ? "border-provence-300 bg-provence-50/60" : "border-border/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Switch
                        id={idSwitch}
                        checked={d.ativo}
                        onCheckedChange={(v) => alternarDia(key, v)}
                        disabled={ocupado}
                      />
                      <Label htmlFor={idSwitch} className="font-medium cursor-pointer">
                        {label}
                      </Label>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {d.ativo
                        ? `${d.faixas.length} faixa${d.faixas.length === 1 ? "" : "s"}`
                        : "Não atende"}
                    </span>
                  </div>

                  {d.ativo && (
                    <div className="mt-4 space-y-3">
                      {d.faixas.map((f, idx) => {
                        const idIni = `${key}-${idx}-inicio`
                        const idFim = `${key}-${idx}-fim`
                        return (
                          <div key={idx} className="flex flex-wrap items-end gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={idIni} className="text-xs text-muted-foreground">
                                Início
                              </Label>
                              <Input
                                id={idIni}
                                type="time"
                                step={900}
                                value={f.inicio}
                                onChange={(e) => setFaixa(key, idx, "inicio", e.target.value)}
                                disabled={ocupado}
                                className="rounded-xl bg-card/50 border-border/50 w-32"
                              />
                            </div>
                            <span className="pb-2 text-sm text-muted-foreground">até</span>
                            <div className="space-y-1">
                              <Label htmlFor={idFim} className="text-xs text-muted-foreground">
                                Fim
                              </Label>
                              <Input
                                id={idFim}
                                type="time"
                                step={900}
                                value={f.fim}
                                onChange={(e) => setFaixa(key, idx, "fim", e.target.value)}
                                disabled={ocupado}
                                className="rounded-xl bg-card/50 border-border/50 w-32"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50"
                              onClick={() => removerFaixa(key, idx)}
                              disabled={ocupado}
                              aria-label={`Remover faixa ${idx + 1} de ${label}`}
                              title="Remover faixa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )
                      })}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                        onClick={() => adicionarFaixa(key)}
                        disabled={ocupado}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Adicionar faixa
                      </Button>

                      {erros && (
                        <ul className="text-xs text-red-500 space-y-0.5 list-disc pl-4">
                          {erros.map((msg, i) => (
                            <li key={i}>{msg}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            <p className="text-xs text-muted-foreground pt-1">
              {diasAtivos === 0
                ? "Nenhum dia ligado."
                : `${diasAtivos} dia${diasAtivos === 1 ? "" : "s"} com atendimento na semana.`}
            </p>
          </div>
        )}
      </Card>

      {/* ---------- B) Dias bloqueados ---------- */}
      <Card className="p-6 border-border/50">
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-provence-900" />
            Dias bloqueados
          </h3>
          <p className="text-sm text-muted-foreground">
            Folga, feriado, congresso: nesses dias nenhum horário fica disponível, mesmo que a agenda semanal os
            inclua.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[auto,1fr,auto] gap-3 items-end">
          <div className="space-y-2">
            <Label htmlFor="bloqueio-data">Data</Label>
            <Input
              id="bloqueio-data"
              type="date"
              min={hoje}
              value={novaData}
              onChange={(e) => {
                setNovaData(e.target.value)
                setErroForm("")
                setSucessoBloqueio("")
              }}
              disabled={ocupado}
              className={`rounded-xl bg-card/50 border-border/50 md:w-44 ${
                erroForm ? "border-red-500 focus-visible:ring-red-500" : ""
              }`}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bloqueio-motivo">
              Motivo <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="bloqueio-motivo"
              maxLength={200}
              placeholder="Ex.: feriado, congresso, férias"
              value={novoMotivo}
              onChange={(e) => {
                setNovoMotivo(e.target.value)
                setErroForm("")
                setSucessoBloqueio("")
              }}
              disabled={ocupado}
              className="rounded-xl bg-card/50 border-border/50"
            />
          </div>
          <Button
            onClick={bloquearData}
            disabled={ocupado || loadingBloqueios}
            className="rounded-xl bg-gradient-to-r from-provence-800 to-provence-950"
          >
            {bloqueando ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Bloqueando...
              </>
            ) : (
              <>
                <CalendarOff className="w-4 h-4 mr-2" />
                Bloquear
              </>
            )}
          </Button>
        </div>
        {erroForm && <p className="text-xs text-red-500 mt-2">{erroForm}</p>}
        {novoMotivo.length > 150 && !erroForm && (
          <p className="text-xs text-muted-foreground mt-2">{novoMotivo.length}/200 caracteres</p>
        )}

        <Separator className="my-5" />

        {erroBloqueios && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{erroBloqueios}</AlertDescription>
          </Alert>
        )}
        {sucessoBloqueio && (
          <Alert variant="success" className="mb-4">
            <AlertDescription>{sucessoBloqueio}</AlertDescription>
          </Alert>
        )}

        {loadingBloqueios ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : bloqueios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum dia bloqueado a partir de hoje.</p>
        ) : (
          <ul className="space-y-2">
            {bloqueios.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{formatarDataBR(b.data_bloqueada)}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.motivo?.trim() || "Sem motivo informado"}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50 shrink-0"
                  onClick={() => desbloquearData(b.id)}
                  disabled={ocupado}
                  aria-label={`Remover bloqueio de ${formatarDataBR(b.data_bloqueada)}`}
                >
                  {removendoId === b.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-1" />
                      Remover
                    </>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
