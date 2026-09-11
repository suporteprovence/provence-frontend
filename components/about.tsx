"use client"

import { motion } from "framer-motion"
import { CheckCircle, Zap, Shield, Heart, Headphones } from "lucide-react"

export default function About() {
  const features = [
    {
      icon: Zap,
      title: "Acesso Rápido",
      description: "Conecte-se com psicólogos qualificados em minutos, não em dias.",
    },
    {
      icon: Shield,
      title: "Segurança Primeiro",
      description: "Sua privacidade e dados estão protegidos com a mais alta segurança.",
    },
    {
      icon: Heart,
      title: "Terapia Personalizada",
      description: "Receba atenção individualizada adaptada às suas necessidades emocionais.",
    },
    {
      icon: Headphones,
      title: "Suporte 24/7",
      description: "Nossa equipe está sempre disponível para ajudar você.",
    },
  ]

  return (
    <section className="py-20 bg-gradient-to-b from-white to-provence-50/50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-provence-900 text-sm font-medium uppercase tracking-wider">Sobre Nós</span>
          <h2 className="text-3xl md:text-4xl font-bold text-provence-900 mt-4 mb-6">O Futuro da Psicoterapia Online</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Estamos construindo uma plataforma revolucionária que conecta pacientes a psicólogos qualificados de forma
            rápida, segura e eficiente. Nossa missão é tornar o cuidado com a saúde mental mais acessível e conveniente
            para todos.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-start">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-semibold text-provence-900 mb-6">Nossa Visão</h3>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Imaginamos um mundo onde o acesso a cuidados de saúde mental de qualidade não é limitado por localização
              ou tempo. Com nossa plataforma, estamos tornando essa visão uma realidade, unindo tecnologia avançada e
              atendimento humanizado para o bem-estar psicológico.
            </p>
            <div className="space-y-4">
              {[
                "Tecnologia de ponta para sessões de terapia online",
                "Rede crescente de psicólogos qualificados",
                "Compromisso com a satisfação e evolução do paciente",
                "Inovação constante em saúde mental digital",
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-3 text-gray-600"
                >
                  <CheckCircle className="w-5 h-5 text-provence-900" />
                  <span>{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid gap-6 sm:grid-cols-2"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white/90 p-6 rounded-lg shadow-md hover:shadow-lg hover:shadow-provence-900/10 transition-all duration-300"
              >
                <feature.icon className="w-10 h-10 text-provence-900 mb-4" />
                <h4 className="text-lg font-semibold text-provence-900 mb-2">{feature.title}</h4>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

