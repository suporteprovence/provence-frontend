"use client"

import { motion } from "framer-motion"
import { Calendar, MessageSquare, UserCircle, Clock, Shield, Video } from "lucide-react"

const features = [
  {
    icon: Calendar,
    title: "Agendamento Online",
    description: "Marque suas sessões de terapia de forma rápida e prática, escolhendo o melhor horário para você.",
  },
  {
    icon: MessageSquare,
    title: "Chat Terapêutico",
    description: "Comunicação direta e segura com seu psicólogo através de nossa plataforma criptografada.",
  },
  {
    icon: Video,
    title: "Sessões Online",
    description: "Atendimento psicológico remoto com a mesma qualidade de uma sessão presencial.",
  },
  {
    icon: UserCircle,
    title: "Perfil Personalizado",
    description: "Mantenha seu histórico terapêutico e preferências em um só lugar seguro.",
  },
  {
    icon: Shield,
    title: "Confidencialidade",
    description: "Sua privacidade e sigilo terapêutico são nossas prioridades absolutas.",
  },
  {
    icon: Clock,
    title: "Disponibilidade Flexível",
    description: "Acesse a plataforma e agende sessões em horários que se encaixem na sua rotina.",
  },
]

export default function Features() {
  return (
    <section className="py-20 bg-gradient-to-br from-white to-provence-50/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-provence-900 text-sm font-medium uppercase tracking-wider">RECURSOS</span>
          <h2 className="text-3xl md:text-4xl font-bold text-provence-900 mt-4 mb-4">Tudo que você precisa</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Nossa plataforma oferece todas as ferramentas necessárias para uma experiência de psicoterapia online
            completa, segura e eficiente.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-2xl hover:shadow-xl transition-all duration-300 border border-provence-100 hover:border-provence-600 group relative overflow-hidden"
            >
              {/* Elemento decorativo */}
              <div className="absolute -right-16 -top-16 w-32 h-32 bg-provence-50 rounded-full transform transition-transform duration-500 group-hover:scale-150"></div>

              <div className="relative z-10">
                <div className="bg-gradient-to-br from-provence-950 to-provence-900 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:shadow-provence-600/50 transition-all duration-300 transform group-hover:scale-110">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-xl font-semibold text-provence-900 mb-3 group-hover:translate-x-2 transition-all duration-300">
                  {feature.title}
                </h3>

                <p className="text-gray-600 relative z-10 group-hover:translate-x-2 transition-all duration-300">
                  {feature.description}
                </p>
              </div>

              {/* Elemento decorativo inferior */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-provence-900 to-provence-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

