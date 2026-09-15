"use client"

import { useState } from "react"
import type React from "react"
import { motion } from "framer-motion"
import { Send, Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { API_BASE } from "@/lib/api-config"

export default function Contact() {
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [site, setSite] = useState("") // honeypot: campo escondido, pessoas não preenchem
  const [loading, setLoading] = useState(false)
  const [retorno, setRetorno] = useState<{ ok: boolean; texto: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRetorno(null)
    if (nome.trim().length < 2) return setRetorno({ ok: false, texto: "Informe seu nome." })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setRetorno({ ok: false, texto: "Informe um e-mail válido." })
    if (mensagem.trim().length < 10) return setRetorno({ ok: false, texto: "Escreva uma mensagem com pelo menos 10 caracteres." })
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/contato.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), email: email.trim(), mensagem: mensagem.trim(), site }),
        credentials: "include",
      })
      let data: any = null
      try { data = await res.json() } catch { data = null }
      if (data?.success) {
        setRetorno({ ok: true, texto: data.message || "Mensagem enviada. Obrigado pelo contato!" })
        setNome(""); setEmail(""); setMensagem("")
      } else {
        setRetorno({ ok: false, texto: data?.message || "Não foi possível enviar agora. Tente novamente." })
      }
    } catch {
      setRetorno({ ok: false, texto: "Erro de conexão. Tente novamente em instantes." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="py-20 bg-gradient-to-b from-provence-50/50 to-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-12">
            <span className="text-provence-900 text-sm font-medium">CONTATO</span>
            <h2 className="text-3xl md:text-4xl font-bold text-provence-900 mt-4 mb-4">Entre em Contato</h2>
            <p className="text-gray-600">
              Tem dúvidas sobre nossos serviços de psicoterapia? Nossa equipe está pronta para ajudar você.
            </p>
          </div>

          <motion.form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-6 bg-white p-8 rounded-2xl shadow-lg border border-provence-100"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            viewport={{ once: true }}
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome
                </label>
                <input
                  type="text"
                  id="name"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={100}
                  className="w-full p-3 border border-provence-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-provence-900 transition-all"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={100}
                  className="w-full p-3 border border-provence-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-provence-900 transition-all"
                  placeholder="seu@email.com"
                />
              </div>
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Mensagem
              </label>
              <textarea
                id="message"
                rows={4}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                maxLength={2000}
                className="w-full p-3 border border-provence-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-provence-900 transition-all"
                placeholder="Como podemos ajudar com sua jornada terapêutica?"
              />
            </div>
            <input
              type="text"
              name="site"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />
            {retorno && (
              <div
                role="status"
                className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${retorno.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
              >
                {retorno.ok ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                <span>{retorno.texto}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full bg-provence-900 text-white px-8 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-provence-950 transition-all hover:shadow-lg hover:shadow-provence-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Enviando..." : "Enviar Mensagem"}
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </motion.form>
        </motion.div>
      </div>
    </section>
  )
}

