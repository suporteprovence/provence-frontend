"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Calendar,
  Clock,
  Video,
  Phone,
  MessageSquare,
  MoreVertical,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/DropdownMenu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { API_BASE } from "@/lib/api-config"
import { ConfirmacaoSessao } from "@/components/consultas/confirmacao-sessao"

// --- Tipagens ---
type AppointmentStatus = "confirmada" | "pendente" | "cancelada" | "concluida"
type AppointmentType = "video" | "presencial" | "phone"

interface Appointment {
  id: string
  patient: {
    name: string
    avatar?: string
    email: string
    phone: string
  }
  date: string
  time: string
  type: AppointmentType
  status: AppointmentStatus
  sessionNumber: number
  notes?: string
  linkSessao?: string
}

// --- Helpers de Normalização ---
function normalizeStatus(raw: any): AppointmentStatus {
  const s = String(raw ?? "").toLowerCase().trim()
  if (s.includes("confirm")) return "confirmada"
  if (s.includes("pend")) return "pendente"
  if (s.includes("cancel")) return "cancelada"
  if (s.includes("concl") || s.includes("final") || s.includes("done")) return "concluida"
  return "pendente"
}

function normalizeType(raw: any): AppointmentType {
  const t = String(raw ?? "").toLowerCase().trim()
  if (t.includes("video") || t.includes("online") || t.includes("meet")) return "video"
  if (t.includes("presen") || t.includes("local")) return "presencial"
  if (t.includes("tel") || t.includes("phone")) return "phone"
  return "video"
}

function toDateOnlyISO(dateLike: any): string {
  const s = String(dateLike ?? "").trim()
  if (!s) return ""
  if (s.includes("T")) return s.split("T")[0]
  if (s.includes(" ")) return s.split(" ")[0]
  return s
}

function toTimeHHmm(timeLike: any): string {
  const s = String(timeLike ?? "").trim()
  if (!s) return ""
  if (s.length >= 5) return s.slice(0, 5)
  return s
}

function mapApiToAppointment(item: any): Appointment {
  const id = String(item?.id ?? item?.consulta_id ?? item?.id_consulta ?? "")
  const patientName = item?.paciente_nome ?? item?.nome_paciente ?? item?.paciente?.nome ?? "Paciente"
  const patientEmail = item?.paciente_email ?? ""
  const patientPhone = item?.paciente_telefone ?? ""
  const patientAvatar = item?.paciente_foto ?? ""
  const date = toDateOnlyISO(item?.data ?? item?.data_consulta)
  const time = toTimeHHmm(item?.hora ?? item?.horario)
  const type = normalizeType(item?.tipo ?? item?.tipo_atendimento)
  const status = normalizeStatus(item?.status ?? item?.situacao)
  const sessionNumber = Number(item?.numero_sessao) || 1
  const linkSessao = item?.link_sessao ?? ""

  return {
    id,
    patient: { name: String(patientName), email: String(patientEmail), phone: String(patientPhone), avatar: patientAvatar },
    date: date || "",
    time: time || "",
    type,
    status,
    sessionNumber,
    linkSessao: linkSessao ? String(linkSessao) : undefined,
  }
}

function dateToComparable(d: string): number {
  if (!d) return 0
  const dt = new Date(`${d}T00:00:00`)
  return dt.getTime()
}

