"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Calendar, Loader2, ArrowRight, Info, AlertCircle, UserCheck } from "lucide-react"
import { API_BASE } from "@/lib/api-config"

interface UserTemp {
  id: number
  nome: string
  email: string
  telefone: string
  cpf: string
  tipo_usuario: string
}

interface PerfilData {
  data_nascimento: string
  endereco: string
  cep: string
  cidade: string
  estado: string
  genero: string
  profissao: string
  como_conheceu: string
  objetivos: string
}

export default function CompletarPerfilPage() {
  const [user, setUser] = useState<UserTemp | null>(null)
  const [perfil, setPerfil] = useState<PerfilData>({
    data_nascimento: "",
    endereco: "",
    cep: "",
    cidade: "",
    estado: "",
    genero: "",
    profissao: "",
    como_conheceu: "",
    objetivos: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isClient, setIsClient] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  const estados = [
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
  ]

  const opcoesComoConheceu = [
    "Google/Busca na internet",
    "Redes sociais (Instagram, Facebook, etc.)",
    "Indicação de amigo/familiar",
    "Indicação médica",
    "Anúncio online",
    "Artigo/Blog",
    "Outros",
  ]

  useEffect(() => {
    setMounted(true)
    setIsClient(true)
    if (typeof window !== "undefined") {
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
    }
  }, [router])

  const handleChange = (field: keyof PerfilData, value: string) => {
    setPerfil((prev) => ({ ...prev, [field]: value }))
    if (error) setError("")
  }

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    if (numbers.length <= 8) {
      return numbers.replace(/(\d{5})(\d{3})/, "$1-$2")
    }
    return value
  }

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCEP(e.target.value)
    setPerfil((prev) => ({ ...prev, cep: formatted }))
    if (error) setError("")
  }

  const validateForm = () => {
    if (!perfil.endereco.trim()) return "Endereço é obrigatório"
    if (!perfil.cidade.trim()) return "Cidade é obrigatória"
    if (!perfil.estado) return "Estado é obrigatório"

    if (user?.tipo_usuario === "paciente") {
      if (!perfil.data_nascimento) return "Data de nascimento é obrigatória"
      if (!perfil.genero) return "Gênero é obrigatório"

      const hoje = new Date()
      const nascimento = new Date(perfil.data_nascimento)
      const idade = hoje.getFullYear() - nascimento.getFullYear()
      const mesAtual = hoje.getMonth()
      const mesNascimento = nascimento.getMonth()

      if (idade < 18 || (idade === 18 && mesAtual < mesNascimento)) {
        return "Você deve ter pelo menos 18 anos para se cadastrar"
      }
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!user) {
      setError("Dados do usuário não encontrados")
      return
    }

    setLoading(true)
    setError("")

    try {
      console.log("Enviando dados:", { usuario_id: user.id, ...perfil })

      const response = await fetch(`${API_BASE}/auth/completar_perfil.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuario_id: user.id,
          ...perfil,
        }),
        credentials: "include",
      })

      console.log("Status da resposta:", response.status)

      if (response.status === 401) {
        let dataNaoAutorizado: { message?: string } | null = null
        try {
          dataNaoAutorizado = await response.json()
        } catch {
          dataNaoAutorizado = null
        }
        setError(
          dataNaoAutorizado?.message ||
            "Sessão de cadastro não encontrada. Refaça o cadastro para continuar."
        )
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const responseText = await response.text()
      console.log("Resposta bruta:", responseText)

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("Erro ao fazer parse da resposta:", parseError)
        throw new Error("Resposta inválida do servidor")
      }

      console.log("Dados da resposta:", data)

      if (data.success) {
        const updatedUser = { ...user, perfil_completo: true }
        localStorage.setItem("user_temp", JSON.stringify(updatedUser))
        router.push("/termos-uso")
      } else {
        setError(data.message || "Erro ao completar perfil")
      }
    } catch (err) {
      console.error("Erro completo:", err)
      if (err instanceof Error) {
        setError(`Erro de conexão: ${err.message}`)
      } else {
        setError("Erro de conexão. Tente novamente.")
      }
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || !isClient || !user) {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-provence-50 to-provence-100 flex flex-col relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-provence-50/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-provence-100/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-provence-50/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="flex-grow container mx-auto flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-3xl animate-in fade-in-0 slide-in-from-bottom-4 duration-1000">
          <Card className="bg-white/80 backdrop-blur-xl shadow-2xl border-0 rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/90 via-white/80 to-provence-50/80 backdrop-blur-xl"></div>

            <CardHeader className="text-center pb-6 pt-8 relative z-10">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-provence-700 via-provence-800 to-provence-900 rounded-2xl flex items-center justify-center shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                    <div className="w-16 h-16 bg-gradient-to-br from-provence-900 to-provence-950 rounded-xl flex items-center justify-center">
                      <UserCheck className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-r from-provence-700 to-provence-900 rounded-2xl blur opacity-20 animate-pulse"></div>
                </div>
              </div>

              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-provence-900 via-provence-900 to-provence-950 bg-clip-text text-transparent mb-3 tracking-tight">
                Complete seu perfil
              </CardTitle>
              <CardDescription className="text-slate-600 text-lg font-medium">
                Olá, {user.nome}! Vamos personalizar sua experiência
                {user.tipo_usuario === "profissional" && " profissional"}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-8 pb-8 relative z-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                {user.tipo_usuario === "profissional" && (
                  <div className="mb-6 animate-in fade-in-0 slide-in-from-top-2 duration-500">
                    <Alert className="border-blue-200 bg-blue-50/80 backdrop-blur-sm rounded-2xl">
                      <Info className="h-5 w-5 text-blue-600" />
                      <AlertDescription className="text-blue-800 font-medium">
                        <strong>Profissional:</strong> Alguns campos são opcionais, mas recomendamos preenchê-los para
                        que os pacientes possam conhecê-lo melhor.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3 group">
                    <Label
                      htmlFor="data_nascimento"
                      className="text-slate-700 font-semibold flex items-center gap-2 text-sm"
                    >
                      <Calendar className="h-4 w-4 text-provence-900" />
                      Data de Nascimento {user.tipo_usuario === "paciente" ? "*" : "(Opcional)"}
                    </Label>
                    <div className="relative">
                      <Input
                        id="data_nascimento"
                        type="date"
                        value={perfil.data_nascimento}
                        onChange={(e) => handleChange("data_nascimento", e.target.value)}
                        className="h-12 border-slate-200 focus:border-provence-800 focus:ring-provence-800/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700"
                        required={user.tipo_usuario === "paciente"}
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-provence-400/0 via-provence-400/0 to-provence-400/0 group-focus-within:from-provence-400/10 group-focus-within:via-transparent group-focus-within:to-provence-500/10 transition-all duration-500 pointer-events-none"></div>
                    </div>
                  </div>

                  <div className="space-y-3 group">
                    <Label htmlFor="genero" className="text-slate-700 font-semibold text-sm">
                      Gênero {user.tipo_usuario === "paciente" ? "*" : "(Opcional)"}
                    </Label>
                    <Select value={perfil.genero} onValueChange={(value) => handleChange("genero", value)}>
                      <SelectTrigger className="h-12 border-slate-200 focus:border-provence-800 focus:ring-provence-800/20 rounded-xl bg-white/50 backdrop-blur-sm">
                        <SelectValue placeholder="Selecione seu gênero" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="nao-binario">Não-binário</SelectItem>
                        <SelectItem value="prefiro-nao-informar">Prefiro não informar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 space-y-3 group">
                    <Label htmlFor="endereco" className="text-slate-700 font-semibold flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-provence-900" />
                      Endereço Completo *
                    </Label>
                    <div className="relative">
                      <Input
                        id="endereco"
                        value={perfil.endereco}
                        onChange={(e) => handleChange("endereco", e.target.value)}
                        placeholder="Rua, número, bairro"
                        className="h-12 border-slate-200 focus:border-provence-800 focus:ring-provence-800/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700 placeholder:text-slate-400"
                        required
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-provence-400/0 via-provence-400/0 to-provence-400/0 group-focus-within:from-provence-400/10 group-focus-within:via-transparent group-focus-within:to-provence-500/10 transition-all duration-500 pointer-events-none"></div>
                    </div>
                  </div>

                  <div className="space-y-3 group">
                    <Label htmlFor="cep" className="text-slate-700 font-semibold text-sm">
                      CEP
                    </Label>
                    <div className="relative">
                      <Input
                        id="cep"
                        value={perfil.cep}
                        onChange={handleCEPChange}
                        placeholder="00000-000"
                        className="h-12 border-slate-200 focus:border-provence-800 focus:ring-provence-800/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700 placeholder:text-slate-400"
                        maxLength={9}
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-provence-400/0 via-provence-400/0 to-provence-400/0 group-focus-within:from-provence-400/10 group-focus-within:via-transparent group-focus-within:to-provence-500/10 transition-all duration-500 pointer-events-none"></div>
                    </div>
                  </div>

                  <div className="space-y-3 group">
                    <Label htmlFor="cidade" className="text-slate-700 font-semibold text-sm">
                      Cidade *
                    </Label>
                    <div className="relative">
                      <Input
                        id="cidade"
                        value={perfil.cidade}
                        onChange={(e) => handleChange("cidade", e.target.value)}
                        placeholder="Sua cidade"
                        className="h-12 border-slate-200 focus:border-provence-800 focus:ring-provence-800/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700 placeholder:text-slate-400"
                        required
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-provence-400/0 via-provence-400/0 to-provence-400/0 group-focus-within:from-provence-400/10 group-focus-within:via-transparent group-focus-within:to-provence-500/10 transition-all duration-500 pointer-events-none"></div>
                    </div>
                  </div>

                  <div className="space-y-3 group">
                    <Label htmlFor="estado" className="text-slate-700 font-semibold text-sm">
                      Estado *
                    </Label>
                    <Select value={perfil.estado} onValueChange={(value) => handleChange("estado", value)}>
                      <SelectTrigger className="h-12 border-slate-200 focus:border-provence-800 focus:ring-provence-800/20 rounded-xl bg-white/50 backdrop-blur-sm">
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {estados.map((estado) => (
                          <SelectItem key={estado} value={estado}>
                            {estado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 group">
                    <Label htmlFor="profissao" className="text-slate-700 font-semibold text-sm">
                      Profissão
                    </Label>
                    <div className="relative">
                      <Input
                        id="profissao"
                        value={perfil.profissao}
                        onChange={(e) => handleChange("profissao", e.target.value)}
                        placeholder="Sua profissão"
                        className="h-12 border-slate-200 focus:border-provence-800 focus:ring-provence-800/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 pl-4 text-slate-700 placeholder:text-slate-400"
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-provence-400/0 via-provence-400/0 to-provence-400/0 group-focus-within:from-provence-400/10 group-focus-within:via-transparent group-focus-within:to-provence-500/10 transition-all duration-500 pointer-events-none"></div>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-3 group">
                    <Label htmlFor="como_conheceu" className="text-slate-700 font-semibold text-sm">
                      Como conheceu nossa plataforma?
                    </Label>
                    <Select
                      value={perfil.como_conheceu}
                      onValueChange={(value) => handleChange("como_conheceu", value)}
                    >
                      <SelectTrigger className="h-12 border-slate-200 focus:border-provence-800 focus:ring-provence-800/20 rounded-xl bg-white/50 backdrop-blur-sm">
                        <SelectValue placeholder="Selecione uma opção" />
                      </SelectTrigger>
                      <SelectContent>
                        {opcoesComoConheceu.map((opcao) => (
                          <SelectItem key={opcao} value={opcao}>
                            {opcao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 space-y-3 group">
                    <Label htmlFor="objetivos" className="text-slate-700 font-semibold text-sm">
                      Quais são seus objetivos com a terapia? (Opcional)
                    </Label>
                    <div className="relative">
                      <Textarea
                        id="objetivos"
                        value={perfil.objetivos}
                        onChange={(e) => handleChange("objetivos", e.target.value)}
                        placeholder="Conte-nos um pouco sobre o que você espera alcançar..."
                        className="border-slate-200 focus:border-provence-800 focus:ring-provence-800/20 rounded-xl bg-white/50 backdrop-blur-sm transition-all duration-300 resize-none text-slate-700 placeholder:text-slate-400"
                        rows={3}
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-provence-400/0 via-provence-400/0 to-provence-400/0 group-focus-within:from-provence-400/10 group-focus-within:via-transparent group-focus-within:to-provence-500/10 transition-all duration-500 pointer-events-none"></div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
                    <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-2xl">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <AlertDescription className="text-red-700 font-medium">{error}</AlertDescription>
                    </Alert>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-provence-900 via-provence-900 to-provence-950 hover:from-provence-950 hover:via-provence-950 hover:to-provence-950 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Salvando perfil...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <ArrowRight className="w-5 h-5" />
                      <span>Continuar</span>
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="text-center pt-4 pb-8 relative z-10">
              <p className="text-sm text-slate-600 w-full">
                Suas informações são confidenciais e utilizadas apenas para melhorar sua experiência
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
