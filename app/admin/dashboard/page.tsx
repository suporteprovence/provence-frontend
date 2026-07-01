"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
  BarChart3,
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


  // Os PHPs do painel administrativo ficam em public_html/admin/ na Hostinger
  const API_BASE = "https://provence.host/admin"


  const ENDPOINTS = {
    listarPendentes: `${API_BASE}/listar_profissionais_pendentes.php`,
    aprovar: `${API_BASE}/aprovar_profissional.php`,
    recusar: `${API_BASE}/recusar_profissional.php`,
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

    carregarProfissionaisPendentes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

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

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-purple-200 rounded-full"></div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando painel administrativo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto p-6 relative z-10">
        {/* Header */}
        <div className="mb-8 animate-in fade-in-0 slide-in-from-top-4 duration-1000">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-700 via-violet-700 to-indigo-700 bg-clip-text text-transparent mb-2">
                Painel Administrativo
              </h1>
              <p className="text-slate-600 text-lg">Bem-vindo, {user?.nome || "Administrador"}!</p>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={carregarProfissionaisPendentes}
                variant="outline"
                size="sm"
                className="border-purple-300 text-purple-700 hover:bg-purple-50 bg-white/80 backdrop-blur-sm rounded-xl"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>

              <div className="flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-purple-200">
                <Shield className="h-5 w-5 text-purple-600" />
                <Badge className="bg-gradient-to-r from-purple-600 to-violet-600 text-white border-0">
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
              <CardTitle className="text-sm font-semibold text-slate-700">Total de Profissionais</CardTitle>
              <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800 mb-1">-</div>
              <p className="text-sm text-slate-500">Em desenvolvimento</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-xl border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Consultas Hoje</CardTitle>
              <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-800 mb-1">-</div>
              <p className="text-sm text-slate-500">Em desenvolvimento</p>
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
              <div className="p-2 bg-gradient-to-br from-purple-100 to-violet-100 rounded-xl">
                <Users className="h-6 w-6 text-purple-600" />
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
                  className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white rounded-xl px-6 py-3"
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
                              <AvatarImage src={profissional.foto_perfil || "/placeholder.svg"} />
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-500 text-white font-semibold">
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
                          <Badge className="bg-gradient-to-r from-purple-100 to-violet-100 text-purple-700 border-purple-200">
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
                                  className="border-purple-200 text-purple-700 hover:bg-purple-50 rounded-xl"
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
                                        <AvatarImage src={selectedProfissional.foto_perfil || "/placeholder.svg"} />
                                        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-violet-500 text-white text-2xl font-bold">
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
                                  <Button
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={() => {
                                      setMotivoRecusa("")
                                    }}
                                  >
                                    Cancelar
                                  </Button>

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
      </div>
    </div>
  )
}