// --- Componente Exportado ---
export function GerenciarAgenda() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [notesDialogOpen, setNotesDialogOpen] = useState(false)
  const [sessionNotes, setSessionNotes] = useState("")
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const todayISO = useMemo(() => {
    const now = new Date()
    return now.toISOString().split("T")[0]
  }, [])

  const getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case "confirmada": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      case "pendente": return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      case "cancelada": return "bg-red-500/10 text-red-500 border-red-500/20"
      case "concluida": return "bg-blue-500/10 text-blue-500 border-blue-500/20"
    }
  }

  const getTypeIcon = (type: Appointment["type"]) => {
    switch (type) {
      case "video": return <Video className="w-4 h-4" />
      case "presencial": return <Calendar className="w-4 h-4" />
      case "phone": return <Phone className="w-4 h-4" />
    }
  }

  const getTypeLabel = (type: Appointment["type"]) => {
    switch (type) {
      case "video": return "Videochamada"
      case "presencial": return "Presencial"
      case "phone": return "Telefone"
    }
  }

  async function fetchJson(url: string, init?: RequestInit) {
    const res = await fetch(url, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    })
    const text = await res.text()
    let json: any = null
    try { json = text ? JSON.parse(text) : null } catch { json = null }
    if (!res.ok) throw new Error(json?.message || `Erro ${res.status}`)
    return json
  }

  const carregarConsultas = async () => {
    setLoading(true)
    setError("")
    try {
      const allUrl = `${API_BASE}/profissional/get_all_consultas.php`
      const allData = await fetchJson(allUrl, { method: "GET" })
      const list = Array.isArray(allData) ? allData : allData?.data ?? []
      const mapped: Appointment[] = list.map(mapApiToAppointment)

      mapped.sort((a: Appointment, b: Appointment) => {
        const da = dateToComparable(a.date)
        const db = dateToComparable(b.date)
        if (da !== db) return da - db
        return (a.time || "").localeCompare(b.time || "")
      })

      setAppointments(mapped)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar consultas.")
    } finally {
      setLoading(false)
    }
  }

  const confirmarConsulta = async (id: string) => {
    setActionLoadingId(id)
    try {
      await fetchJson(`${API_BASE}/profissional/confirmar-consulta.php`, { method: "POST", body: JSON.stringify({ id }) })
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "confirmada" } : a)))
    } catch {
      setError("Erro ao confirmar")
    } finally {
      setActionLoadingId(null)
    }
  }

  const cancelarConsulta = async (id: string) => {
    setActionLoadingId(id)
    try {
      await fetchJson(`${API_BASE}/paciente/cancel_consulta.php`, { method: "POST", body: JSON.stringify({ id }) })
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelada" } : a)))
    } catch {
      setError("Erro ao cancelar")
    } finally {
      setActionLoadingId(null)
    }
  }

  useEffect(() => { carregarConsultas() }, [])

  const todayAppointments = useMemo(() => appointments.filter((apt) =>
    apt.date === todayISO && apt.status !== "cancelada"), [appointments, todayISO])
  const upcomingAppointments = useMemo(() => appointments.filter((apt) =>
    dateToComparable(apt.date) > dateToComparable(todayISO) && apt.status !== "cancelada"), [appointments, todayISO])
  const completedAppointments = useMemo(() => appointments.filter((apt) =>
    apt.status === "concluida"), [appointments])

  const renderAppointmentCard = (appointment: Appointment, index: number) => (
    <div key={appointment.id}>
      <Card className="p-6 border-border/50 hover:shadow-xl transition-all mb-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-14 h-14 border-2 border-primary/20">
            <AvatarImage src={appointment.patient.avatar || "/placeholder.svg"} />
            <AvatarFallback>{appointment.patient.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-lg">{appointment.patient.name}</h4>
                <p className="text-sm text-muted-foreground">{"Sessão #" + appointment.sessionNumber}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedAppointment(appointment)}>
                    <FileText className="w-4 h-4 mr-2" /> Ver Detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => cancelarConsulta(appointment.id)} className="text-red-500">
                    <XCircle className="w-4 h-4 mr-2" /> Cancelar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap gap-3 my-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" /> {appointment.time}
              </div>
              <Badge variant="secondary" className="flex gap-1">
                {getTypeIcon(appointment.type)} {getTypeLabel(appointment.type)}
              </Badge>
              <Badge className={getStatusColor(appointment.status)}>{appointment.status}</Badge>
            </div>

            <div className="flex gap-2">
              {appointment.status === "pendente" && (
                <>
                  <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1" onClick={() => confirmarConsulta(appointment.id)} disabled={actionLoadingId === appointment.id}>
                    {actionLoadingId === appointment.id ? <Loader2 className="animate-spin w-4 h-4" /> : "Confirmar"}
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => cancelarConsulta(appointment.id)}>
                    Cancelar
                  </Button>
                </>
              )}
              {appointment.status === "confirmada" &&
                (appointment.linkSessao ? (
                  <Button
                    size="sm"
                    className="w-full bg-primary"
                    onClick={() => window.open(appointment.linkSessao, "_blank")}
                  >
                    Entrar na Sessão
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">Aguardando o link da sessão.</p>
                ))}
            </div>

            <ConfirmacaoSessao consultaId={appointment.id} />
          </div>
        </div>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Consultas Marcadas</h2>
          <p className="text-muted-foreground">Gerencie sua agenda de hoje e próximas sessões</p>
        </div>
        <Button variant="outline" onClick={carregarConsultas} disabled={loading}>
          {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null} Atualizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" /></div>
      ) : (
        <Tabs defaultValue="hoje" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="hoje">{"Hoje (" + todayAppointments.length + ")"}</TabsTrigger>
            <TabsTrigger value="proximas">{"Próximas (" + upcomingAppointments.length + ")"}</TabsTrigger>
            <TabsTrigger value="concluidas">{"Concluídas (" + completedAppointments.length + ")"}</TabsTrigger>
          </TabsList>

          <TabsContent value="hoje">
            {todayAppointments.length === 0 ? <p className="text-center py-10 text-muted-foreground">Sem consultas para hoje.</p> : todayAppointments.map(renderAppointmentCard)}
          </TabsContent>

          <TabsContent value="proximas">
            {upcomingAppointments.length === 0 ? <p className="text-center py-10 text-muted-foreground">Sem consultas próximas.</p> : upcomingAppointments.map(renderAppointmentCard)}
          </TabsContent>

          <TabsContent value="concluidas">
            {completedAppointments.length === 0 ? <p className="text-center py-10 text-muted-foreground">Nenhuma consulta concluída.</p> : completedAppointments.map(renderAppointmentCard)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
