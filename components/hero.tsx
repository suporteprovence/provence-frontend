"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight, Shield, Clock } from "lucide-react"
import Navbar from "./navbar"

export default function Hero() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EDE7FF] via-[#E2D7FF] to-[#D7C7FF] relative overflow-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-36 pb-24">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-8 mx-auto"
            >
              <Shield size={18} className="text-[#4B0082]" />
              <span className="text-sm font-medium text-[#4B0082]">Psicoterapia Online Segura</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="space-y-6 mb-12"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight">
                Transforme sua vida com terapia online personalizada
              </h1>

              <p className="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
                Conectamos você a psicólogos altamente qualificados para sessões online seguras e confidenciais. Cuide
                da sua saúde mental no conforto da sua casa, com flexibilidade e suporte profissional.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="flex flex-wrap justify-center gap-4 mb-16"
            >
              <Link
                href="/register"
                className="inline-flex items-center px-8 py-3 rounded-full text-base font-medium text-white bg-[#4B0082] hover:bg-[#3B0062] transition-all shadow-lg hover:shadow-[#4B0082]/20 group"
              >
                Comece Sua Jornada
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/sobre-nos"
                className="inline-flex items-center px-8 py-3 rounded-full text-base font-medium text-[#4B0082] bg-white hover:bg-[#F0EBFF] transition-all"
              >
                Saiba Mais
              </Link>
            </motion.div>

            {/* Feature Cards */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto"
            >
              {[
                {
                  icon: Shield,
                  title: "100% Online",
                  description: "Sessões seguras e privadas",
                },
                {
                  icon: Clock,
                  title: "Atendimento Rápido",
                  description: "Em até 24 horas",
                },
              ].map((card, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1, duration: 0.8 }}
                  className="flex items-center gap-4 p-6 rounded-2xl bg-white shadow-md"
                >
                  <div className="w-12 h-12 rounded-full bg-[#F0EBFF] flex items-center justify-center flex-shrink-0">
                    <card.icon className="w-6 h-6 text-[#4B0082]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{card.title}</h3>
                    <p className="text-gray-600">{card.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
