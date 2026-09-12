"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save } from "lucide-react"
import { API_BASE } from "@/lib/api-config"
import { MeusDados } from "@/components/lgpd/meus-dados"

type Perfil = {
  nome: string
  email: string
  telefone: string
  cpf: string
  data_nascimento: string
}

export function MeuPerfil() {
  const [perfil, setPerfil] = useState<Perfil>({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    data_nascimento: "",
  })
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
      const token = localStorage.getItem("token") || ""
      const res = await fetch(`${API_BASE}/usuarios/get_perfil.php`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      })
      const data = await res.json()
      if (data.success || data.status === "success") {
        const p = data.usuario || data.perfil || data.data || {}
        setPerfil({
          nome: p.nome || "",
          email: p.email || "",
          telefone: p.telefone || "",
          cpf: p.cpf || "",
          data_nascimento: p.data_nascimento || "",
        })
      } else {
        setError(data.message || "Erro ao carregar perfil.")
      }
    } catch {
      setError("Erro de conexão ao carregar perfil.")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    setSuccess("")
    try {
      const token = localStorage.getItem("token") || ""
      const res = await fetch(`${API_BASE}/usuarios/atualizar_perfil.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(perfil),
      })
      const data = await res.json()
      if (data.success || data.status === "success") {
        setSuccess(data.message || "Perfil atualizado com sucesso!")
        const raw = localStorage.getItem("user") || localStorage.getItem("usuario")
        if (raw) {
          try {
            const parsed = JSON.parse(raw)
            const updated = { ...parsed, nome: perfil.nome, email: perfil.email }
            const key = localStorage.getItem("user") ? "user" : "usuario"
            localStorage.setItem(key, JSON.stringify(updated))
          } catch {
            // ignora
          }
        }
      } else {
        setError(data.message || "Erro ao atualizar perfil.")
      }
    } catch {
      setError("Erro de conexão ao atualizar perfil.")
    } finally {
      setSaving(false)
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">{"Meu Perfil"}</h2>
        <p className="text-muted-foreground mt-1">{"Visualize e edite suas informações pessoais."}</p>
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

      <Card>
        <CardHeader>
          <CardTitle>{"Informações Pessoais"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">{"Nome"}</Label>
              <Input
                id="nome"
                value={perfil.nome}
                onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{"E-mail"}</Label>
              <Input
                id="email"
                type="email"
                value={perfil.email}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">{"Telefone"}</Label>
              <Input
                id="telefone"
                value={perfil.telefone}
                onChange={(e) => setPerfil({ ...perfil, telefone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">{"CPF"}</Label>
              <Input
                id="cpf"
                value={perfil.cpf}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nascimento">{"Data de Nascimento"}</Label>
              <Input
                id="nascimento"
                type="date"
                value={perfil.data_nascimento}
                onChange={(e) => setPerfil({ ...perfil, data_nascimento: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {"Salvando..."}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {"Salvar Alterações"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <MeusDados />
    </div>
  )
}
