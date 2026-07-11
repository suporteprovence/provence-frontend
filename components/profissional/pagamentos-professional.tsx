"use client"

import { useEffect, useState } from "react"
import { Loader2, TrendingUp, Calendar, User, Wallet, Landmark, Save } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { API_BASE } from "@/lib/api-config"

type Pagamento = {
  id: number
  paciente_nome: string
  data_formatada: string
  valor_pago: number | string
  status: string
}

type Banco = {
  banco: string
  agencia: string
  conta: string
  tipo_conta: string
  chave_pix: string
  tipo_pix: string
}

const bancoVazio: Banco = { banco: "", agencia: "", conta: "", tipo_conta: "", chave_pix: "", tipo_pix: "" }

const brl = (v: number | string) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

export function PagamentosProfessional() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [totalMes, setTotalMes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Dados bancários
  const [banco, setBanco] = useState<Banco>(bancoVazio)
  const [editBanco, setEditBanco] = useState(false)
  const [savingBanco, setSavingBanco] = useState(false)
  const [bancoErros, setBancoErros] = useState<Record<string, string>>({})
  const [bancoMsg, setBancoMsg] = useState("")
  const [bancoErro, setBancoErro] = useState("")

  useEffect(() => {
    fetchPagamentos()
    fetchBanco()
  }, [])

  const fetchPagamentos = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`${API_BASE}/dashboard/get_pagamentos.php`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      })
      const data = await res.json()
      if (data.success && data.data) {
        setPagamentos(Array.isArray(data.data.pagamentos) ? data.data.pagamentos : [])
        setTotalMes(Number(data.data.total_mes) || 0)
      } else {
        setError(data.message || "Não foi possível carregar os pagamentos.")
      }
    } catch {
      setError("Erro de conexão ao carregar os pagamentos.")
    } finally {
      setLoading(false)
    }
  }

  const fetchBanco = async () => {
    try {
      const res = await fetch(`${API_BASE}/profissional/dados_bancarios.php`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      })
      const data = await res.json()
      if (data.success && data.data) {
        setBanco({
          banco: data.data.banco ?? "",
          agencia: data.data.agencia ?? "",
          conta: data.data.conta ?? "",
          tipo_conta: data.data.tipo_conta ?? "",
          chave_pix: data.data.chave_pix ?? "",
          tipo_pix: data.data.tipo_pix ?? "",
        })
      }
    } catch {
      // silencioso: a seção só não vem preenchida
    }
  }

  const setCampoBanco = (campo: keyof Banco, valor: string) => {
    setBanco((atual) => ({ ...atual, [campo]: valor }))
    setBancoErros((atual) => {
      if (!atual[campo]) return atual
      const novo = { ...atual }
      delete novo[campo]
      return novo
    })
  }

  const validarBanco = (): Record<string, string> => {
    const e: Record<string, string> = {}
    if (banco.chave_pix.trim() && !banco.tipo_pix) e.tipo_pix = "Escolha o tipo da chave Pix."
    if (banco.tipo_pix && !banco.chave_pix.trim()) e.chave_pix = "Informe a chave Pix."
    return e
  }

  const salvarBanco = async () => {
    const e = validarBanco()
    setBancoErros(e)
    if (Object.keys(e).length > 0) {
      setBancoMsg("")
      setBancoErro("Corrija os campos destacados.")
      return
    }
    setSavingBanco(true)
    setBancoErro("")
    setBancoMsg("")
    try {
      const res = await fetch(`${API_BASE}/profissional/dados_bancarios.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(banco),
      })
      const data = await res.json()
      if (data.success) {
        setBancoMsg("Dados bancários salvos com sucesso!")
        setEditBanco(false)
      } else {
        if (data.erros) setBancoErros(data.erros)
        setBancoErro(data.message || "Não foi possível salvar.")
      }
    } catch {
      setBancoErro("Erro de conexão ao salvar.")
    } finally {
      setSavingBanco(false)
    }
  }

  const totalRecebido = pagamentos
    .filter((p) => p.status === "paga" || p.status === "realizada")
    .reduce((s, p) => s + Number(p.valor_pago || 0), 0)

  const errBanco = (campo: string) =>
    bancoErros[campo] ? <p className="text-xs text-red-500 mt-1">{bancoErros[campo]}</p> : null

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
        <h2 className="text-2xl font-bold">Pagamentos</h2>
        <p className="text-muted-foreground">Suas receitas e onde você recebe os repasses.</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Dados bancários */}
      <Card className="p-6 border-border/50">
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary" />
              Dados Bancários
            </h3>
            <p className="text-sm text-muted-foreground">Onde a plataforma envia o repasse das suas consultas.</p>
          </div>
          {editBanco ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={savingBanco}
                onClick={() => {
                  setEditBanco(false)
                  setBancoErros({})
                  setBancoErro("")
                  fetchBanco()
                }}
              >
                Cancelar
              </Button>
              <Button
                className="rounded-xl bg-gradient-to-r from-primary to-accent"
                disabled={savingBanco}
                onClick={salvarBanco}
              >
                {savingBanco ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setEditBanco(true)
                setBancoMsg("")
              }}
            >
              Editar
            </Button>
          )}
        </div>

        {bancoErro && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{bancoErro}</AlertDescription>
          </Alert>
        )}
        {bancoMsg && (
          <Alert className="mb-4">
            <AlertDescription className="text-emerald-700">{bancoMsg}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Banco</Label>
            <Input
              value={banco.banco}
              onChange={(e) => setCampoBanco("banco", e.target.value)}
              disabled={!editBanco}
              placeholder="Ex: Nubank, Itaú, Caixa..."
              className="rounded-xl bg-card/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Agência</Label>
            <Input
              value={banco.agencia}
              onChange={(e) => setCampoBanco("agencia", e.target.value)}
              disabled={!editBanco}
              className="rounded-xl bg-card/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Conta</Label>
            <Input
              value={banco.conta}
              onChange={(e) => setCampoBanco("conta", e.target.value)}
              disabled={!editBanco}
              className="rounded-xl bg-card/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de conta</Label>
            <Select
              value={banco.tipo_conta}
              onValueChange={(v) => setCampoBanco("tipo_conta", v)}
              disabled={!editBanco}
            >
              <SelectTrigger className="rounded-xl bg-card/50 border-border/50">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="corrente">Conta corrente</SelectItem>
                <SelectItem value="poupanca">Poupança</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de chave Pix</Label>
            <Select
              value={banco.tipo_pix}
              onValueChange={(v) => setCampoBanco("tipo_pix", v)}
              disabled={!editBanco}
            >
              <SelectTrigger className={`rounded-xl bg-card/50 border-border/50 ${bancoErros.tipo_pix ? "border-red-500" : ""}`}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="telefone">Telefone</SelectItem>
                <SelectItem value="aleatoria">Chave aleatória</SelectItem>
              </SelectContent>
            </Select>
            {errBanco("tipo_pix")}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Chave Pix</Label>
            <Input
              value={banco.chave_pix}
              onChange={(e) => setCampoBanco("chave_pix", e.target.value)}
              disabled={!editBanco}
              className={`rounded-xl bg-card/50 border-border/50 ${bancoErros.chave_pix ? "border-red-500" : ""}`}
            />
            {errBanco("chave_pix")}
          </div>
        </div>
      </Card>

      {/* Resumo de receitas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Recebido no mês</p>
          </div>
          <p className="text-3xl font-bold">{brl(totalMes)}</p>
        </Card>
        <Card className="p-6 border-border/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Últimas transações</p>
          </div>
          <p className="text-3xl font-bold">{brl(totalRecebido)}</p>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Últimas transações</h3>
        {pagamentos.length === 0 ? (
          <Card className="p-6 text-center border-border/50">
            <p className="text-muted-foreground">Nenhum pagamento registrado ainda.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {pagamentos.map((p) => (
              <Card key={p.id} className="p-4 border-border/50">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {p.paciente_nome}
                    </div>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {p.data_formatada}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-emerald-600">{brl(p.valor_pago)}</span>
                    <Badge
                      variant="secondary"
                      className={
                        p.status === "realizada"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                      }
                    >
                      {p.status === "realizada" ? "Realizada" : "Paga"}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
