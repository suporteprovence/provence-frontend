"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle, Mail, ArrowLeft, AlertCircle, Calendar, User } from "lucide-react"

interface CadastroPendente {
  nome: string
  email: string
  tipo: string
  data: string
}

export default function CadastroPendentePage() {
  const [cadastroData, setCadastroData] = useState<CadastroPendente | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState("")
  const router = useRouter()

  // ✅ BASE DA API NA HOSTINGER (public_html = raiz de provence.host)
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "https://provence.host"

  // ✅ ENDPOINT (conforme seus prints: api/login.php, api/register.php, etc)
  // A ideia aqui: consultar no backend se o cadastro ainda está pendente / já foi aprovado.
  // Se no seu backend esse endpoint tiver outro nome, me fala qual é e eu ajusto.
  const ENDPOINTS = {
    // tenta checar o status do usuário (pendente/aprovado) a partir do email
    // OBS: se você NÃO tiver esse arquivo no servidor, esse fetch vai falhar e a tela segue só com localStorage (fallback).
    checarStatusCadastro: `${API_BASE}/usuarios/get_perfil.php`,
  } as const

  useEffect(() => {
    const cadastroPendente = localStorage.getItem("cadastro_pendente")
    if (cadastroPendente) {
      try {
        const data = JSON.parse(cadastroPendente)
        setCadastroData(data)
      } catch (err) {
        console.error("Erro ao parsear dados do cadastro:", err)
        router.push("/register")
        return
      }
    } else {
      router.push("/register")
      return
    }

    // depois de carregar o localStorage, tenta validar com backend
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  useEffect(() => {
    const run = async () => {
      if (!cadastroData?.email) {
        setLoading(false)
        return
      }

      setErro("")
      setLoading(true)

      // ✅ tenta checar no backend se já foi aprovado (fallback: se der erro, não bloqueia a página)
      try {
        const url = new URL(ENDPOINTS.checarStatusCadastro)
        url.searchParams.set("email", cadastroData.email)

        const res = await fetch(url.toString(), {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        })

        if (!res.ok) {
          // não quebra a tela — só para de carregar
          setLoading(false)
          return
        }

        const json = await res.json()

        // ✅ Tentativas comuns de estrutura
        const perfil = json?.data ?? json

        // Se seu backend devolver tipo_usuario e/ou status:
        // - quando aprovar profissional, você provavelmente muda de "pendente" pra "profissional"
        // - ou marca "aprovado: true"
        const aprovado =
          perfil?.aprovado === true ||
          perfil?.status === "aprovado" ||
          perfil?.status === "ativo" ||
          (perfil?.tipo_usuario && perfil?.tipo_usuario !== "pendente")

        if (aprovado) {
          // se já aprovou, manda pra login (ou direto pra /profissional se você já loga automático)
          localStorage.removeItem("cadastro_pendente")
          router.push("/login")
          return
        }
      } catch (e) {
        // erro silencioso (mantém tela)
        console.error(e)
      } finally {
        setLoading(false)
      }
    }

    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cadastroData?.email])

  const handleVoltarLogin = () => {
    localStorage.removeItem("cadastro_pendente")
    router.push("/login")
  }

  if (loading || !cadastroData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-provence-50 to-provence-100 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin text-provence-900 mx-auto mb-4" />
          <p className="text-slate-600">Carregando...</p>
          {erro && <p className="text-sm text-red-600 mt-2">{erro}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-provence-50 to-provence-100 flex flex-col relative">
      {/* Simplified background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-provence-50 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-provence-100 rounded-full blur-3xl"></div>
      </div>

      <div className="flex-grow container mx-auto flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-2xl">
          <Card className="bg-white/80 backdrop-blur-xl shadow-2xl border-0 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/80 to-provence-50/80 backdrop-blur-xl"></div>

            <CardHeader className="text-center pb-6 pt-8 relative z-10">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-2xl">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-400 rounded-xl flex items-center justify-center">
                      <Clock className="h-10 w-10 text-white animate-pulse" />
                    </div>
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur opacity-20 animate-pulse"></div>
                </div>
              </div>

              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent mb-3 tracking-tight">
                Cadastro em Análise
              </CardTitle>
              <CardDescription className="text-slate-600 text-lg font-medium">
                Seu cadastro foi recebido e está sendo analisado pela nossa equipe
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8 relative z-10 space-y-8">
              {/* Status Card */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-amber-800">Dados Recebidos com Sucesso</h3>
                    <p className="text-amber-700">Todas as informações foram registradas</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-amber-200">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="h-5 w-5 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700">Informações Pessoais</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Nome:</span>
                        <span className="font-semibold text-slate-800">{cadastroData.nome}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">E-mail:</span>
                        <span className="font-semibold text-slate-800">{cadastroData.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-amber-200">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar className="h-5 w-5 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700">Detalhes do Cadastro</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tipo:</span>
                        <span className="font-semibold text-slate-800 capitalize">{cadastroData.tipo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Data:</span>
                        <span className="font-semibold text-slate-800">
                          {new Date(cadastroData.data).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-provence-900 to-provence-950 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  Próximos Passos
                </h3>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex gap-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 hover:shadow-lg transition-all duration-300">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                        1
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-lg font-bold text-blue-800 mb-2">Análise Documental</h4>
                      <p className="text-blue-700 leading-relaxed">
                        Nossa equipe especializada verificará seus dados profissionais, registro no CRP e documentação
                        enviada para garantir a conformidade com nossos padrões de qualidade.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4 p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border border-emerald-200 hover:shadow-lg transition-all duration-300">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                        2
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-lg font-bold text-emerald-800 mb-2">Notificação por E-mail</h4>
                      <p className="text-emerald-700 leading-relaxed">
                        Você receberá um email detalhado quando sua conta for aprovada ou se precisarmos de informações
                        adicionais. Mantenha sua caixa de entrada sempre verificada.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4 p-6 bg-gradient-to-r from-provence-50 to-provence-100 rounded-2xl border border-provence-200 hover:shadow-lg transition-all duration-300">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-r from-provence-900 to-provence-950 text-white rounded-xl flex items-center justify-center font-bold text-lg shadow-lg">
                        3
                      </div>
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-lg font-bold text-provence-900 mb-2">Acesso Liberado</h4>
                      <p className="text-provence-900 leading-relaxed">
                        Após aprovação, você poderá fazer login, configurar seu perfil profissional e começar a atender
                        pacientes através da nossa plataforma.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Time Estimate */}
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-amber-800">Tempo Estimado</h4>
                    <p className="text-amber-700">Informações sobre o prazo de análise</p>
                  </div>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-amber-200">
                  <p className="text-amber-800 leading-relaxed">
                    O processo de análise leva entre <strong className="text-amber-900">24 a 72 horas úteis</strong>.
                    Cadastros com documentação completa e correta são processados mais rapidamente. Nossa equipe trabalha
                    diariamente para garantir agilidade no processo.
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-6 border border-slate-200">
                <h4 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-slate-500 to-gray-500 rounded-lg flex items-center justify-center">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  Precisa de Ajuda?
                </h4>
                <div className="flex items-center gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <Mail className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">E-mail</p>
                    <p className="font-semibold text-slate-800">suporte.provence0@gmail.com</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-4">
                  (Info técnica) API configurada: <span className="font-mono">{ENDPOINTS.checarStatusCadastro}</span>
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-6 pb-8 relative z-10">
              <Button
                onClick={handleVoltarLogin}
                className="w-full h-12 bg-gradient-to-r from-provence-900 to-provence-950 hover:from-provence-950 hover:to-provence-950 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Voltar para Login
              </Button>
              <p className="text-sm text-slate-600 text-center leading-relaxed">
                Você receberá um email de confirmação quando sua conta for aprovada.
                <br />
                Obrigado por escolher a Provence!
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}