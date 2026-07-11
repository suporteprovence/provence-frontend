"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Stethoscope, Loader2, AlertTriangle, CheckCircle, Info, Sparkles } from "lucide-react"
import Link from "next/link"

interface FormData {
  nome: string
  email: string
  senha: string
  telefone: string
  cpf: string
  tipo_usuario: "paciente" | "profissional"
  especialidade: string
  numero_crp: string
  valor_consulta: string
  bio: string
}

const especialidades = [
  "Psicologia Clínica",
  "Psicologia Cognitivo-Comportamental",
  "Psicanálise",
  "Psicologia Humanista",
  "Psicologia Sistêmica",
  "Neuropsicologia",
  "Psicologia do Desenvolvimento",
  "Psicologia Social",
  "Psicologia Organizacional",
  "Psicologia Escolar",
  "Outras",
]

export default function CadastroPage() {
  const [form, setForm] = useState<FormData>({
    nome: "",
    email: "",
    senha: "",
    telefone: "",
    cpf: "",
    tipo_usuario: "paciente",
    especialidade: "",
    numero_crp: "",
    valor_consulta: "",
    bio: "",
  })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [aceiteTermos, setAceiteTermos] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleUserTypeChange = (type: "paciente" | "profissional") => {
    setForm((prev) => ({
      ...prev,
      tipo_usuario: type,
      especialidade: "",
      numero_crp: "",
      valor_consulta: "",
      bio: "",
    }))
  }

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    }
    return value
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    }
    return value
  }

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    const amount = Number.parseFloat(numbers) / 100
    return amount
      .toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })
      .replace("R$", "")
      .trim()
  }

  const validateForm = () => {
    if (!form.nome.trim()) return "Nome é obrigatório"
    if (!form.email.trim()) return "E-mail é obrigatório"
    if (!form.senha || form.senha.length < 6) return "Senha deve ter pelo menos 6 caracteres"
    if (!form.telefone.trim()) return "Telefone é obrigatório"
    if (!form.cpf.trim()) return "CPF é obrigatório"

    if (form.tipo_usuario === "profissional") {
      if (!form.especialidade) return "Especialidade é obrigatória para profissionais"
      if (!form.numero_crp.trim()) return "Número do CRP é obrigatório para profissionais"
      if (!form.valor_consulta.trim()) return "Valor da consulta é obrigatório para profissionais"

      const valor = Number.parseFloat(form.valor_consulta.replace(/[^\d,]/g, "").replace(",", "."))
      if (valor < 50) return "Valor mínimo da consulta é R$ 50,00"
      if (valor > 1000) return "Valor máximo da consulta é R$ 1.000,00"
    }

    if (!aceiteTermos) return "É necessário aceitar os Termos de Uso e a Política de Privacidade."

    return null
  }

      const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()

      const validationError = validateForm()
      if (validationError) {
        setError(validationError)
        return
      }

      setLoading(true)
      setError("")

      try {
        const submitData: any = {
          nome: form.nome.trim(),
          email: form.email.trim(),
          senha: form.senha,
          telefone: form.telefone.trim(),
          cpf: form.cpf.trim(),
          tipo_usuario: form.tipo_usuario,
          aceite_termos: aceiteTermos,
        }

        if (form.tipo_usuario === "profissional") {
          Object.assign(submitData, {
            especialidade: form.especialidade,
            numero_crp: form.numero_crp.trim(),
            valor_consulta: Number.parseFloat(
              form.valor_consulta.replace(/[^\d,]/g, "").replace(",", ".")
            ),
            bio: form.bio.trim(),
          })
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "https://provence.host"}/auth/register.php`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(submitData),
            credentials: "include",
          }
        )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    if (data.success) {
      localStorage.setItem("user_temp", JSON.stringify(data.data))
      router.push("/completar-perfil")
    } else {
      setError(data.message || "Erro ao registrar.")
    }
  } catch (err) {
    console.error("Erro no cadastro:", err)
    setError("Erro de conexão. Verifique se o servidor está funcionando.")
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100 flex flex-col relative">
      {/* Simplified background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full blur-3xl"></div>
      </div>

      <div className="flex-grow container mx-auto flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-3xl">
          <Card className="bg-white/80 backdrop-blur-xl shadow-2xl border-0 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/80 to-purple-50/80 backdrop-blur-xl"></div>

            <CardHeader className="text-center pb-6 pt-8 relative z-10">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
              </div>

              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-purple-700 via-violet-700 to-indigo-700 bg-clip-text text-transparent mb-3 tracking-tight">
                Criar conta
              </CardTitle>
              <CardDescription className="text-slate-600 text-lg font-medium">
                Junte-se à nossa comunidade de saúde mental
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8 relative z-10">
              {/* Seletor de tipo de usuário */}
              <div className="mb-8">
                <div className="flex justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleUserTypeChange("paciente")}
                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl border-2 transition-all duration-300 ${
                      form.tipo_usuario === "paciente"
                        ? "border-purple-400 bg-gradient-to-r from-purple-50 to-violet-50 shadow-lg shadow-purple-200/50"
                        : "border-slate-200 bg-white/50 hover:border-purple-300 hover:shadow-md"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full transition-all duration-300 ${
                        form.tipo_usuario === "paciente"
                          ? "bg-gradient-to-r from-purple-500 to-violet-500 shadow-lg"
                          : "bg-slate-300"
                      }`}
                    />
                    <User
                      className={`w-5 h-5 transition-colors duration-300 ${
                        form.tipo_usuario === "paciente" ? "text-purple-600" : "text-slate-500"
                      }`}
                    />
                    <span
                      className={`font-semibold transition-colors duration-300 ${
                        form.tipo_usuario === "paciente" ? "text-purple-700" : "text-slate-600"
                      }`}
                    >
                      Paciente
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUserTypeChange("profissional")}
                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl border-2 transition-all duration-300 ${
                      form.tipo_usuario === "profissional"
                        ? "border-purple-400 bg-gradient-to-r from-purple-50 to-violet-50 shadow-lg shadow-purple-200/50"
                        : "border-slate-200 bg-white/50 hover:border-purple-300 hover:shadow-md"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full transition-all duration-300 ${
                        form.tipo_usuario === "profissional"
                          ? "bg-gradient-to-r from-purple-500 to-violet-500 shadow-lg"
                          : "bg-slate-300"
                      }`}
                    />
                    <Stethoscope
                      className={`w-5 h-5 transition-colors duration-300 ${
                        form.tipo_usuario === "profissional" ? "text-purple-600" : "text-slate-500"
                      }`}
                    />
                    <span
                      className={`font-semibold transition-colors duration-300 ${
                        form.tipo_usuario === "profissional" ? "text-purple-700" : "text-slate-600"
                      }`}
                    >
                      Profissional
                    </span>
                  </button>
                </div>

                {/* Aviso para profissionais */}
                {form.tipo_usuario === "profissional" && (
                  <div className="mt-6">
                    <Alert className="border-amber-200 bg-amber-50/80 backdrop-blur-sm rounded-2xl">
                      <Info className="h-5 w-5 text-amber-600" />
                      <AlertDescription className="text-amber-800 font-medium">
                        <strong>Atenção:</strong> Cadastros de profissionais passam por análise administrativa. Você
                        receberá um email quando sua conta for aprovada.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="nome" className="text-slate-700 font-semibold text-sm">
                      Nome Completo *
                    </Label>
                    <Input
                      id="nome"
                      name="nome"
                      value={form.nome}
                      onChange={handleChange}
                      required
                      className="h-12 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700 placeholder:text-slate-400"
                      placeholder="Seu nome completo"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-slate-700 font-semibold text-sm">
                      E-mail *
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="h-12 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700 placeholder:text-slate-400"
                      placeholder="seu@email.com"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="senha" className="text-slate-700 font-semibold text-sm">
                      Senha *
                    </Label>
                    <Input
                      id="senha"
                      name="senha"
                      type="password"
                      value={form.senha}
                      onChange={handleChange}
                      required
                      className="h-12 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700 placeholder:text-slate-400"
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="telefone" className="text-slate-700 font-semibold text-sm">
                      Telefone *
                    </Label>
                    <Input
                      id="telefone"
                      name="telefone"
                      value={form.telefone}
                      onChange={(e) => setForm((prev) => ({ ...prev, telefone: formatPhone(e.target.value) }))}
                      required
                      className="h-12 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700 placeholder:text-slate-400"
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                  </div>

                  <div className={`space-y-3 ${form.tipo_usuario === "profissional" ? "" : "md:col-span-2"}`}>
                    <Label htmlFor="cpf" className="text-slate-700 font-semibold text-sm">
                      CPF *
                    </Label>
                    <Input
                      id="cpf"
                      name="cpf"
                      value={form.cpf}
                      onChange={(e) => setForm((prev) => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                      required
                      className="h-12 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700 placeholder:text-slate-400"
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>

                  {form.tipo_usuario === "profissional" && (
                    <>
                      <div className="space-y-3">
                        <Label htmlFor="especialidade" className="text-slate-700 font-semibold text-sm">
                          Especialidade *
                        </Label>
                        <Select
                          value={form.especialidade}
                          onValueChange={(value) => setForm((prev) => ({ ...prev, especialidade: value }))}
                        >
                          <SelectTrigger className="h-12 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl bg-white/50 backdrop-blur-sm">
                            <SelectValue placeholder="Selecione sua especialidade" />
                          </SelectTrigger>
                          <SelectContent>
                            {especialidades.map((esp) => (
                              <SelectItem key={esp} value={esp}>
                                {esp}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="numero_crp" className="text-slate-700 font-semibold text-sm">
                          Número do CRP *
                        </Label>
                        <Input
                          id="numero_crp"
                          name="numero_crp"
                          value={form.numero_crp}
                          onChange={handleChange}
                          required
                          className="h-12 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700 placeholder:text-slate-400"
                          placeholder="Ex: CRP 06/123456"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="valor_consulta" className="text-slate-700 font-semibold text-sm">
                          Valor por Consulta * <span className="text-xs text-slate-500">(R$ 50 - R$ 1.000)</span>
                        </Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">
                            R$
                          </span>
                          <Input
                            id="valor_consulta"
                            name="valor_consulta"
                            value={form.valor_consulta}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, valor_consulta: formatCurrency(e.target.value) }))
                            }
                            required
                            className="h-12 border-slate-200 focus:border-purple-400 focus:ring-purple-400/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-12 text-slate-700 placeholder:text-slate-400"
                            placeholder="150,00"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-3">
                        <Label htmlFor="bio" className="text-slate-700 font-semibold text-sm">
                          Biografia Profissional
                        </Label>
                        <textarea
                          id="bio"
                          name="bio"
                          value={form.bio}
                          onChange={handleChange}
                          className="w-full h-24 px-4 py-3 border border-slate-200 rounded-xl focus:border-purple-400 focus:ring-purple-400/20 bg-white/50 backdrop-blur-sm transition-all duration-300 resize-none text-slate-700 placeholder:text-slate-400"
                          rows={3}
                          placeholder="Conte um pouco sobre sua experiência e abordagem profissional..."
                        />
                      </div>
                    </>
                  )}
                </div>

                {error && (
                  <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-2xl">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex items-start gap-3 rounded-2xl border border-purple-200 bg-purple-50/60 p-4">
                  <input
                    id="aceite"
                    type="checkbox"
                    checked={aceiteTermos}
                    onChange={(e) => setAceiteTermos(e.target.checked)}
                    className="mt-1 h-4 w-4 accent-purple-600"
                  />
                  <label htmlFor="aceite" className="text-sm text-slate-700 leading-relaxed">
                    Li e aceito os{" "}
                    <a
                      href="/termos-uso"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 font-medium hover:underline"
                    >
                      Termos de Uso e a Política de Privacidade
                    </a>
                    .
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 hover:from-purple-700 hover:via-violet-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Criando conta...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5" />
                      <span>Criar conta</span>
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="text-center pt-4 pb-8 relative z-10">
              <p className="text-slate-600 w-full">
                Já tem uma conta?{" "}
                <Link
                  href="/login"
                  className="text-purple-600 hover:text-purple-700 transition-colors font-semibold hover:underline"
                >
                  Entrar
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
