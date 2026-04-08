"use client"

import { useState, useEffect, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Mail,
  Lock,
  Loader2,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react"
import Link from "next/link"

const API_BASE = "https://provence.host/auth/login.php"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const [cadastroConcluido, setCadastroConcluido] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    if (typeof window !== "undefined") {
      const cadastroInfo = localStorage.getItem("cadastro_concluido")
      if (cadastroInfo) {
        setCadastroConcluido(true)
        setTimeout(() => {
          localStorage.removeItem("cadastro_concluido")
          setCadastroConcluido(false)
        }, 5000)
      }
    }
  }, [])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!email.trim() || !senha.trim()) {
      setError("Por favor, preencha todos os campos")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`${API_BASE}/auth/login.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          senha: senha,
        }),
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem("user_logged", JSON.stringify(data.data))
          localStorage.setItem("usuario", JSON.stringify(data.data))
          localStorage.setItem("userId", data.data.id.toString())
          localStorage.setItem("userType", data.data.tipo_usuario)
        }

        setSuccess(
          `Bem-vindo de volta, ${data.data.nome}! Redirecionando...`
        )

        setTimeout(() => {
          switch (data.data.tipo_usuario) {
            case "admin":
              router.push("/admin/dashboard")
              break
            case "paciente":
              router.push("/paciente")
              break
            case "profissional":
              router.push("/profissional")
              break
            default:
              setError("Tipo de usuário inválido")
          }
        }, 1500)
      } else {
        setError(data.message || "E-mail ou senha incorretos")
      }
    } catch (err) {
      console.error("Erro no login:", err)
      setError(
        "Erro de conexão. Verifique se o servidor está funcionando."
      )
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#fcfaff] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-8 h-8 bg-[#8b5cf6]/30 rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fcfaff] flex flex-col relative overflow-hidden">
      {/* Background decorative elements - Agora em tons de lilás suave */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#a78bfa]/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#a78bfa]/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="flex-grow container mx-auto flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md animate-in fade-in-0 slide-in-from-bottom-4 duration-1000">
          <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border-0 rounded-3xl overflow-hidden">
            <CardHeader className="text-center pb-8 pt-12 relative z-10">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {/* Gradiente lilás seguindo o ícone da foto */}
                  <div className="w-20 h-20 bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9] rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#a78bfa] to-[#8b5cf6] rounded-xl flex items-center justify-center">
                      <Lock className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="absolute -inset-2 bg-[#8b5cf6]/20 rounded-2xl blur animate-pulse" />
                </div>
              </div>

              <CardTitle className="text-4xl font-bold text-[#2c2c2c] mb-3 tracking-tight text-balance">
                Bem-vindo
              </CardTitle>
              <CardDescription className="text-[#6b6b6b] text-lg font-medium">
                Entre na sua conta para continuar
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8 relative z-10">
              {cadastroConcluido && (
                <div className="mb-6 animate-in fade-in-0 slide-in-from-top-2 duration-500">
                  <Alert className="border-emerald-200 bg-emerald-50/80 backdrop-blur-sm rounded-2xl">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <AlertDescription className="text-emerald-800 font-medium">
                      <strong>Cadastro concluído!</strong> Agora você pode
                      fazer login.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3 group">
                  <Label
                    htmlFor="email"
                    className="text-[#2c2c2c] font-semibold flex items-center gap-2 text-sm"
                  >
                    <Mail className="h-4 w-4 text-[#8b5cf6]" />
                    E-mail
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="h-12 border-[#e9e4f0] focus:border-[#8b5cf6] focus:ring-[#8b5cf6]/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-[#2c2c2c] placeholder:text-[#a0a0a0]"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-3 group">
                  <Label
                    htmlFor="senha"
                    className="text-[#2c2c2c] font-semibold flex items-center gap-2 text-sm"
                  >
                    <Lock className="h-4 w-4 text-[#8b5cf6]" />
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={showPassword ? "text" : "password"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Sua senha"
                      className="h-12 border-[#e9e4f0] focus:border-[#8b5cf6] focus:ring-[#8b5cf6]/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 pr-12 text-[#2c2c2c] placeholder:text-[#a0a0a0]"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#a0a0a0] hover:text-[#8b5cf6] transition-colors duration-200"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
                    <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-2xl">
                      <AlertDescription className="text-red-700 font-medium">
                        {error}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {success && (
                  <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
                    <Alert className="border-emerald-200 bg-emerald-50/80 backdrop-blur-sm rounded-2xl">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      <AlertDescription className="text-emerald-700 font-medium">
                        {success}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] hover:from-[#7c3aed] hover:to-[#5b21b6] text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Entrando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span>Entrar</span>
                      <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    </div>
                  )}
                </Button>
              </form>

              <div className="mt-8 text-center">
                <Link
                  href="/esqueci-senha"
                  className="text-[#8b5cf6] hover:text-[#6d28d9] transition-colors font-medium text-sm hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </CardContent>

            <CardFooter className="text-center pt-4 pb-8 relative z-10">
              <p className="text-[#6b6b6b] w-full">
                {"Não tem uma conta? "}
                <Link
                  href="/register"
                  className="text-[#8b5cf6] hover:text-[#6d28d9] transition-colors font-semibold hover:underline"
                >
                  Cadastre-se
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}