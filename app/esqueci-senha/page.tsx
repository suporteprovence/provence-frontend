"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Mail,
  MailCheck,
  CheckCircle,
  Loader2,
  Key,
  Shield,
  Lock,
  XCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react"
import { API_BASE } from "@/lib/api-config"

// Fluxo de recuperação de senha por link enviado ao e-mail:
//   1. sem ?token= na URL: a pessoa informa o e-mail e recebe o link (verificar_email.php)
//   2. com ?token= na URL: validamos o link (validar_token.php) e, se valer,
//      a pessoa define a nova senha (redefinir_senha.php)

type Modo =
  | "carregando" // antes de ler a URL
  | "solicitar" // formulário de e-mail
  | "enviado" // "verifique seu e-mail"
  | "validando" // conferindo o token do link
  | "token-invalido" // link inválido, expirado ou falha ao verificar
  | "redefinir" // formulário de nova senha

const SENHA_MIN = 8
const REENVIO_ESPERA_SEG = 30

const ERRO_REDE = "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."
const ERRO_LINK_INVALIDO = "Este link é inválido ou expirou. Solicite um novo."
const ERRO_VALIDAR_LINK = "Não foi possível verificar o link agora. Tente novamente em instantes."

const inputClass =
  "h-12 border-provence-300 focus:border-provence-800 focus:ring-provence-800/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700 placeholder:text-slate-400"

const botaoPrimarioClass =
  "w-full h-12 bg-gradient-to-r from-provence-900 via-provence-900 to-provence-950 hover:from-provence-950 hover:via-provence-950 hover:to-provence-950 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"

const botaoSecundarioClass =
  "w-full h-12 border-provence-200 text-provence-900 hover:bg-provence-50 bg-white/50 backdrop-blur-sm rounded-xl transition-all duration-300"

async function lerMensagem(response: Response): Promise<string | undefined> {
  try {
    const data = await response.json()
    return typeof data?.message === "string" ? data.message : undefined
  } catch {
    return undefined
  }
}

