"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, CheckCircle, AlertCircle, Shield } from "lucide-react"

const API_BASE = "https://provence.host"

interface UserTemp {
  id: number
  nome: string
  email: string
  tipo_usuario: string
}

export default function TermosUsoPage() {
  const [user, setUser] = useState<UserTemp | null>(null)
  const [aceito, setAceito] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const userTemp = localStorage.getItem("user_temp")
    if (!userTemp) {
      router.push("/register")
      return
    }

    try {
      const userData = JSON.parse(userTemp)
      setUser(userData)
    } catch {
      router.push("/register")
    }
  }, [router])

  const handleAceitarTermos = async () => {
    if (!aceito) {
      setError("Voc\u00ea deve aceitar os termos de uso para continuar")
      return
    }

    if (!user) {
      setError("Dados do usu\u00e1rio n\u00e3o encontrados")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch(`${API_BASE}/aceitar_termos.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          usuario_id: user.id,
        }),
        credentials: "include",
      })

      if (response.status === 404) {
        throw new Error("API n\u00e3o encontrada.")
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const responseText = await response.text()
      let data

      try {
        data = JSON.parse(responseText)
      } catch {
        throw new Error("Resposta inv\u00e1lida do servidor")
      }

      if (data.success) {
        localStorage.removeItem("user_temp")
        router.push("/login")
      } else {
        setError(data.message || "Erro ao aceitar termos")
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(`Erro de conex\u00e3o: ${err.message}`)
      } else {
        setError("Erro de conex\u00e3o. Tente novamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-provence-50 to-provence-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-provence-900 mx-auto mb-4" />
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-provence-50 to-provence-100 flex flex-col relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-provence-50 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-provence-100 rounded-full blur-3xl"></div>
      </div>

      <div className="flex-grow container mx-auto flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-4xl">
          <Card className="bg-white/80 backdrop-blur-xl shadow-2xl border-0 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/80 to-provence-50/80 backdrop-blur-xl"></div>

            <CardHeader className="text-center pb-6 pt-8 relative z-10">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-gradient-to-br from-provence-700 via-provence-800 to-provence-900 rounded-2xl flex items-center justify-center shadow-2xl">
                  <div className="w-16 h-16 bg-gradient-to-br from-provence-900 to-provence-950 rounded-xl flex items-center justify-center">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>

              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-provence-800 via-provence-900 to-provence-950 bg-clip-text text-transparent mb-3 tracking-tight">
                Termos de Uso
              </CardTitle>
              <CardDescription className="text-slate-600 text-lg font-medium">
                {"Ol\u00e1, "}{user.nome}{"! Por favor, leia e aceite nossos termos para continuar"}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8 relative z-10">
              <ScrollArea className="h-96 w-full border border-slate-200 rounded-2xl p-6 mb-8 bg-white/50 backdrop-blur-sm">
                <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
                  <div>
                    <h3 className="text-lg font-bold text-provence-900 mb-3">1. Termos de Uso</h3>
                    <p className="mb-4">
                      {"Bem-vindo \u00e0 Provence! Estes termos de uso regem o uso de nossa plataforma de terapia online. Ao usar nossos servi\u00e7os, voc\u00ea concorda com estes termos."}
                    </p>
                    <h4 className="font-semibold text-provence-900 mb-2">1.1 Uso da Plataforma</h4>
                    <p className="mb-4">
                      {"Nossa plataforma conecta pacientes a profissionais de psicologia licenciados. Voc\u00ea deve usar a plataforma apenas para fins leg\u00edtimos e de acordo com estes termos."}
                    </p>
                    <h4 className="font-semibold text-provence-900 mb-2">{"1.2 Responsabilidades do Usu\u00e1rio"}</h4>
                    <ul className="list-disc list-inside space-y-1 mb-4 ml-4">
                      <li>{"Fornecer informa\u00e7\u00f5es precisas e atualizadas"}</li>
                      <li>Manter a confidencialidade de sua conta</li>
                      <li>{"N\u00e3o compartilhar informa\u00e7\u00f5es pessoais de outros usu\u00e1rios"}</li>
                      <li>{"Respeitar os profissionais e outros usu\u00e1rios"}</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-provence-900 mb-3">2. {"Pol\u00edtica de Privacidade"}</h3>
                    <p className="mb-4">
                      {"Sua privacidade \u00e9 importante para n\u00f3s. Esta pol\u00edtica explica como coletamos, usamos e protegemos suas informa\u00e7\u00f5es pessoais."}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-provence-900 mb-3">{"3. Confidencialidade M\u00e9dica"}</h3>
                    <p className="mb-4">
                      {"Todas as comunica\u00e7\u00f5es entre pacientes e profissionais s\u00e3o confidenciais e protegidas pelo sigilo profissional, conforme estabelecido pelo Conselho Federal de Psicologia."}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-provence-900 mb-3">4. Cancelamento e Reembolso</h3>
                    <p className="mb-4">
                      {"Consultas podem ser canceladas at\u00e9 24 horas antes do hor\u00e1rio agendado para reembolso total. Cancelamentos com menos de 24 horas podem estar sujeitos a taxas."}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-provence-900 mb-3">{"5. Limita\u00e7\u00e3o de Responsabilidade"}</h3>
                    <p className="mb-4">
                      {"A Provence atua como intermedi\u00e1ria entre pacientes e profissionais. N\u00e3o somos respons\u00e1veis pelo conte\u00fado das sess\u00f5es de terapia ou pelos resultados do tratamento."}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-provence-900 mb-3">{"6. Altera\u00e7\u00f5es nos Termos"}</h3>
                    <p className="mb-4">
                      {"Podemos atualizar estes termos periodicamente. Notificaremos sobre mudan\u00e7as significativas e sua continua\u00e7\u00e3o do uso da plataforma constitui aceita\u00e7\u00e3o dos novos termos."}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-provence-900 mb-3">7. Contato</h3>
                    <p className="mb-4">
                      {"Para d\u00favidas sobre estes termos, entre em contato conosco atrav\u00e9s do e-mail: suporte.provence0@gmail.com"}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-8 pt-4 border-t border-slate-200">
                    {"\u00daltima atualiza\u00e7\u00e3o: "}{new Date().toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </ScrollArea>

              <div className="flex items-center space-x-4 mb-6 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200">
                <Checkbox
                  id="aceitar-termos"
                  checked={aceito}
                  onCheckedChange={(checked) => {
                    setAceito(checked as boolean)
                    if (error) setError("")
                  }}
                  className="data-[state=checked]:bg-provence-900 data-[state=checked]:border-provence-900"
                />
                <label
                  htmlFor="aceitar-termos"
                  className="text-sm font-medium leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-700 cursor-pointer"
                >
                  {"Li e aceito os Termos de Uso e Pol\u00edtica de Privacidade"}
                </label>
              </div>

              {error && (
                <div className="mb-6">
                  <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-2xl">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
                  </Alert>
                </div>
              )}

              <Button
                onClick={handleAceitarTermos}
                className="w-full h-12 bg-gradient-to-r from-provence-900 via-provence-900 to-provence-950 hover:from-provence-950 hover:via-provence-950 hover:to-provence-950 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !aceito}
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processando...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5" />
                    <span>Aceitar e Ir para Login</span>
                  </div>
                )}
              </Button>
            </CardContent>

            <CardFooter className="text-center pt-4 pb-8 relative z-10">
              <p className="text-sm text-slate-600 w-full">
                {"Ao aceitar, voc\u00ea ser\u00e1 direcionado para a tela de login para acessar sua conta"}
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
