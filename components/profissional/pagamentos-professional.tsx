"use client"

import { useEffect, useState } from "react"
import {
  Loader2,
  TrendingUp,
  Calendar,
  User,
  Wallet,
  Landmark,
  Save,
  Clock,
  RefreshCw,
  Info,
  AlertCircle,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { API_BASE } from "@/lib/api-config"

type Fase = "aguardando_sessao" | "a_receber" | "recebido" | "reembolsado"

type Pagamento = {
  id: number
  consulta_id: number
  valor_total: number | string
  valor_profissional: number | string
  valor_plataforma: number | string
  status: string
  metodo_pagamento: string | null
  data_pagamento: string | null
  data_liberacao: string | null
  data_repasse: string | null
  data_hora: string
  status_consulta: string
  data_formatada: string
  horario: string
  paciente_nome: string
  fase: Fase
}

type Resumo = {
  a_receber: number
  recebido: number
  aguardando_sessao: number
  total_mes: number
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
const resumoVazio: Resumo = { a_receber: 0, recebido: 0, aguardando_sessao: 0, total_mes: 0 }

const FASES: Record<Fase, { label: string; classe: string }> = {
  aguardando_sessao: { label: "Aguardando sessão", classe: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  a_receber: { label: "A receber", classe: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  recebido: { label: "Recebido", classe: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  reembolsado: { label: "Reembolsado", classe: "bg-red-500/10 text-red-700 border-red-500/20" },
}

const METODOS: Record<string, string> = {
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  boleto: "Boleto",
  saldo_mp: "Saldo do Mercado Pago",
}

const brl = (v: number | string) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const nomeMetodo = (m: string | null | undefined) => (m ? METODOS[m] ?? m.replace(/_/g, " ") : "Não informado")

// "2026-09-16 16:50:02" -> "16/09/2026 às 16:50"
const fmtDataHora = (v: string | null | undefined) => {
  if (!v) return ""
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(v)
  if (!m) return v
  return `${m[3]}/${m[2]}/${m[1]} às ${m[4]}:${m[5]}`
}

function FaseBadge({ fase }: { fase: Fase }) {
  const f = FASES[fase] ?? { label: fase, classe: "" }
  return (
    <Badge variant="secondary" className={`whitespace-nowrap ${f.classe}`}>
      {f.label}
    </Badge>
  )
}

function DatasPagamento({ p }: { p: Pagamento }) {
  const linhas: string[] = []
  if (p.data_pagamento) linhas.push(`Pago em ${fmtDataHora(p.data_pagamento)}`)
  if (p.data_liberacao) linhas.push(`Liberado em ${fmtDataHora(p.data_liberacao)}`)
  if (p.data_repasse) linhas.push(`Repassado em ${fmtDataHora(p.data_repasse)}`)
  if (p.fase === "reembolsado") linhas.push("Valor devolvido ao paciente")
  if (linhas.length === 0) return null
  return (
    <div className="text-xs text-muted-foreground space-y-0.5">
      {linhas.map((l) => (
        <p key={l}>{l}</p>
      ))}
    </div>
  )
}

export function PagamentosProfessional() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [resumo, setResumo] = useState<Resumo>(resumoVazio)
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
      const res = await fetch(`${API_BASE}/profissional/get_pagamentos.php`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      })
      let data: any = null
      try {
        data = await res.json()
      } catch {
        data = null
      }
      if (res.ok && data?.success && data.data) {
        const lista = Array.isArray(data.data.pagamentos) ? data.data.pagamentos : []
        const r = data.data.resumo || {}
        setPagamentos(lista)
        setResumo({
          a_receber: Number(r.a_receber) || 0,
          recebido: Number(r.recebido) || 0,
          aguardando_sessao: Number(r.aguardando_sessao) || 0,
          total_mes: Number(r.total_mes) || 0,
        })
      } else if (res.status === 401) {
        setError("Sua sessão expirou. Entre novamente para ver seus pagamentos.")
      } else {
        setError(data?.message || "Não foi possível carregar os pagamentos.")
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

  const errBanco = (campo: string) =>
    bancoErros[campo] ? <p className="text-xs text-red-500 mt-1">{bancoErros[campo]}</p> : null

  const renderPagamentos = () => {
    if (loading) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="p-6 border-border/50">
                <Skeleton className="h-4 w-28 mb-3" />
                <Skeleton className="h-9 w-36 mb-2" />
                <Skeleton className="h-3 w-40" />
              </Card>
            ))}
          </div>
          <Card className="p-6 border-border/50 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </Card>
        </div>
      )
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-3 flex-wrap">
            <span>{error}</span>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={fetchPagamentos}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    return (
      <div className="space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">A receber</p>
            </div>
            <p className="text-3xl font-bold">{brl(resumo.a_receber)}</p>
            <p className="text-xs text-muted-foreground mt-1">Liberado e ainda não repassado</p>
          </Card>
          <Card className="p-6 border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Recebido</p>
            </div>
            <p className="text-3xl font-bold">{brl(resumo.recebido)}</p>
            <p className="text-xs text-muted-foreground mt-1">Neste mês: {brl(resumo.total_mes)}</p>
          </Card>
          <Card className="p-6 border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Aguardando sessão</p>
            </div>
            <p className="text-3xl font-bold">{brl(resumo.aguardando_sessao)}</p>
            <p className="text-xs text-muted-foreground mt-1">Pago pelo paciente, sessão ainda não confirmada</p>
          </Card>
        </div>

        {/* Lista */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Pagamentos das consultas</h3>
          {pagamentos.length === 0 ? (
            <Card className="p-6 text-center border-border/50">
              <p className="text-muted-foreground">Nenhum pagamento registrado ainda.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Quando um paciente pagar uma consulta, ela aparece aqui.
              </p>
            </Card>
          ) : (
            <>
              {/* Tabela (telas médias e maiores) */}
              <Card className="border-border/50 overflow-hidden hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Data e hora</TableHead>
                      <TableHead className="text-right">Consulta</TableHead>
                      <TableHead className="text-right">Sua parte</TableHead>
                      <TableHead className="text-right">Taxa da plataforma</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagamentos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.paciente_nome}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {p.data_formatada} às {p.horario}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">{brl(p.valor_total)}</TableCell>
                        <TableCell
                          className={`text-right whitespace-nowrap font-semibold ${
                            p.fase === "reembolsado" ? "text-muted-foreground line-through" : "text-emerald-700"
                          }`}
                        >
                          {brl(p.valor_profissional)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                          {brl(p.valor_plataforma)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{nomeMetodo(p.metodo_pagamento)}</TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <FaseBadge fase={p.fase} />
                            <DatasPagamento p={p} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Cards (celular) */}
              <div className="space-y-3 md:hidden">
                {pagamentos.map((p) => (
                  <Card key={p.id} className="p-4 border-border/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 font-medium">
                          <User className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{p.paciente_nome}</span>
                        </div>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {p.data_formatada} às {p.horario}
                        </span>
                      </div>
                      <FaseBadge fase={p.fase} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Consulta</p>
                        <p className="font-medium">{brl(p.valor_total)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sua parte</p>
                        <p
                          className={`font-semibold ${
                            p.fase === "reembolsado" ? "text-muted-foreground line-through" : "text-emerald-700"
                          }`}
                        >
                          {brl(p.valor_profissional)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Taxa</p>
                        <p className="text-muted-foreground">{brl(p.valor_plataforma)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground">Método: {nomeMetodo(p.metodo_pagamento)}</p>
                      <DatasPagamento p={p} />
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold">Pagamentos</h2>
          <p className="text-muted-foreground">Suas receitas e onde você recebe os repasses.</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={fetchPagamentos} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <Alert variant="info">
        <Info className="h-4 w-4" />
        <AlertDescription>
          O valor é liberado quando você e o paciente confirmam o término da sessão; o repasse é feito por Pix pela
          administração para a conta cadastrada abaixo.
        </AlertDescription>
      </Alert>

      {renderPagamentos()}

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
                className="rounded-xl bg-gradient-to-r from-provence-800 to-provence-950"
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
    </div>
  )
}
