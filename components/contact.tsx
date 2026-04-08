"use client"

import { motion } from "framer-motion"
import { Send } from "lucide-react"

export default function Contact() {
  return (
    <section className="py-20 bg-gradient-to-b from-[#F0EBFF]/50 to-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-12">
            <span className="text-[#4B0082] text-sm font-medium">CONTATO</span>
            <h2 className="text-3xl md:text-4xl font-bold text-[#4B0082] mt-4 mb-4">Entre em Contato</h2>
            <p className="text-gray-600">
              Tem dúvidas sobre nossos serviços de psicoterapia? Nossa equipe está pronta para ajudar você.
            </p>
          </div>

          <motion.form
            className="space-y-6 bg-white p-8 rounded-2xl shadow-lg border border-[#D7C7FF]"
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
                  className="w-full p-3 border border-[#A78BFA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B0082] transition-all"
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
                  className="w-full p-3 border border-[#A78BFA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B0082] transition-all"
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
                className="w-full p-3 border border-[#A78BFA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4B0082] transition-all"
                placeholder="Como podemos ajudar com sua jornada terapêutica?"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#4B0082] text-white px-8 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-[#3B0062] transition-all hover:shadow-lg hover:shadow-[#4B0082]/20"
            >
              Enviar Mensagem
              <Send className="w-5 h-5" />
            </button>
          </motion.form>
        </motion.div>
      </div>
    </section>
  )
}

