"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  CheckCircle,
  XCircle,
  Eye,
  Users,
  Clock,
  Shield,
  Loader2,
  AlertTriangle,
  LogOut,
  RefreshCw,
  Undo2,
  Banknote,
  Landmark,
  History,
} from "lucide-react"
import { logout } from "@/lib/logout"

interface ProfissionalPendente {
  id: number
  nome: string
  email: string
  telefone: string
  cpf: string
  crp: string
  especialidade: string
  valor_consulta: number
  bio: string
  foto_perfil: string
  criado_em: string
}

// Etapa 2: reembolsos (GET/POST admin/reembolsos.php)
interface Reembolso {
  id: number
  consulta_id: number
  motivo: string
  valor_reembolso: number
  status: string
  justificativa: string | null
  data_solicitacao: string
  data_resposta: string | null
  mp_refund_id: string | null
  data_hora: string
  status_consulta: string
  paciente_nome: string
  paciente_email: string
  profissional_nome: string
  pagamento_id: number | null
  status_pagamento: string | null
  metodo_pagamento: string | null
  mp_payment_id: string | null
  pode_estornar_automatico: boolean
}

// Etapa 2: repasses aos profissionais (GET/POST admin/repasses.php)
interface RepasseItem {
  pagamento_id: number
  consulta_id: number
  data_hora: string
  paciente_nome: string
  valor_profissional: number
  data_liberacao: string | null
}

interface DadosBancarios {
  banco: string | null
  agencia: string | null
  conta: string | null
  tipo_conta: string | null
  chave_pix: string | null
  tipo_pix: string | null
}

interface RepassePendente {
  id_profissional: number
  profissional_nome: string
  profissional_email: string
  dados_bancarios: DadosBancarios
  total_a_repassar: number
  itens: RepasseItem[]
}

interface RepasseHistorico {
  pagamento_id: number
  consulta_id: number
  profissional_nome: string
  valor_profissional: number
  data_repasse: string
}

type Mensagem = { tipo: "sucesso" | "erro"; texto: string } | null