export default function EsqueciSenhaPage() {
  const router = useRouter()

  const [modo, setModo] = useState<Modo>("carregando")
  const [token, setToken] = useState("")

  const [email, setEmail] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Estado do link (modo 2)
  const [erroToken, setErroToken] = useState("")
  const [podeRevalidar, setPodeRevalidar] = useState(false)

  // Espera entre reenvios do e-mail
  const [segundosReenvio, setSegundosReenvio] = useState(0)

  const timerRedirect = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerReenvio = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRedirect.current) clearTimeout(timerRedirect.current)
      if (timerReenvio.current) clearInterval(timerReenvio.current)
    }
  }, [])

  // Lê o token da URL (sem useSearchParams: o site é exportado estaticamente)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = (params.get("token") || "").trim()
    if (t) {
      setToken(t)
      validarToken(t)
    } else {
      setModo("solicitar")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const validarToken = async (t: string) => {
    setModo("validando")
    setErroToken("")
    setPodeRevalidar(false)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`${API_BASE}/validar_token.php?token=${encodeURIComponent(t)}`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        setErroToken(ERRO_VALIDAR_LINK)
        setPodeRevalidar(true)
        setModo("token-invalido")
        return
      }

      const data = await response.json()
      if (data?.valido === true) {
        setModo("redefinir")
      } else {
        setErroToken(ERRO_LINK_INVALIDO)
        setModo("token-invalido")
      }
    } catch (err) {
      console.error("Erro ao validar link de recuperação:", err)
      setErroToken(ERRO_REDE)
      setPodeRevalidar(true)
      setModo("token-invalido")
    }
  }

  const iniciarEsperaReenvio = () => {
    if (timerReenvio.current) clearInterval(timerReenvio.current)
    setSegundosReenvio(REENVIO_ESPERA_SEG)
    timerReenvio.current = setInterval(() => {
      setSegundosReenvio((s) => {
        if (s <= 1) {
          if (timerReenvio.current) clearInterval(timerReenvio.current)
          timerReenvio.current = null
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  const solicitarLink = async () => {
    const emailLimpo = email.trim()
    if (!emailLimpo) {
      setError("Por favor, digite seu e-mail")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`${API_BASE}/verificar_email.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailLimpo }),
        credentials: "include",
      })

      if (!response.ok) {
        const msg = await lerMensagem(response)
        setError(msg || "Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.")
        return
      }

      const data = await response.json()
      if (data?.success) {
        setSuccess(
          data.message ||
            "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha em alguns minutos."
        )
        setModo("enviado")
        iniciarEsperaReenvio()
      } else {
        setError(data?.message || "Não foi possível processar o pedido. Tente novamente.")
      }
    } catch (err) {
      console.error("Erro ao solicitar link de recuperação:", err)
      setError(ERRO_REDE)
    } finally {
      setLoading(false)
    }
  }

  const handleSolicitar = async (e: React.FormEvent) => {
    e.preventDefault()
    await solicitarLink()
  }

  // Volta ao modo 1 e tira o token da URL
  const solicitarNovoLink = () => {
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname)
    }
    setToken("")
    setErroToken("")
    setPodeRevalidar(false)
    setError("")
    setSuccess("")
    setNovaSenha("")
    setConfirmarSenha("")
    setModo("solicitar")
  }

  const handleRedefinir = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!novaSenha || !confirmarSenha) {
      setError("Por favor, preencha todos os campos")
      return
    }
    if (novaSenha.length < SENHA_MIN) {
      setError(`A senha deve ter pelo menos ${SENHA_MIN} caracteres`)
      return
    }
    if (novaSenha !== confirmarSenha) {
      setError("As senhas não coincidem")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`${API_BASE}/redefinir_senha.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nova_senha: novaSenha }),
        credentials: "include",
      })

      if (!response.ok) {
        const msg = await lerMensagem(response)
        setError(msg || "Não foi possível redefinir a senha agora. Tente novamente em alguns minutos.")
        return
      }

      const data = await response.json()
      if (data?.success || data?.sucesso) {
        setSuccess("Senha redefinida com sucesso! Redirecionando para o login...")
        timerRedirect.current = setTimeout(() => {
          router.push("/login")
        }, 2000)
        return
      }

      setError(data?.message || "Não foi possível redefinir a senha. Tente novamente.")
    } catch (err) {
      console.error("Erro ao redefinir senha:", err)
      setError(ERRO_REDE)
    } finally {
      setLoading(false)
    }
  }

  const senhaOk = novaSenha.length >= SENHA_MIN
  const senhasIguais = novaSenha.length > 0 && novaSenha === confirmarSenha
  const redefinida = modo === "redefinir" && success !== ""

  const cabecalho: Record<Modo, { titulo: string; descricao: string; icone: React.ReactNode }> = {
    carregando: {
      titulo: "Recuperar Senha",
      descricao: "Aguarde um instante...",
      icone: <Mail className="h-8 w-8 text-white" />,
    },
    solicitar: {
      titulo: "Recuperar Senha",
      descricao: "Informe seu e-mail e enviaremos um link para você criar uma nova senha",
      icone: <Mail className="h-8 w-8 text-white" />,
    },
    enviado: {
      titulo: "Verifique seu e-mail",
      descricao: "Siga o link que enviamos para criar uma nova senha",
      icone: <MailCheck className="h-8 w-8 text-white" />,
    },
    validando: {
      titulo: "Nova Senha",
      descricao: "Verificando seu link...",
      icone: <Shield className="h-8 w-8 text-white" />,
    },
    "token-invalido": {
      titulo: "Link inválido",
      descricao: "Este link não pode mais ser usado",
      icone: <XCircle className="h-8 w-8 text-white" />,
    },
    redefinir: {
      titulo: "Nova Senha",
      descricao: "Crie uma nova senha segura para sua conta",
      icone: <Shield className="h-8 w-8 text-white" />,
    },
  }

  const { titulo, descricao, icone } = cabecalho[modo]

  const AlertaErro = error ? (
    <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-2xl">
      <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
    </Alert>
  ) : null

  const AlertaSucesso = success ? (
    <Alert className="border-emerald-200 bg-emerald-50/80 backdrop-blur-sm rounded-2xl">
      <CheckCircle className="h-5 w-5 text-emerald-600" />
      <AlertDescription className="text-emerald-700 font-medium">{success}</AlertDescription>
    </Alert>
  ) : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-provence-50 to-provence-100 flex flex-col relative">
      {/* Simplified background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-provence-50 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-provence-100 rounded-full blur-3xl"></div>
      </div>

      <div className="flex-grow container mx-auto flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          <Card className="bg-white/80 backdrop-blur-xl shadow-2xl border-0 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/80 to-provence-50/80 backdrop-blur-xl"></div>

            <CardHeader className="text-center pb-8 pt-12 relative z-10">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-provence-700 via-provence-800 to-provence-900 rounded-2xl flex items-center justify-center shadow-2xl">
                    <div className="w-16 h-16 bg-gradient-to-br from-provence-900 to-provence-950 rounded-xl flex items-center justify-center">
                      {icone}
                    </div>
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-r from-provence-700 to-provence-900 rounded-2xl blur opacity-20 animate-pulse"></div>
                </div>
              </div>

              <CardTitle className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-provence-800 via-provence-900 to-provence-950 bg-clip-text text-transparent mb-3 tracking-tight">
                {titulo}
              </CardTitle>
              <CardDescription className="text-slate-600 text-lg font-medium">{descricao}</CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8 relative z-10">
              {/* Carregando a URL ou validando o link */}
              {(modo === "carregando" || modo === "validando") && (
                <div className="flex flex-col items-center justify-center gap-4 py-8 text-slate-600">
                  <Loader2 className="h-10 w-10 animate-spin text-provence-900" />
                  <p className="text-sm font-medium">
                    {modo === "validando" ? "Verificando seu link..." : "Carregando..."}
                  </p>
                </div>
              )}

              {/* Modo 1: pedir o link por e-mail */}
              {modo === "solicitar" && (
                <form onSubmit={handleSolicitar} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-slate-700 font-semibold flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-provence-900" />
                      E-mail cadastrado
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className={inputClass}
                      required
                    />
                    <p className="text-xs text-slate-500">
                      Você receberá um link por e-mail para criar uma nova senha. O link vale por 1 hora.
                    </p>
                  </div>

                  {AlertaErro}

                  <Button type="submit" className={botaoPrimarioClass} disabled={loading}>
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Enviando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5" />
                        <span>Enviar link</span>
                      </div>
                    )}
                  </Button>
                </form>
              )}

              {/* Modo 1, depois do envio */}
              {modo === "enviado" && (
                <div className="space-y-6">
                  {AlertaSucesso}

                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-sm text-slate-600 space-y-2">
                    <p>
                      Se houver uma conta para <span className="font-semibold text-slate-800">{email.trim()}</span>, o
                      link chegará em alguns minutos e vale por 1 hora.
                    </p>
                    <p>Não recebeu? Confira a caixa de spam ou envie novamente.</p>
                  </div>

                  {AlertaErro}

                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={solicitarLink}
                      disabled={loading || segundosReenvio > 0}
                      className={botaoSecundarioClass}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enviando...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4" />
                          <span>
                            {segundosReenvio > 0 ? `Enviar novamente (${segundosReenvio}s)` : "Enviar novamente"}
                          </span>
                        </div>
                      )}
                    </Button>

                    <Button asChild className={botaoPrimarioClass}>
                      <Link href="/login">
                        <div className="flex items-center gap-2">
                          <ArrowLeft className="w-4 h-4" />
                          <span>Voltar para o login</span>
                        </div>
                      </Link>
                    </Button>
                  </div>
                </div>
              )}

              {/* Modo 2: link inválido, expirado ou falha ao verificar */}
              {modo === "token-invalido" && (
                <div className="space-y-6">
                  <Alert variant="destructive" className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-2xl">
                    <XCircle className="h-5 w-5" />
                    <AlertDescription className="text-red-700 font-medium">{erroToken}</AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    {podeRevalidar && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => validarToken(token)}
                        className={botaoSecundarioClass}
                      >
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4" />
                          <span>Tentar novamente</span>
                        </div>
                      </Button>
                    )}

                    <Button type="button" onClick={solicitarNovoLink} className={botaoPrimarioClass}>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>Solicitar novo link</span>
                      </div>
                    </Button>
                  </div>
                </div>
              )}

              {/* Modo 2: definir a nova senha */}
              {modo === "redefinir" && (
                <form onSubmit={handleRedefinir} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="nova-senha" className="text-slate-700 font-semibold flex items-center gap-2 text-sm">
                      <Lock className="h-4 w-4 text-provence-900" />
                      Nova senha
                    </Label>
                    <Input
                      id="nova-senha"
                      type="password"
                      autoComplete="new-password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder={`Mínimo ${SENHA_MIN} caracteres`}
                      className={inputClass}
                      required
                      minLength={SENHA_MIN}
                      disabled={loading || redefinida}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="confirmar-senha"
                      className="text-slate-700 font-semibold flex items-center gap-2 text-sm"
                    >
                      <Key className="h-4 w-4 text-provence-900" />
                      Confirmar nova senha
                    </Label>
                    <Input
                      id="confirmar-senha"
                      type="password"
                      autoComplete="new-password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Digite a senha novamente"
                      className={inputClass}
                      required
                      minLength={SENHA_MIN}
                      disabled={loading || redefinida}
                    />
                  </div>

                  {/* Requisitos da senha */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Requisitos da senha:</h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li className={`flex items-center gap-2 ${senhaOk ? "text-emerald-600" : ""}`}>
                        <div className={`w-2 h-2 rounded-full ${senhaOk ? "bg-emerald-500" : "bg-slate-300"}`}></div>
                        Pelo menos {SENHA_MIN} caracteres
                      </li>
                      <li className={`flex items-center gap-2 ${senhasIguais ? "text-emerald-600" : ""}`}>
                        <div className={`w-2 h-2 rounded-full ${senhasIguais ? "bg-emerald-500" : "bg-slate-300"}`}></div>
                        Senhas coincidem
                      </li>
                    </ul>
                  </div>

                  {AlertaErro}
                  {AlertaSucesso}

                  <Button type="submit" className={botaoPrimarioClass} disabled={loading || redefinida}>
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>Redefinir senha</span>
                      </div>
                    )}
                  </Button>

                  {!redefinida && (
                    <p className="text-center text-sm text-slate-600">
                      O link não funciona?{" "}
                      <button
                        type="button"
                        onClick={solicitarNovoLink}
                        className="text-provence-900 hover:text-provence-950 transition-colors font-semibold hover:underline"
                      >
                        Solicitar um novo
                      </button>
                    </p>
                  )}
                </form>
              )}
            </CardContent>

            {modo !== "enviado" && (
              <CardFooter className="text-center pt-4 pb-8 relative z-10">
                <p className="text-slate-600 w-full">
                  Lembrou da senha?{" "}
                  <Link
                    href="/login"
                    className="text-provence-900 hover:text-provence-950 transition-colors font-semibold hover:underline"
                  >
                    Fazer login
                  </Link>
                </p>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
