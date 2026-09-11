"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mail, ArrowLeft, CheckCircle, Loader2, Key, Shield, Lock } from "lucide-react"
import Link from "next/link"


// verificar_email.php e redefinir_senha.php ficam na raiz de public_html na Hostinger
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "https://provence.host"

export default function EsqueciSenhaPage() {
  const [step, setStep] = useState<"email" | "nova-senha">("email")
  const [email, setEmail] = useState("")
  const [cpf, setCpf] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()

  const handleEnviarEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Por favor, digite seu e-mail")
      return
    }
    if (cpf.replace(/\D/g, "").length < 11) {
      setError("Por favor, informe o CPF cadastrado (apenas números)")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      // Confirma identidade por e-mail + CPF antes de liberar a troca de senha
      const response = await fetch(`${API_BASE}/verificar_email.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim(), cpf: cpf.replace(/\D/g, "") }),
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.existe) {
          setSuccess("Identidade confirmada! Agora você pode definir uma nova senha.")
          setStep("nova-senha")
        } else {
          setError("E-mail e CPF não conferem com nenhuma conta.")
        }
      } else {
        setError("Erro de conexão. Tente novamente.")
      }
    } catch (err) {
      console.error("Erro ao verificar identidade:", err)
      setError("Erro de conexão. Verifique se o servidor está funcionando.")
    } finally {
      setLoading(false)
    }
  }

  const handleRedefinirSenha = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!novaSenha.trim() || !confirmarSenha.trim()) {
      setError("Por favor, preencha todos os campos")
      return
    }

    if (novaSenha.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres")
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
      // ✅ API: https://provence.host/redefinir_senha.php
      const response = await fetch(`${API_BASE}/redefinir_senha.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          cpf: cpf.replace(/\D/g, ""),
          nova_senha: novaSenha,
        }),
        credentials: "include",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.sucesso) {
          setSuccess("Senha redefinida com sucesso! Redirecionando para o login...")
          setTimeout(() => {
            router.push("/login")
          }, 2000)
        } else {
          setError("Erro ao redefinir senha. Tente novamente.")
        }
      } else {
        setError("Erro de conexão. Tente novamente.")
      }
    } catch (err) {
      console.error("Erro ao redefinir senha:", err)
      setError("Erro de conexão. Verifique se o servidor está funcionando.")
    } finally {
      setLoading(false)
    }
  }

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
                    <div className="w-16 h-16 bg-gradient-to-br from-provence-800 to-provence-900 rounded-xl flex items-center justify-center">
                      {step === "email" ? <Mail className="h-8 w-8 text-white" /> : <Shield className="h-8 w-8 text-white" />}
                    </div>
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-r from-provence-700 to-provence-900 rounded-2xl blur opacity-20 animate-pulse"></div>
                </div>
              </div>

              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-provence-800 via-provence-900 to-provence-950 bg-clip-text text-transparent mb-3 tracking-tight">
                {step === "email" ? "Recuperar Senha" : "Nova Senha"}
              </CardTitle>
              <CardDescription className="text-slate-600 text-lg font-medium">
                {step === "email" ? "Confirme seu e-mail e CPF para redefinir sua senha" : "Crie uma nova senha segura para sua conta"}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8 relative z-10">
              {step === "email" ? (
                <form onSubmit={handleEnviarEmail} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-slate-700 font-semibold flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-provence-900" />
                      E-mail cadastrado
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="h-12 border-slate-200 focus:border-provence-800 focus:ring-provence-800/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700 placeholder:text-slate-400"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="cpf" className="text-slate-700 font-semibold flex items-center gap-2 text-sm">
                      <Shield className="h-4 w-4 text-provence-900" />
                      CPF cadastrado
                    </Label>
                    <Input
                      id="cpf"
                      inputMode="numeric"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      placeholder="Somente números"
                      className="h-12 border-slate-200 focus:border-provence-800 focus:ring-provence-800/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700 placeholder:text-slate-400"
                      required
                    />
                    <p className="text-xs text-slate-500">
                      Confirmamos seu e-mail e CPF para garantir que só você redefina sua senha.
                    </p>
                  </div>

                  {error && (
                    <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-2xl">
                      <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="border-emerald-200 bg-emerald-50/80 backdrop-blur-sm rounded-2xl">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      <AlertDescription className="text-emerald-700 font-medium">{success}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-provence-900 via-provence-900 to-provence-950 hover:from-provence-950 hover:via-provence-950 hover:to-provence-950 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Verificando...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5" />
                        <span>Continuar</span>
                      </div>
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleRedefinirSenha} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="nova-senha" className="text-slate-700 font-semibold flex items-center gap-2 text-sm">
                      <Lock className="h-4 w-4 text-provence-900" />
                      Nova senha
                    </Label>
                    <Input
                      id="nova-senha"
                      type="password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="h-12 border-slate-200 focus:border-provence-800 focus:ring-provence-800/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700 placeholder:text-slate-400"
                      required
                      minLength={6}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="confirmar-senha" className="text-slate-700 font-semibold flex items-center gap-2 text-sm">
                      <Key className="h-4 w-4 text-provence-900" />
                      Confirmar nova senha
                    </Label>
                    <Input
                      id="confirmar-senha"
                      type="password"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Digite a senha novamente"
                      className="h-12 border-slate-200 focus:border-provence-800 focus:ring-provence-800/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700 placeholder:text-slate-400"
                      required
                      minLength={6}
                    />
                  </div>

                  {/* Password strength indicator */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Requisitos da senha:</h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li className={`flex items-center gap-2 ${novaSenha.length >= 6 ? "text-emerald-600" : ""}`}>
                        <div className={`w-2 h-2 rounded-full ${novaSenha.length >= 6 ? "bg-emerald-500" : "bg-slate-300"}`}></div>
                        Pelo menos 6 caracteres
                      </li>
                      <li
                        className={`flex items-center gap-2 ${novaSenha === confirmarSenha && novaSenha.length > 0 ? "text-emerald-600" : ""}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            novaSenha === confirmarSenha && novaSenha.length > 0 ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        ></div>
                        Senhas coincidem
                      </li>
                    </ul>
                  </div>

                  {error && (
                    <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-2xl">
                      <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="border-emerald-200 bg-emerald-50/80 backdrop-blur-sm rounded-2xl">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      <AlertDescription className="text-emerald-700 font-medium">{success}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep("email")}
                      className="flex-1 h-12 border-slate-200 text-slate-700 hover:bg-slate-50 bg-white/50 backdrop-blur-sm rounded-xl transition-all duration-300"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-12 bg-gradient-to-r from-provence-900 via-provence-900 to-provence-950 hover:from-provence-950 hover:via-provence-950 hover:to-provence-950 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Salvando...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Redefinir</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>


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
          </Card>
        </div>
      </div>
    </div>
  )
}