const STATUS_REEMBOLSO: Record<string, { label: string; className: string }> = {
  solicitado: { label: "Em análise", className: "bg-amber-100 text-amber-800 border-amber-200" },
  aprovado: { label: "Aprovado", className: "bg-blue-100 text-blue-800 border-blue-200" },
  pago: { label: "Estornado", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  recusado: { label: "Recusado", className: "bg-red-100 text-red-800 border-red-200" },
}

const METODOS_PAGAMENTO: Record<string, string> = {
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  saldo_mp: "Saldo do Mercado Pago",
  cartao_debito: "Cartão de débito",
  boleto: "Boleto",
}

export default function AdminDashboard() {
  const [profissionais, setProfissionais] = useState<ProfissionalPendente[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedProfissional, setSelectedProfissional] = useState<ProfissionalPendente | null>(null)
  const [motivoRecusa, setMotivoRecusa] = useState("")
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Reembolsos
  const [reembolsos, setReembolsos] = useState<Reembolso[]>([])
  const [loadingReembolsos, setLoadingReembolsos] = useState(true)
  const [erroReembolsos, setErroReembolsos] = useState("")
  const [ambientePagamento, setAmbientePagamento] = useState<string | null>(null)
  const [mensagemReembolso, setMensagemReembolso] = useState<Mensagem>(null)
  const [reembolsoDialog, setReembolsoDialog] = useState<{ reembolso: Reembolso; acao: "aprovar" | "recusar" } | null>(null)
  const [justificativaReembolso, setJustificativaReembolso] = useState("")
  const [erroDialogoReembolso, setErroDialogoReembolso] = useState("")
  const [reembolsoLoading, setReembolsoLoading] = useState(false)

  // Repasses
  const [repassesPendentes, setRepassesPendentes] = useState<RepassePendente[]>([])
  const [repassesHistorico, setRepassesHistorico] = useState<RepasseHistorico[]>([])
  const [loadingRepasses, setLoadingRepasses] = useState(true)
  const [erroRepasses, setErroRepasses] = useState("")
  const [mensagemRepasse, setMensagemRepasse] = useState<Mensagem>(null)
  const [repasseDialog, setRepasseDialog] = useState<{ profissional: RepassePendente; item: RepasseItem } | null>(null)
  const [erroDialogoRepasse, setErroDialogoRepasse] = useState("")
  const [repasseLoading, setRepasseLoading] = useState(false)


  // Os PHPs do painel administrativo ficam em public_html/admin/ na Hostinger
  const API_ROOT =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "https://provence.host"
  const API_BASE = `${API_ROOT}/admin`


  const ENDPOINTS = {
    listarPendentes: `${API_BASE}/listar_profissionais_pendentes.php`,
    aprovar: `${API_BASE}/aprovar_profissional.php`,
    recusar: `${API_BASE}/recusar_profissional.php`,
    reembolsos: `${API_BASE}/reembolsos.php`,
    repasses: `${API_BASE}/repasses.php`,
  } as const

  useEffect(() => {
    setMounted(true)

    // Verificar se é admin
    const userLogged = localStorage.getItem("user_logged")
    if (!userLogged) {
      router.push("/login")
      return
    }

    try {
      const userData = JSON.parse(userLogged)
      if (userData.tipo_usuario !== "admin") {
        router.push("/login")
        return
      }
      setUser(userData)
    } catch {
      router.push("/login")
      return
    }

    carregarTudo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const carregarTudo = () => {
    carregarProfissionaisPendentes()
    carregarReembolsos()
    carregarRepasses()
  }

  const carregarProfissionaisPendentes = async () => {
    try {
      setError("")
      setSuccess("")
      setLoading(true)

      const response = await fetch(ENDPOINTS.listarPendentes, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Erro ao carregar dados (${response.status})`)
      }

      const data = await response.json()

      // alguns backends retornam {sucesso, data: []} e outros retornam direto []
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
      setProfissionais(list)
    } catch (err) {
      setError("Erro ao carregar profissionais pendentes")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const carregarReembolsos = async () => {
    try {
      setErroReembolsos("")
      setLoadingReembolsos(true)

      const response = await fetch(ENDPOINTS.reembolsos, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      })
      const data = await response.json().catch(() => null)

      if (!response.ok || data?.success !== true) {
        throw new Error(data?.message || `Erro ao carregar reembolsos (${response.status})`)
      }

      setReembolsos(Array.isArray(data.data) ? data.data : [])
      setAmbientePagamento(data.ambiente ?? null)
    } catch (err) {
      setErroReembolsos(err instanceof Error ? err.message : "Erro ao carregar reembolsos")
      console.error(err)
    } finally {
      setLoadingReembolsos(false)
    }
  }

  const carregarRepasses = async () => {
    try {
      setErroRepasses("")
      setLoadingRepasses(true)

      const response = await fetch(ENDPOINTS.repasses, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      })
      const data = await response.json().catch(() => null)

      if (!response.ok || data?.success !== true) {
        throw new Error(data?.message || `Erro ao carregar repasses (${response.status})`)
      }

      setRepassesPendentes(Array.isArray(data.data?.pendentes) ? data.data.pendentes : [])
      setRepassesHistorico(Array.isArray(data.data?.historico) ? data.data.historico : [])
    } catch (err) {
      setErroRepasses(err instanceof Error ? err.message : "Erro ao carregar repasses")
      console.error(err)
    } finally {
      setLoadingRepasses(false)
    }
  }

  const aprovarProfissional = async (id: number) => {
    setActionLoading(id)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(ENDPOINTS.aprovar, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ id }),
        credentials: "include",
      })

      const data = await response.json()

      if (data?.sucesso || data?.success === true) {
        setSuccess("Profissional aprovado com sucesso!")
        setProfissionais((prev) => prev.filter((p) => p.id !== id))
      } else {
        setError(data?.mensagem || data?.message || "Erro ao aprovar profissional")
      }
    } catch (err) {
      setError("Erro de conexão")
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  const recusarProfissional = async (id: number) => {
    setActionLoading(id)
    setError("")
    setSuccess("")

    try {
      // Você tem "motivoRecusa" na UI. Se seu PHP ignorar, beleza; se usar, já vai pronto.
      const response = await fetch(ENDPOINTS.recusar, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ id, motivo: motivoRecusa }),
        credentials: "include",
      })

      const data = await response.json()

      if (data?.sucesso || data?.success === true) {
        setSuccess("Profissional recusado e removido do sistema")
        setProfissionais((prev) => prev.filter((p) => p.id !== id))
        setSelectedProfissional(null)
        setMotivoRecusa("")
      } else {
        setError(data?.mensagem || data?.message || "Erro ao recusar profissional")
      }
    } catch (err) {
      setError("Erro de conexão")
      console.error(err)
    } finally {
      setActionLoading(null)
    }
  }

  // ----- Reembolsos: abrir/fechar diálogo e responder -----
  const abrirDialogoReembolso = (reembolso: Reembolso, acao: "aprovar" | "recusar") => {
    setJustificativaReembolso("")
    setErroDialogoReembolso("")
    setMensagemReembolso(null)
    setReembolsoDialog({ reembolso, acao })
  }

  const fecharDialogoReembolso = () => {
    if (reembolsoLoading) return
    setReembolsoDialog(null)
    setJustificativaReembolso("")
    setErroDialogoReembolso("")
  }

  const responderReembolso = async () => {
    if (!reembolsoDialog) return
    const { reembolso, acao } = reembolsoDialog
    const justificativa = justificativaReembolso.trim()

    if (acao === "recusar" && justificativa.length < 5) {
      setErroDialogoReembolso("Explique o motivo da recusa (mínimo de 5 caracteres). O paciente vai ver esse texto.")
      return
    }

    setReembolsoLoading(true)
    setErroDialogoReembolso("")

    try {
      const response = await fetch(ENDPOINTS.reembolsos, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ reembolso_id: reembolso.id, acao, justificativa }),
        credentials: "include",
      })
      const data = await response.json().catch(() => null)

      if (data?.success === true) {
        setMensagemReembolso({
          tipo: "sucesso",
          texto: data.message || (acao === "aprovar" ? "Reembolso aprovado." : "Pedido recusado."),
        })
        setReembolsoDialog(null)
        setJustificativaReembolso("")
        carregarReembolsos()
      } else {
        setErroDialogoReembolso(data?.message || `Não foi possível responder o pedido (${response.status})`)
      }
    } catch (err) {
      setErroDialogoReembolso("Erro de conexão")
      console.error(err)
    } finally {
      setReembolsoLoading(false)
    }
  }

  // ----- Repasses: abrir/fechar diálogo e marcar como repassado -----
  const abrirDialogoRepasse = (profissional: RepassePendente, item: RepasseItem) => {
    setErroDialogoRepasse("")
    setMensagemRepasse(null)
    setRepasseDialog({ profissional, item })
  }

  const fecharDialogoRepasse = () => {
    if (repasseLoading) return
    setRepasseDialog(null)
    setErroDialogoRepasse("")
  }

  const marcarRepassado = async () => {
    if (!repasseDialog) return
    const { item } = repasseDialog

    setRepasseLoading(true)
    setErroDialogoRepasse("")

    try {
      const response = await fetch(ENDPOINTS.repasses, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ pagamento_id: item.pagamento_id, acao: "marcar_repassado" }),
        credentials: "include",
      })
      const data = await response.json().catch(() => null)

      if (data?.success === true) {
        setMensagemRepasse({ tipo: "sucesso", texto: data.message || "Repasse registrado." })
        setRepasseDialog(null)
        carregarRepasses()
      } else {
        setErroDialogoRepasse(data?.message || `Não foi possível registrar o repasse (${response.status})`)
      }
    } catch (err) {
      setErroDialogoRepasse("Erro de conexão")
      console.error(err)
    } finally {
      setRepasseLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
  }

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // "2026-09-16 16:50:01" -> "16/09/2026 16:50" (sem depender do parser de Date do navegador)
  const formatarDataHora = (valor: string | null | undefined) => {
    if (!valor) return "-"
    const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
    if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`
    const d = new Date(valor)
    return isNaN(d.getTime()) ? valor : formatarData(valor)
  }

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor)
  }

  const formatarMetodo = (metodo: string | null | undefined) => {
    if (!metodo) return "-"
    return METODOS_PAGAMENTO[metodo] || metodo
  }

  const reembolsosEmAnalise = reembolsos.filter((r) => r.status === "solicitado").length
  const totalRepassesPendentes = repassesPendentes.reduce((soma, p) => soma + Number(p.total_a_repassar || 0), 0)
  const justificativaValida = justificativaReembolso.trim().length >= 5

  const renderMensagem = (mensagem: Mensagem) => {
    if (!mensagem) return null
    return mensagem.tipo === "sucesso" ? (
      <Alert className="mb-6 border-emerald-200 bg-emerald-50/80 backdrop-blur-sm rounded-2xl">
        <CheckCircle className="h-5 w-5 text-emerald-600" />
        <AlertDescription className="text-emerald-700 font-medium">{mensagem.texto}</AlertDescription>
      </Alert>
    ) : (
      <Alert className="mb-6 border-red-200 bg-red-50/80 backdrop-blur-sm rounded-2xl">
        <AlertTriangle className="h-5 w-5 text-red-600" />
        <AlertDescription className="text-red-700 font-medium">{mensagem.texto}</AlertDescription>
      </Alert>
    )
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-provence-50 to-provence-100 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-provence-200 rounded-full"></div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-provence-50 to-provence-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-provence-900 mx-auto mb-4" />
          <p className="text-slate-600">Carregando painel administrativo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-provence-50 to-provence-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-provence-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-provence-100/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto p-6 relative z-10">
        {/* Header */}
        <div className="mb-8 animate-in fade-in-0 slide-in-from-top-4 duration-1000">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-provence-800 via-provence-900 to-provence-950 bg-clip-text text-transparent mb-2">
                Painel Administrativo
              </h1>
              <p className="text-slate-600 text-lg">Bem-vindo, {user?.nome || "Administrador"}!</p>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={carregarTudo}
                variant="outline"
                size="sm"
                className="border-provence-200 text-provence-900 hover:bg-provence-50 bg-white/80 backdrop-blur-sm rounded-xl"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>

              <div className="flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-provence-100">
                <Shield className="h-5 w-5 text-provence-900" />
                <Badge className="bg-gradient-to-r from-provence-900 to-provence-950 text-white border-0">
                  Administrador
                </Badge>
              </div>

              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50 bg-white/80 backdrop-blur-sm rounded-xl"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-200">
          <Card className="bg-white/80 backdrop-blur-xl border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Pendentes de Aprovação</CardTitle>
              <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800 mb-1">{profissionais.length}</div>
              <p className="text-sm text-slate-500">
                {profissionais.length === 0 ? "Nenhum pendente" : "Aguardando análise"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-xl border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Reembolsos em análise</CardTitle>
              <div className="p-2 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-xl">
                <Undo2 className="h-5 w-5 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800 mb-1" data-testid="stat-reembolsos">
                {loadingReembolsos ? "..." : reembolsosEmAnalise}
              </div>
              <p className="text-sm text-slate-500">
                {loadingReembolsos
                  ? "Carregando"
                  : reembolsosEmAnalise === 0
                    ? "Nenhum pedido aguardando resposta"
                    : "Aguardando resposta da administração"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-xl border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Repasses pendentes</CardTitle>
              <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                <Banknote className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800 mb-1" data-testid="stat-repasses">
                {loadingRepasses ? "..." : formatarValor(totalRepassesPendentes)}
              </div>
              <p className="text-sm text-slate-500">
                {loadingRepasses
                  ? "Carregando"
                  : repassesPendentes.length === 0
                    ? "Nenhum repasse pendente"
                    : `${repassesPendentes.length} ${repassesPendentes.length === 1 ? "profissional aguardando" : "profissionais aguardando"} o Pix`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-2xl">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {success && (
          <div className="mb-6 animate-in fade-in-0 slide-in-from-top-2 duration-300">
            <Alert className="border-emerald-200 bg-emerald-50/80 backdrop-blur-sm rounded-2xl">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <AlertDescription className="text-emerald-700 font-medium">{success}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Tabela de Profissionais Pendentes */}
        <Card className="bg-white/80 backdrop-blur-xl border-0 rounded-2xl shadow-lg animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-400">
          <CardHeader className="pb-6">
            <CardTitle className="text-slate-800 flex items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-provence-50 to-provence-100 rounded-xl">
                <Users className="h-6 w-6 text-provence-900" />
              </div>
              Profissionais Aguardando Aprovação ({profissionais.length})
            </CardTitle>
          </CardHeader>

          <CardContent>
            {profissionais.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-emerald-600" />
                </div>
                <h3 className="text-slate-800 text-2xl font-semibold mb-3">Nenhum profissional pendente!</h3>
                <p className="text-slate-500 mb-6 text-lg">Todas as solicitações foram processadas.</p>
                <Button
                  onClick={carregarProfissionaisPendentes}
                  className="bg-gradient-to-r from-provence-900 to-provence-950 hover:from-provence-950 hover:to-provence-950 text-white rounded-xl px-6 py-3"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar Novamente
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead className="text-slate-600 font-semibold">Profissional</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Contato</TableHead>
                      <TableHead className="text-slate-600 font-semibold">CRP</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Especialidade</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Valor/Consulta</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Data Cadastro</TableHead>
                      <TableHead className="text-center text-slate-600 font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profissionais.map((profissional) => (
                      <TableRow
                        key={profissional.id}
                        className="border-slate-100 hover:bg-slate-50/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={profissional.foto_perfil || undefined} />
                              <AvatarFallback className="bg-gradient-to-br from-provence-900 to-provence-950 text-white font-semibold">
                                {profissional.nome.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-slate-800">{profissional.nome}</p>
                              <p className="text-sm text-slate-500">{profissional.cpf}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-slate-700">{profissional.email}</p>
                            <p className="text-sm text-slate-500">{profissional.telefone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-gradient-to-r from-provence-50 to-provence-100 text-provence-900 border-provence-100">
                            {profissional.crp}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">{profissional.especialidade}</TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          {formatarValor(profissional.valor_consulta)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">{formatarData(profissional.criado_em)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 justify-center">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedProfissional(profissional)}
                                  className="border-provence-100 text-provence-900 hover:bg-provence-50 rounded-xl"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-0 rounded-2xl">
                                <DialogHeader>
                                  <DialogTitle className="text-slate-800 text-xl">Detalhes do Profissional</DialogTitle>
                                  <DialogDescription className="text-slate-600">
                                    Revise as informações antes de aprovar ou recusar
                                  </DialogDescription>
                                </DialogHeader>

                                {selectedProfissional && (
                                  <div className="space-y-6">
                                    <div className="flex items-center gap-4">
                                      <Avatar className="h-20 w-20">
                                        <AvatarImage src={selectedProfissional.foto_perfil || undefined} />
                                        <AvatarFallback className="bg-gradient-to-br from-provence-900 to-provence-950 text-white text-2xl font-bold">
                                          {selectedProfissional.nome.charAt(0)}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <h3 className="text-2xl font-bold text-slate-800">
                                          {selectedProfissional.nome}
                                        </h3>
                                        <p className="text-slate-600 text-lg">{selectedProfissional.especialidade}</p>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                      <div>
                                        <Label className="text-slate-700 font-semibold">E-mail</Label>
                                        <p className="text-slate-600 mt-1">{selectedProfissional.email}</p>
                                      </div>
                                      <div>
                                        <Label className="text-slate-700 font-semibold">Telefone</Label>
                                        <p className="text-slate-600 mt-1">{selectedProfissional.telefone}</p>
                                      </div>
                                      <div>
                                        <Label className="text-slate-700 font-semibold">CPF</Label>
                                        <p className="text-slate-600 mt-1">{selectedProfissional.cpf}</p>
                                      </div>
                                      <div>
                                        <Label className="text-slate-700 font-semibold">CRP</Label>
                                        <p className="text-slate-600 mt-1">{selectedProfissional.crp}</p>
                                      </div>
                                      <div>
                                        <Label className="text-slate-700 font-semibold">Valor por Consulta</Label>
                                        <p className="text-slate-800 font-semibold mt-1">
                                          {formatarValor(selectedProfissional.valor_consulta)}
                                        </p>
                                      </div>
                                      <div>
                                        <Label className="text-slate-700 font-semibold">Data de Cadastro</Label>
                                        <p className="text-slate-600 mt-1">
                                          {formatarData(selectedProfissional.criado_em)}
                                        </p>
                                      </div>
                                    </div>

                                    <div>
                                      <Label className="text-slate-700 font-semibold">Biografia</Label>
                                      <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <p className="text-slate-700 leading-relaxed">
                                          {selectedProfissional.bio || "Nenhuma biografia fornecida"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            <Button
                              size="sm"
                              onClick={() => aprovarProfissional(profissional.id)}
                              disabled={actionLoading === profissional.id}
                              className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl"
                            >
                              {actionLoading === profissional.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                            </Button>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedProfissional(profissional)}
                                  className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-xl"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-white/95 backdrop-blur-xl border-0 rounded-2xl">
                                <DialogHeader>
                                  <DialogTitle className="text-red-700 text-xl">Recusar Profissional</DialogTitle>
                                  <DialogDescription className="text-slate-600">
                                    Tem certeza que deseja recusar este profissional? Esta ação não pode ser desfeita.
                                  </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="motivo" className="text-slate-700 font-semibold">
                                      Motivo da recusa (opcional)
                                    </Label>
                                    <Textarea
                                      id="motivo"
                                      value={motivoRecusa}
                                      onChange={(e) => setMotivoRecusa(e.target.value)}
                                      placeholder="Descreva o motivo da recusa..."
                                      className="mt-2 border-slate-200 focus:border-red-400 focus:ring-red-400/20 rounded-xl"
                                    />
                                  </div>
                                </div>

                                <div className="flex justify-end gap-3">
                                  <DialogClose asChild>
                                    <Button
                                      variant="outline"
                                      className="rounded-xl"
                                      onClick={() => {
                                        setMotivoRecusa("")
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  </DialogClose>

                                  <Button
                                    onClick={() => selectedProfissional && recusarProfissional(selectedProfissional.id)}
                                    disabled={actionLoading === selectedProfissional?.id}
                                    className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-xl"
                                  >
                                    {actionLoading === selectedProfissional?.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                      <XCircle className="h-4 w-4 mr-2" />
                                    )}
                                    Confirmar Recusa
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reembolsos */}
        <Card
          id="reembolsos"
          className="mt-8 bg-white/80 backdrop-blur-xl border-0 rounded-2xl shadow-lg animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-500"
        >
          <CardHeader className="pb-6">
            <CardTitle className="text-slate-800 flex flex-wrap items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-provence-50 to-provence-100 rounded-xl">
                <Undo2 className="h-6 w-6 text-provence-900" />
              </div>
              Reembolsos ({reembolsos.length})
              {reembolsosEmAnalise > 0 && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                  {reembolsosEmAnalise} em análise
                </Badge>
              )}
              {ambientePagamento === "teste" && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">Mercado Pago em teste</Badge>
              )}
            </CardTitle>
            <CardDescription className="text-slate-500">
              Pedidos de estorno dos pacientes. Cancelamentos com antecedência são estornados na hora; os demais ficam aqui
              aguardando a decisão da administração.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {renderMensagem(mensagemReembolso)}

            {erroReembolsos && (
              <Alert className="mb-6 border-red-200 bg-red-50/80 backdrop-blur-sm rounded-2xl">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-700 font-medium">{erroReembolsos}</AlertDescription>
              </Alert>
            )}

            {loadingReembolsos ? (
              <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-provence-900" />
                Carregando reembolsos...
              </div>
            ) : reembolsos.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-provence-50 to-provence-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Undo2 className="h-8 w-8 text-provence-900" />
                </div>
                <h3 className="text-slate-800 text-xl font-semibold mb-2">Nenhum pedido de reembolso</h3>
                <p className="text-slate-500">Quando um paciente pedir estorno, o pedido aparece aqui.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead className="text-slate-600 font-semibold">Paciente</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Profissional</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Consulta</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Valor</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Motivo</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Status</TableHead>
                      <TableHead className="text-slate-600 font-semibold">Data</TableHead>
                      <TableHead className="text-center text-slate-600 font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reembolsos.map((reembolso) => {
                      const statusInfo = STATUS_REEMBOLSO[reembolso.status] || {
                        label: reembolso.status,
                        className: "bg-slate-100 text-slate-700 border-slate-200",
                      }
                      const emAnalise = reembolso.status === "solicitado"
                      return (
                        <TableRow
                          key={reembolso.id}
                          data-testid={`reembolso-${reembolso.id}`}
                          className="border-slate-100 hover:bg-slate-50/50 transition-colors align-top"
                        >
                          <TableCell>
                            <p className="font-semibold text-slate-800">{reembolso.paciente_nome}</p>
                            <p className="text-sm text-slate-500">{reembolso.paciente_email}</p>
                          </TableCell>
                          <TableCell className="font-medium text-slate-700">{reembolso.profissional_nome}</TableCell>
                          <TableCell>
                            <p className="text-sm font-medium text-slate-700 whitespace-nowrap">
                              {formatarDataHora(reembolso.data_hora)}
                            </p>
                            <p className="text-xs text-slate-500">Consulta #{reembolso.consulta_id}</p>
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-slate-800 whitespace-nowrap">
                              {formatarValor(reembolso.valor_reembolso)}
                            </p>
                            <p className="text-xs text-slate-500">{formatarMetodo(reembolso.metodo_pagamento)}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-slate-700 max-w-[14rem] truncate" title={reembolso.motivo || ""}>{reembolso.motivo || "-"}</p>
                            {reembolso.justificativa && !emAnalise && (
                              <p className="text-xs text-slate-500 max-w-xs mt-1">
                                Resposta: {reembolso.justificativa}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusInfo.className} whitespace-nowrap`}>{statusInfo.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-slate-500 whitespace-nowrap">
                              {formatarDataHora(reembolso.data_solicitacao)}
                            </p>
                            {reembolso.data_resposta && !emAnalise && (
                              <p className="text-xs text-slate-400 whitespace-nowrap">
                                Respondido em {formatarDataHora(reembolso.data_resposta)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            {emAnalise ? (
                              <div className="flex items-center gap-2 justify-center">
                                <Button
                                  size="sm"
                                  onClick={() => abrirDialogoReembolso(reembolso, "aprovar")}
                                  className="bg-provence-900 hover:bg-provence-950 text-white rounded-xl"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Aprovar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => abrirDialogoReembolso(reembolso, "recusar")}
                                  className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Recusar
                                </Button>
                              </div>
                            ) : (
                              <p className="text-center text-sm text-slate-400">-</p>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diálogo de aprovar/recusar reembolso */}
        <Dialog
          open={reembolsoDialog !== null}
          onOpenChange={(open) => {
            if (!open) fecharDialogoReembolso()
          }}
        >
          <DialogContent className="bg-white/95 backdrop-blur-xl border-0 rounded-2xl">
            {reembolsoDialog && (
              <>
                <DialogHeader>
                  <DialogTitle
                    className={
                      reembolsoDialog.acao === "aprovar" ? "text-provence-900 text-xl" : "text-red-700 text-xl"
                    }
                  >
                    {reembolsoDialog.acao === "aprovar" ? "Aprovar reembolso" : "Recusar reembolso"}
                  </DialogTitle>
                  <DialogDescription className="text-slate-600">
                    {reembolsoDialog.acao === "aprovar"
                      ? `Isso estorna ${formatarValor(reembolsoDialog.reembolso.valor_reembolso)} no Mercado Pago para ${reembolsoDialog.reembolso.paciente_nome}.`
                      : `O pedido de ${reembolsoDialog.reembolso.paciente_nome} será recusado e o valor não volta para o paciente.`}
                  </DialogDescription>
                </DialogHeader>

                <div className="rounded-xl border border-provence-200 bg-provence-50/60 p-4 text-sm text-slate-700 space-y-1">
                  <p>
                    <span className="font-semibold">Consulta:</span>{" "}
                    {formatarDataHora(reembolsoDialog.reembolso.data_hora)} com {reembolsoDialog.reembolso.profissional_nome}
                  </p>
                  <p>
                    <span className="font-semibold">Valor:</span> {formatarValor(reembolsoDialog.reembolso.valor_reembolso)}
                    {reembolsoDialog.reembolso.metodo_pagamento
                      ? ` (${formatarMetodo(reembolsoDialog.reembolso.metodo_pagamento)})`
                      : ""}
                  </p>
                  <p>
                    <span className="font-semibold">Motivo do paciente:</span> {reembolsoDialog.reembolso.motivo || "-"}
                  </p>
                </div>

                {!reembolsoDialog.reembolso.pode_estornar_automatico && (
                  <Alert variant="warning" className="rounded-xl">
                    <AlertTriangle className="h-5 w-5" />
                    <AlertDescription>
                      Sem pagamento no Mercado Pago: o estorno precisa ser feito manualmente.
                      {reembolsoDialog.acao === "aprovar" && " Por aqui não dá para aprovar este pedido."}
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <Label htmlFor="justificativa-reembolso" className="text-slate-700 font-semibold">
                    Justificativa {reembolsoDialog.acao === "recusar" ? "(obrigatória)" : "(opcional)"}
                  </Label>
                  <Textarea
                    id="justificativa-reembolso"
                    value={justificativaReembolso}
                    onChange={(e) => setJustificativaReembolso(e.target.value)}
                    placeholder={
                      reembolsoDialog.acao === "recusar"
                        ? "Explique ao paciente por que o pedido foi recusado..."
                        : "Observação interna sobre o estorno (opcional)..."
                    }
                    className={`mt-2 border-slate-200 rounded-xl ${
                      reembolsoDialog.acao === "recusar"
                        ? "focus:border-red-400 focus:ring-red-400/20"
                        : "focus:border-provence-300 focus:ring-provence-300/20"
                    }`}
                  />
                  {reembolsoDialog.acao === "recusar" && (
                    <p className={`text-xs mt-1 ${justificativaValida ? "text-slate-500" : "text-red-600"}`}>
                      Mínimo de 5 caracteres. O paciente vai ver esse texto.
                    </p>
                  )}
                </div>

                {erroDialogoReembolso && (
                  <Alert className="border-red-200 bg-red-50/80 rounded-xl">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <AlertDescription className="text-red-700 font-medium">{erroDialogoReembolso}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={fecharDialogoReembolso}
                    disabled={reembolsoLoading}
                  >
                    Cancelar
                  </Button>

                  {reembolsoDialog.acao === "aprovar" ? (
                    <Button
                      onClick={responderReembolso}
                      disabled={reembolsoLoading || !reembolsoDialog.reembolso.pode_estornar_automatico}
                      className="bg-provence-900 hover:bg-provence-950 text-white rounded-xl"
                    >
                      {reembolsoLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Confirmar estorno
                    </Button>
                  ) : (
                    <Button
                      onClick={responderReembolso}
                      disabled={reembolsoLoading || !justificativaValida}
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 rounded-xl"
                    >
                      {reembolsoLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Confirmar recusa
                    </Button>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Repasses aos profissionais */}
        <Card
          id="repasses"
          className="mt-8 bg-white/80 backdrop-blur-xl border-0 rounded-2xl shadow-lg animate-in fade-in-0 slide-in-from-bottom-4 duration-1000 delay-700"
        >
          <CardHeader className="pb-6">
            <CardTitle className="text-slate-800 flex flex-wrap items-center gap-3 text-xl">
              <div className="p-2 bg-gradient-to-br from-provence-50 to-provence-100 rounded-xl">
                <Banknote className="h-6 w-6 text-provence-900" />
              </div>
              Repasses aos profissionais
              {repassesPendentes.length > 0 && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                  {formatarValor(totalRepassesPendentes)} a repassar
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-slate-500">
              O paciente paga, a sessão é confirmada pelos dois e o valor do profissional fica liberado. A administração
              faz o Pix e marca aqui como repassado.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            <div>
              {renderMensagem(mensagemRepasse)}

              {erroRepasses && (
                <Alert className="mb-6 border-red-200 bg-red-50/80 backdrop-blur-sm rounded-2xl">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <AlertDescription className="text-red-700 font-medium">{erroRepasses}</AlertDescription>
                </Alert>
              )}

              {loadingRepasses ? (
                <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin text-provence-900" />
                  Carregando repasses...
                </div>
              ) : repassesPendentes.length === 0 ? (
                <div className="text-center py-12" data-testid="repasses-vazio">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="text-slate-800 text-xl font-semibold mb-2">Nenhum repasse pendente</h3>
                  <p className="text-slate-500">
                    Quando uma sessão for confirmada pelos dois, o valor do profissional aparece aqui para o Pix.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {repassesPendentes.map((profissional) => {
                    const dados = profissional.dados_bancarios || ({} as DadosBancarios)
                    const temDadosBancarios = Boolean(
                      dados.banco || dados.agencia || dados.conta || dados.chave_pix
                    )
                    return (
                      <div
                        key={profissional.id_profissional}
                        data-testid={`repasse-prof-${profissional.id_profissional}`}
                        className="rounded-2xl border border-provence-200 bg-white p-5 space-y-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-gradient-to-br from-provence-900 to-provence-950 text-white font-semibold">
                                {(profissional.profissional_nome || "?").charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-slate-800">{profissional.profissional_nome}</p>
                              <p className="text-sm text-slate-500">{profissional.profissional_email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Total a repassar</p>
                            <p className="text-2xl font-bold text-provence-900">
                              {formatarValor(profissional.total_a_repassar)}
                            </p>
                            <p className="text-xs text-slate-500">
                              {profissional.itens.length} {profissional.itens.length === 1 ? "consulta" : "consultas"}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl bg-provence-50/60 border border-provence-200 p-4">
                          <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-provence-900" />
                            Dados bancários
                          </p>
                          {temDadosBancarios ? (
                            <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                              <div>
                                <dt className="text-slate-500">Banco</dt>
                                <dd className="text-slate-800 font-medium">{dados.banco || "Não informado"}</dd>
                              </div>
                              <div>
                                <dt className="text-slate-500">Agência</dt>
                                <dd className="text-slate-800 font-medium">{dados.agencia || "Não informada"}</dd>
                              </div>
                              <div>
                                <dt className="text-slate-500">Conta</dt>
                                <dd className="text-slate-800 font-medium">
                                  {dados.conta || "Não informada"}
                                  {dados.tipo_conta ? ` (${dados.tipo_conta})` : ""}
                                </dd>
                              </div>
                              <div className="col-span-2 md:col-span-2">
                                <dt className="text-slate-500">Chave Pix</dt>
                                <dd className="text-slate-800 font-medium break-all">
                                  {dados.chave_pix || "Não informada"}
                                </dd>
                              </div>
                              <div>
                                <dt className="text-slate-500">Tipo da chave</dt>
                                <dd className="text-slate-800 font-medium">{dados.tipo_pix || "Não informado"}</dd>
                              </div>
                            </dl>
                          ) : (
                            <p className="text-sm text-amber-700">
                              O profissional ainda não informou os dados bancários. Combine o Pix diretamente com ele.
                            </p>
                          )}
                        </div>

                        <div className="overflow-x-auto rounded-xl">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-slate-200">
                                <TableHead className="text-slate-600 font-semibold">Paciente</TableHead>
                                <TableHead className="text-slate-600 font-semibold">Consulta</TableHead>
                                <TableHead className="text-slate-600 font-semibold">Liberado em</TableHead>
                                <TableHead className="text-slate-600 font-semibold">Valor</TableHead>
                                <TableHead className="text-center text-slate-600 font-semibold">Ação</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {profissional.itens.map((item) => (
                                <TableRow
                                  key={item.pagamento_id}
                                  data-testid={`repasse-item-${item.pagamento_id}`}
                                  className="border-slate-100 hover:bg-slate-50/50 transition-colors"
                                >
                                  <TableCell className="font-medium text-slate-800">{item.paciente_nome}</TableCell>
                                  <TableCell>
                                    <p className="text-sm text-slate-700 whitespace-nowrap">
                                      {formatarDataHora(item.data_hora)}
                                    </p>
                                    <p className="text-xs text-slate-500">Consulta #{item.consulta_id}</p>
                                  </TableCell>
                                  <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                                    {formatarDataHora(item.data_liberacao)}
                                  </TableCell>
                                  <TableCell className="font-semibold text-slate-800 whitespace-nowrap">
                                    {formatarValor(item.valor_profissional)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex justify-center">
                                      <Button
                                        size="sm"
                                        onClick={() => abrirDialogoRepasse(profissional, item)}
                                        className="bg-provence-900 hover:bg-provence-950 text-white rounded-xl"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Marcar como repassado
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-slate-800 font-semibold text-lg mb-3 flex items-center gap-2">
                <History className="h-5 w-5 text-provence-900" />
                Últimos repasses
              </h3>
              {loadingRepasses ? null : repassesHistorico.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum repasse registrado ainda.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200">
                        <TableHead className="text-slate-600 font-semibold">Profissional</TableHead>
                        <TableHead className="text-slate-600 font-semibold">Consulta</TableHead>
                        <TableHead className="text-slate-600 font-semibold">Valor</TableHead>
                        <TableHead className="text-slate-600 font-semibold">Repassado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repassesHistorico.map((h) => (
                        <TableRow
                          key={h.pagamento_id}
                          data-testid={`historico-${h.pagamento_id}`}
                          className="border-slate-100 hover:bg-slate-50/50 transition-colors"
                        >
                          <TableCell className="font-medium text-slate-800">{h.profissional_nome}</TableCell>
                          <TableCell className="text-sm text-slate-500">Consulta #{h.consulta_id}</TableCell>
                          <TableCell className="font-semibold text-slate-800 whitespace-nowrap">
                            {formatarValor(h.valor_profissional)}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                            {formatarDataHora(h.data_repasse)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Diálogo de confirmação do repasse */}
        <Dialog
          open={repasseDialog !== null}
          onOpenChange={(open) => {
            if (!open) fecharDialogoRepasse()
          }}
        >
          <DialogContent className="bg-white/95 backdrop-blur-xl border-0 rounded-2xl">
            {repasseDialog && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-provence-900 text-xl">Marcar como repassado</DialogTitle>
                  <DialogDescription className="text-slate-600">
                    Confirme que o Pix de {formatarValor(repasseDialog.item.valor_profissional)} para{" "}
                    {repasseDialog.profissional.profissional_nome} já foi feito. A consulta sai da lista de pendentes.
                  </DialogDescription>
                </DialogHeader>

                <div className="rounded-xl border border-provence-200 bg-provence-50/60 p-4 text-sm text-slate-700 space-y-1">
                  <p>
                    <span className="font-semibold">Consulta:</span> {formatarDataHora(repasseDialog.item.data_hora)} com{" "}
                    {repasseDialog.item.paciente_nome}
                  </p>
                  <p>
                    <span className="font-semibold">Valor do profissional:</span>{" "}
                    {formatarValor(repasseDialog.item.valor_profissional)}
                  </p>
                  {repasseDialog.profissional.dados_bancarios?.chave_pix && (
                    <p>
                      <span className="font-semibold">Chave Pix:</span>{" "}
                      <span className="break-all">{repasseDialog.profissional.dados_bancarios.chave_pix}</span>
                    </p>
                  )}
                </div>

                {erroDialogoRepasse && (
                  <Alert className="border-red-200 bg-red-50/80 rounded-xl">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <AlertDescription className="text-red-700 font-medium">{erroDialogoRepasse}</AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-end gap-3">
                  <Button variant="outline" className="rounded-xl" onClick={fecharDialogoRepasse} disabled={repasseLoading}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={marcarRepassado}
                    disabled={repasseLoading}
                    className="bg-provence-900 hover:bg-provence-950 text-white rounded-xl"
                  >
                    {repasseLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Confirmar repasse
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
