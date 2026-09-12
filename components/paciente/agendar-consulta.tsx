"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, Search, Star } from "lucide-react"
import { API_BASE } from "@/lib/api-config"

export type Profissional = {
  id: number
  nome: string
  email: string
  especialidade: string
  valor_consulta: number
  bio: string
  foto_perfil: string
  crp: string
  media_avaliacoes?: number
  total_avaliacoes?: number
}

interface Props {
  onScheduleClick: (profissional: Profissional) => void
}

export function AgendarConsulta({ onScheduleClick }: Props) {
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busca, setBusca] = useState("")

  useEffect(() => {
    fetchProfissionais()
  }, [])

  const fetchProfissionais = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/agendamento/exibir-profissionais.php`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      })
      const data = await res.json()
      if (data.success || data.status === "success") {
        setProfissionais(data.profissionais || data.data || [])
      } else {
        setError(data.message || "Erro ao carregar profissionais.")
      }
    } catch {
      setError("Erro de conexão ao carregar profissionais.")
    } finally {
      setLoading(false)
    }
  }

  const filtrados = profissionais.filter((p) => {
    const termo = busca.toLowerCase()
    return (
      p.nome.toLowerCase().includes(termo) ||
      (p.especialidade || "").toLowerCase().includes(termo)
    )
  })

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
        <h2 className="text-2xl font-bold">{"Agendar Consulta"}</h2>
        <p className="text-muted-foreground mt-1">{"Escolha um profissional para agendar sua consulta."}</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou especialidade..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {filtrados.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">{"Nenhum profissional encontrado."}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map((prof) => (
          <Card key={prof.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="w-14 h-14">
                  {prof.foto_perfil && (
                    <AvatarImage src={prof.foto_perfil} alt={prof.nome} />
                  )}
                  <AvatarFallback className="bg-blue-500 text-white">
                    {prof.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{prof.nome}</p>
                  <p className="text-sm text-muted-foreground">{prof.especialidade || "Psicologia"}</p>
                  {prof.crp && (
                    <p className="text-xs text-muted-foreground">{"CRP: " + prof.crp}</p>
                  )}
                </div>
              </div>

              {prof.bio && (
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{prof.bio}</p>
              )}

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  {Number(prof.total_avaliacoes) > 0 && (
                    <Badge variant="secondary" className="gap-1" title={`${prof.total_avaliacoes} avaliação(ões)`}>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {Number(prof.media_avaliacoes).toFixed(1)}
                      <span className="text-muted-foreground">({prof.total_avaliacoes})</span>
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {"R$ " + Number(prof.valor_consulta).toFixed(2).replace(".", ",")}
                  </Badge>
                </div>
              </div>

              <Button
                className="w-full mt-4"
                onClick={() => onScheduleClick(prof)}
              >
                {"Agendar"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
