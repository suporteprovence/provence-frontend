"use client"

import { useEffect, useState } from "react"
import { Mail, Phone, MapPin, Save, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { API_BASE } from "@/lib/api-config"

type PerfilProfissional = {
  nome: string
  email: string
  telefone: string
  cpf: string
  data_nascimento: string
  crp: string
  especialidade: string
  valor_consulta: string
  cidade: string
  estado: string
  bio: string
}

const vazio: PerfilProfissional = {
  nome: "",
  email: "",
  telefone: "",
  cpf: "",
  data_nascimento: "",
  crp: "",
  especialidade: "",
  valor_consulta: "",
  cidade: "",
  estado: "",
  bio: "",
}

export function PerfilProfessional() {
  const [perfil, setPerfil] = useState<PerfilProfissional>(vazio)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    fetchPerfil()
  }, [])

  const fetchPerfil = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/usuarios/get_perfil.php`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      })
      const data = await res.json()
      if (data.success && (data.data || data.usuario)) {
        const p = data.data || data.usuario
        setPerfil({
          nome: p.nome ?? "",
          email: p.email ?? "",
          telefone: p.telefone ?? "",
          cpf: p.cpf ?? "",
          data_nascimento: p.data_nascimento ?? "",
          crp: p.crp ?? "",
          especialidade: p.especialidade ?? "",
          valor_consulta: p.valor_consulta != null ? String(p.valor_consulta) : "",
          cidade: p.cidade ?? "",
          estado: p.estado ?? "",
          bio: p.bio ?? "",
        })
      } else {
        setError(data.message || "Não foi possível carregar seu perfil.")
      }
    } catch {
      setError("Erro de conexão ao carregar o perfil.")
    } finally {
      setLoading(false)
    }
  }

  const setCampo = (campo: keyof PerfilProfissional, valor: string) =>
    setPerfil((atual) => ({ ...atual, [campo]: valor }))

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const res = await fetch(`${API_BASE}/usuarios/atualizar_perfil.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tipo_usuario: "profissional",
          nome: perfil.nome,
          telefone: perfil.telefone,
          data_nascimento: perfil.data_nascimento || null,
          especialidade: perfil.especialidade,
          valor_consulta: perfil.valor_consulta ? Number(perfil.valor_consulta) : null,
          bio: perfil.bio,
          cidade: perfil.cidade,
          estado: perfil.estado,
        }),
      })
      const data = await res.json()
      if (data.success || data.status === "success") {
        setSuccess("Perfil atualizado com sucesso!")
        setIsEditing(false)
      } else {
        setError(data.message || "Não foi possível salvar as alterações.")
      }
    } catch {
      setError("Erro de conexão ao salvar o perfil.")
    } finally {
      setSaving(false)
    }
  }

  const iniciais = (perfil.nome || "P")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  const localizacao = [perfil.cidade, perfil.estado].filter(Boolean).join(" / ")

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Meu Perfil</h2>
          <p className="text-muted-foreground">Gerencie suas informações profissionais</p>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setIsEditing(false)
                setError("")
                setSuccess("")
                fetchPerfil()
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-primary to-accent"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => {
              setIsEditing(true)
              setSuccess("")
            }}
            className="rounded-xl bg-gradient-to-r from-primary to-accent"
          >
            Editar Perfil
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription className="text-emerald-700">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="glass p-6 border-border/50">
          <div className="flex flex-col items-center text-center">
            <Avatar className="w-32 h-32 border-4 border-primary/20 mb-4">
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-3xl font-semibold">
                {iniciais}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-bold mb-1">{perfil.nome || "Profissional"}</h3>
            <p className="text-sm text-muted-foreground mb-4">{perfil.especialidade || "Psicólogo(a)"}</p>
            {perfil.crp && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 mb-4">
                CRP {perfil.crp}
              </Badge>
            )}
            <div className="w-full space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <span className="text-muted-foreground break-all">{perfil.email || "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Phone className="w-4 h-4 text-accent" />
                </div>
                <span className="text-muted-foreground">{perfil.telefone || "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-muted-foreground">{localizacao || "—"}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Details */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="glass-strong border-border/50 p-1">
              <TabsTrigger value="info" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                Informações Pessoais
              </TabsTrigger>
              <TabsTrigger value="professional" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                Dados Profissionais
              </TabsTrigger>
              <TabsTrigger value="about" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                Sobre Mim
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card className="glass p-6 border-border/50">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Completo</Label>
                      <Input
                        value={perfil.nome}
                        onChange={(e) => setCampo("nome", e.target.value)}
                        disabled={!isEditing}
                        className="rounded-xl bg-card/50 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Nascimento</Label>
                      <Input
                        type="date"
                        value={perfil.data_nascimento}
                        onChange={(e) => setCampo("data_nascimento", e.target.value)}
                        disabled={!isEditing}
                        className="rounded-xl bg-card/50 border-border/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input value={perfil.email} disabled className="rounded-xl bg-card/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        value={perfil.telefone}
                        onChange={(e) => setCampo("telefone", e.target.value)}
                        disabled={!isEditing}
                        className="rounded-xl bg-card/50 border-border/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>CPF</Label>
                    <Input value={perfil.cpf} disabled className="rounded-xl bg-card/50 border-border/50" />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="professional">
              <Card className="glass p-6 border-border/50">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CRP</Label>
                      <Input value={perfil.crp} disabled className="rounded-xl bg-card/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Especialidade</Label>
                      <Input
                        value={perfil.especialidade}
                        onChange={(e) => setCampo("especialidade", e.target.value)}
                        disabled={!isEditing}
                        className="rounded-xl bg-card/50 border-border/50"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor da Consulta (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={perfil.valor_consulta}
                        onChange={(e) => setCampo("valor_consulta", e.target.value)}
                        disabled={!isEditing}
                        className="rounded-xl bg-card/50 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Estado (UF)</Label>
                      <Input
                        maxLength={2}
                        value={perfil.estado}
                        onChange={(e) => setCampo("estado", e.target.value.toUpperCase())}
                        disabled={!isEditing}
                        placeholder="SP"
                        className="rounded-xl bg-card/50 border-border/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input
                      value={perfil.cidade}
                      onChange={(e) => setCampo("cidade", e.target.value)}
                      disabled={!isEditing}
                      className="rounded-xl bg-card/50 border-border/50"
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="about">
              <Card className="glass p-6 border-border/50">
                <div className="space-y-2">
                  <Label>Sobre Mim</Label>
                  <Textarea
                    placeholder="Conte um pouco sobre você e sua abordagem terapêutica..."
                    className="rounded-xl bg-card/50 border-border/50 min-h-[200px]"
                    value={perfil.bio}
                    onChange={(e) => setCampo("bio", e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
