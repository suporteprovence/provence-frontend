"use client"

import { useState } from "react"
import { Calendar, Clock, FileText, Download, Search, Filter } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

interface HistorySession {
  id: string
  patient: {
    name: string
    avatar?: string
  }
  date: string
  time: string
  duration: number
  sessionNumber: number
  notes: string
  type: "video" | "presencial"
}

const historySessions: HistorySession[] = []

export function HistoricoProfessional() {
  const [selectedSession, setSelectedSession] = useState<HistorySession | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMonth, setFilterMonth] = useState("all")

  const filteredSessions = historySessions.filter((session) => {
    const matchesSearch = session.patient.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesMonth = filterMonth === "all" || session.date.startsWith(`2025-${filterMonth}`)
    return matchesSearch && matchesMonth
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Histórico de Consultas</h2>
          <p className="text-muted-foreground">Visualize e gerencie o histórico de sessões realizadas</p>
        </div>
        <Button variant="outline" className="rounded-xl bg-transparent">
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass p-4 border-border/50">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por paciente..."
              className="pl-10 rounded-xl bg-card/50 border-border/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-48 rounded-xl bg-card/50 border-border/50">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filtrar por mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              <SelectItem value="10">Outubro 2025</SelectItem>
              <SelectItem value="09">Setembro 2025</SelectItem>
              <SelectItem value="08">Agosto 2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Sessions List */}
      <div className="grid gap-4">
        {filteredSessions.map((session) => (
          <Card key={session.id} className="glass p-6 border-border/50 hover:shadow-xl transition-all cursor-pointer">
            <div className="flex items-start gap-4">
              <Avatar className="w-14 h-14 border-2 border-primary/20">
                <AvatarImage src={session.patient.avatar || "/placeholder.svg"} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                  {session.patient.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{session.patient.name}</h4>
                    <p className="text-sm text-muted-foreground">{"Sessão #" + session.sessionNumber}</p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    {session.type === "video" ? "Videochamada" : "Presencial"}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(session.date).toLocaleDateString("pt-BR")}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {session.time + " - " + session.duration + " min"}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{session.notes}</p>

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl bg-transparent"
                  onClick={() => setSelectedSession(session)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Notas Completas
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="glass-strong border-border/50 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Sessão</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <ScrollArea className="max-h-[600px] pr-4">
              <div className="space-y-6 py-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/50">
                  <Avatar className="w-16 h-16 border-2 border-primary/20">
                    <AvatarImage src={selectedSession.patient.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
                      {selectedSession.patient.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{selectedSession.patient.name}</h3>
                    <p className="text-sm text-muted-foreground">{"Sessão #" + selectedSession.sessionNumber}</p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                    {selectedSession.type === "video" ? "Videochamada" : "Presencial"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="glass p-4 border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-primary/10">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Data</p>
                        <p className="font-semibold">{new Date(selectedSession.date).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="glass p-4 border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-accent/10">
                        <Clock className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Horário e Duração</p>
                        <p className="font-semibold">{selectedSession.time + " - " + selectedSession.duration + " min"}</p>
                      </div>
                    </div>
                  </Card>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Notas da Sessão
                  </h4>
                  <Card className="glass p-4 border-border/50">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedSession.notes}</p>
                  </Card>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-xl bg-transparent">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar PDF
                  </Button>
                  <Button className="flex-1 rounded-xl bg-gradient-to-r from-primary to-accent">Editar Notas</Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
