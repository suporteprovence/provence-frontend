"use client"

import { motion } from "framer-motion"
import { Star, Quote } from "lucide-react"

const testimonials = [
  {
    name: "Maria S.",
    role: "Paciente",
    content:
      "Excelente plataforma! Facilitou muito minha vida poder fazer consultas online e ter todo meu histórico terapêutico organizado.",
    rating: 5,
  },
  {
    name: "João P.",
    role: "Paciente",
    content:
      "O atendimento é muito profissional e a plataforma é super intuitiva. Recomendo para todos que buscam terapia online!",
    rating: 5,
  },
  {
    name: "Ana C.",
    role: "Paciente",
    content:
      "Adorei a facilidade de marcar sessões e a rapidez no atendimento. Os psicólogos são excelentes e atenciosos.",
    rating: 5,
  },
]

export default function Testimonials() {
  return (
    <section className="py-20 bg-gradient-to-br from-[#EDE7FF] via-[#F0EBFF] to-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-[#4B0082] text-sm font-medium uppercase tracking-wider">DEPOIMENTOS</span>
          <h2 className="text-3xl md:text-4xl font-bold text-[#4B0082] mt-4 mb-4">O Que Nossos Pacientes Dizem</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Veja o que as pessoas estão falando sobre nossa plataforma de psicoterapia online e nossos serviços
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-white to-[#F0EBFF] p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#4B0082] to-[#8B5CF6] opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>

              <Quote className="absolute top-6 right-6 w-10 h-10 text-[#8B5CF6] opacity-20 group-hover:opacity-40 transition-opacity duration-300" />

              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[#4B0082] text-[#4B0082]" />
                ))}
              </div>

              <p className="text-gray-600 mb-6 relative z-10 group-hover:translate-x-2 transition-transform duration-300">
                "{testimonial.content}"
              </p>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#4B0082] to-[#8B5CF6] rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300">
                  <span className="text-white font-semibold">{testimonial.name.charAt(0)}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-[#4B0082] group-hover:translate-x-2 transition-transform duration-300">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-gray-600 group-hover:translate-x-2 transition-transform duration-300">
                    {testimonial.role}
                  </p>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-[#4B0082] to-[#8B5CF6] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

