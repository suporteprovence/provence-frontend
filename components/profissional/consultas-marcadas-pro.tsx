"use client"

import { useState } from "react"
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
  type: "video" | "presencial" | "phone"
  status: "confirmada" | "pendente" | "cancelada" | "concluida"
  sessionNumber: number
  notes?: string
}

const appointments: Appointment[] = []

export function ConsultasMarcadasPro() {
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [notesDialogOpen, setNotesDialogOpen] = useState(false)
  const [sessionNotes, setSessionNotes] = useState("")

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

  const todayAppointments = appointments.filter((apt) => apt.date === "2025-10-09")
  const upcomingAppointments = appointments.filter(
    (apt) => new Date(apt.date) > new Date("2025-10-09") && apt.status !== "cancelada",
  )
  const completedAppointments = appointments.filter((apt) => apt.status === "concluida")

  const renderAppointmentCard = (appointment: Appointment) => (
    <Card key={appointment.id} className="glass p-6 border-border/50 hover:shadow-xl transition-all">
      <div className="flex items-start gap-4">
        <Avatar className="w-14 h-14 border-2 border-primary/20">
          <AvatarImage src={appointment.patient.avatar || "/placeholder.svg"} />
          <AvatarFallback className="bg-gradient-to-br from-provence-800 to-provence-950 text-primary-foreground font-semibold">
            {appointment.patient.name.split(" ").map((n) => n[0]).join("")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-lg">{appointment.patient.name}</h4>
              <p className="text-sm text-muted-foreground">{"Sessão #" + appointment.sessionNumber}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-card/80">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-strong border-border/50">
                <DropdownMenuItem onClick={() => setSelectedAppointment(appointment)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Detalhes
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedAppointment(appointment)
                    setNotesDialogOpen(true)
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Adicionar Notas
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-500">
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancelar Sessão
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {new Date(appointment.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {appointment.time}
            </div>
            <Badge variant="secondary" className="bg-card/50 border-border/50">
              {getTypeIcon(appointment.type)}
              <span className="ml-1">{getTypeLabel(appointment.type)}</span>
            </Badge>
            <Badge variant="secondary" className={getStatusColor(appointment.status)}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {appointment.status === "confirmada" && (
              <>
                <Button size="sm" className="rounded-xl bg-gradient-to-r from-provence-800 to-provence-950 flex-1">
                  {appointment.type === "video" ? (
                    <>
                      <Video className="w-4 h-4 mr-2" />
                      Iniciar Videochamada
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Iniciar Sessão
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl bg-transparent"
                  onClick={() => {
                    setSelectedAppointment(appointment)
                    setNotesDialogOpen(true)
                  }}
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </>
            )}
            {appointment.status === "pendente" && (
              <>
                <Button size="sm" variant="outline" className="rounded-xl bg-emerald-500/10 text-emerald-500 flex-1">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl bg-red-500/10 text-red-500">
                  <XCircle className="w-4 h-4 mr-2" />
                  Recusar
                </Button>
              </>
            )}
            {appointment.status === "concluida" && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl bg-transparent flex-1"
                onClick={() => {
                  setSelectedAppointment(appointment)
                  setNotesDialogOpen(true)
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Ver Notas da Sessão
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Consultas Marcadas</h2>
          <p className="text-muted-foreground">Gerencie suas sessões agendadas</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-4 py-2">
            {todayAppointments.length + " sessões hoje"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="hoje" className="space-y-6">
        <TabsList className="glass-strong border-border/50 p-1">
          <TabsTrigger value="hoje" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
            {"Hoje (" + todayAppointments.length + ")"}
          </TabsTrigger>
          <TabsTrigger value="proximas" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
            {"Próximas (" + upcomingAppointments.length + ")"}
          </TabsTrigger>
          <TabsTrigger value="concluidas" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
            {"Concluídas (" + completedAppointments.length + ")"}
          </TabsTrigger>
          <TabsTrigger value="todas" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
            {"Todas (" + appointments.length + ")"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hoje" className="space-y-4">
          {todayAppointments.map((appointment) => renderAppointmentCard(appointment))}
        </TabsContent>

        <TabsContent value="proximas" className="space-y-4">
          {upcomingAppointments.map((appointment) => renderAppointmentCard(appointment))}
        </TabsContent>

        <TabsContent value="concluidas" className="space-y-4">
          {completedAppointments.map((appointment) => renderAppointmentCard(appointment))}
        </TabsContent>

        <TabsContent value="todas" className="space-y-4">
          {appointments.map((appointment) => renderAppointmentCard(appointment))}
        </TabsContent>
      </Tabs>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="glass-strong border-border/50">
          <DialogHeader>
            <DialogTitle>Notas da Sessão</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50">
                <Avatar className="w-12 h-12 border-2 border-primary/20">
                  <AvatarImage src={selectedAppointment.patient.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="bg-gradient-to-br from-provence-800 to-provence-950 text-primary-foreground">
                    {selectedAppointment.patient.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedAppointment.patient.name}</p>
                  <p className="text-sm text-muted-foreground">{"Sessão #" + selectedAppointment.sessionNumber}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas da Sessão</Label>
                <Textarea
                  placeholder="Adicione suas observações sobre a sessão..."
                  className="rounded-xl min-h-[200px]"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                />
              </div>
              <Button className="w-full rounded-xl bg-gradient-to-r from-provence-800 to-provence-950">Salvar Notas</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
