"use client"

import { useEffect, useState } from "react"
import { Mail, Phone, MapPin, Save, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MoedaInput } from "@/components/ui/moeda-input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { API_BASE } from "@/lib/api-config"
import { MeusDados } from "@/components/lgpd/meus-dados"

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

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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
  const [erros, setErros] = useState<Record<string, string>>({})
  const [limites, setLimites] = useState<{ minimo: number; maximo: number }>({ minimo: 50, maximo: 1000 })

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
        if (data.limites) {
          setLimites({
            minimo: Number(data.limites.minimo) || 50,
            maximo: Number(data.limites.maximo) || 1000,
          })
        }
      } else {
        setError(data.message || "Não foi possível carregar seu perfil.")
      }
    } catch {
      setError("Erro de conexão ao carregar o perfil.")
    } finally {
      setLoading(false)
    }
  }

  const setCampo = (campo: keyof PerfilProfissional, valor: string) => {
    setPerfil((atual) => ({ ...atual, [campo]: valor }))
    setErros((atual) => {
      if (!atual[campo]) return atual
      const novo = { ...atual }
      delete novo[campo]
      return novo
    })
  }

  // Validação campo a campo. Retorna { campo: mensagem } dos que estiverem errados.
  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {}

    if (!perfil.nome.trim()) e.nome = "Informe o nome completo."
    else if (perfil.nome.trim().length < 2) e.nome = "Nome muito curto."

    if (perfil.telefone.trim()) {
      const dig = perfil.telefone.replace(/\D/g, "")
      if (dig.length < 10 || dig.length > 11) e.telefone = "Telefone deve ter 10 ou 11 dígitos."
    }

    if (perfil.data_nascimento) {
      const d = new Date(perfil.data_nascimento + "T00:00:00")
      if (isNaN(d.getTime())) e.data_nascimento = "Data inválida."
      else if (d > new Date()) e.data_nascimento = "A data não pode ser no futuro."
      else if (d.getFullYear() < 1900) e.data_nascimento = "Data inválida."
    }

    if (!perfil.especialidade.trim()) e.especialidade = "Informe a especialidade."

    const valorStr = perfil.valor_consulta.replace(",", ".").trim()
    if (!valorStr) {
      e.valor_consulta = "Informe o valor da consulta."
    } else {
      const v = Number(valorStr)
      const frac = valorStr.split(".")[1]
      if (!Number.isFinite(v)) e.valor_consulta = "Valor inválido. Use apenas números."
      else if (v <= 0) e.valor_consulta = "O valor deve ser maior que zero."
      else if (v < limites.minimo) e.valor_consulta = `O valor mínimo é R$ ${fmtBRL(limites.minimo)}.`
      else if (v > limites.maximo) e.valor_consulta = `O valor máximo é R$ ${fmtBRL(limites.maximo)}.`
      else if (frac && frac.length > 2) e.valor_consulta = "Use no máximo 2 casas decimais (centavos)."
    }

    if (perfil.estado.trim() && !/^[A-Za-z]{2}$/.test(perfil.estado.trim())) {
      e.estado = "UF deve ter 2 letras (ex: SP)."
    }

    return e
  }

  const handleSave = async () => {
    const e = validate()
    setErros(e)
    if (Object.keys(e).length > 0) {
      setSuccess("")
      setError("Corrija os campos destacados antes de salvar.")
      return
    }

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
          nome: perfil.nome.trim(),
          telefone: perfil.telefone.trim(),
          data_nascimento: perfil.data_nascimento || null,
          especialidade: perfil.especialidade.trim(),
          valor_consulta: Number(Number(perfil.valor_consulta.replace(",", ".")).toFixed(2)),
          bio: perfil.bio,
          cidade: perfil.cidade.trim(),
          estado: perfil.estado.trim().toUpperCase(),
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

  // classe de erro reutilizável para os inputs
  const cls = (campo: string) =>
    `rounded-xl bg-card/50 border-border/50 ${erros[campo] ? "border-red-500 focus-visible:ring-red-500" : ""}`

  const ErroCampo = ({ campo }: { campo: string }) =>
    erros[campo] ? <p className="text-xs text-red-500 mt-1">{erros[campo]}</p> : null

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
                setErros({})
                fetchPerfil()
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-provence-800 to-provence-950"
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
              setError("")
              setErros({})
            }}
            className="rounded-xl bg-gradient-to-r from-provence-800 to-provence-950"
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
              <AvatarFallback className="bg-gradient-to-br from-provence-800 to-provence-950 text-primary-foreground text-3xl font-semibold">
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
                <span className="text-muted-foreground break-all">{perfil.email || "Não informado"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Phone className="w-4 h-4 text-accent" />
                </div>
                <span className="text-muted-foreground">{perfil.telefone || "Não informado"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-muted-foreground">{localizacao || "Não informado"}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Details */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="glass-strong border-border/50 p-1 h-auto flex-wrap">
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
                        className={cls("nome")}
                      />
                      <ErroCampo campo="nome" />
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Nascimento</Label>
                      <Input
                        type="date"
                        value={perfil.data_nascimento}
                        onChange={(e) => setCampo("data_nascimento", e.target.value)}
                        disabled={!isEditing}
                        className={cls("data_nascimento")}
                      />
                      <ErroCampo campo="data_nascimento" />
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
                        className={cls("telefone")}
                      />
                      <ErroCampo campo="telefone" />
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
                        className={cls("especialidade")}
                      />
                      <ErroCampo campo="especialidade" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Valor da Consulta (R$)</Label>
                      <MoedaInput
                        value={perfil.valor_consulta}
                        onValueChange={(v) => setCampo("valor_consulta", v)}
                        max={limites.maximo}
                        disabled={!isEditing}
                        className={cls("valor_consulta")}
                      />
                      <ErroCampo campo="valor_consulta" />
                      <p className="text-xs text-muted-foreground">
                        Permitido entre R$ {fmtBRL(limites.minimo)} e R$ {fmtBRL(limites.maximo)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Estado (UF)</Label>
                      <Input
                        maxLength={2}
                        value={perfil.estado}
                        onChange={(e) => setCampo("estado", e.target.value.toUpperCase())}
                        disabled={!isEditing}
                        placeholder="SP"
                        className={cls("estado")}
                      />
                      <ErroCampo campo="estado" />
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

          <div className="mt-6">
            <MeusDados />
          </div>
        </div>
      </div>
    </div>
  )
}
