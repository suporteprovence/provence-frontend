import Navbar from "@/components/navbar"

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        {/* Título Principal */}
        <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold text-provence-900 mb-20">SOBRE NÓS.</h1>

        <div className="grid lg:grid-cols-2 gap-16 mb-32">
          {/* Coluna da Esquerda */}
          <div className="space-y-6">
            <h2 className="text-xl font-medium text-provence-900">Nossa História</h2>
            <p className="text-gray-600 leading-relaxed">
              A Provence nasceu da visão de tornar o acesso à saúde mental mais democrático e conveniente. Fundada
              por um grupo de profissionais comprometidos com o bem-estar emocional, nossa plataforma une tecnologia e
              humanização para proporcionar uma experiência única em psicoterapia online.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Desde nossa concepção, temos trabalhado incansavelmente para criar um ambiente digital seguro e acolhedor,
              onde pacientes possam encontrar o suporte psicológico que necessitam, com a mesma qualidade de um
              atendimento presencial.
            </p>
          </div>

          {/* Coluna da Direita */}
          <div className="space-y-6">
            <h2 className="text-xl font-medium text-provence-900">Nossa Missão</h2>
            <p className="text-gray-600 leading-relaxed">
              Acreditamos que o cuidado com a saúde mental deve ser acessível a todos. Nossa missão é democratizar o
              acesso à psicoterapia de qualidade, conectando pessoas a profissionais qualificados através de uma
              plataforma segura e intuitiva.
            </p>
          </div>
        </div>

        {/* Citação */}
        <div className="my-32 max-w-4xl mx-auto text-center">
          <blockquote className="text-3xl sm:text-4xl lg:text-5xl font-light italic text-provence-900 leading-tight">
            "O primeiro passo para a mudança é reconhecer a importância do cuidado com a saúde mental."
          </blockquote>
          <p className="mt-6 text-gray-600">Equipe Provence</p>
        </div>

        {/* Seção "A Equipe" */}
        <div className="mt-32">
          <h2 className="text-5xl sm:text-6xl font-bold text-provence-900 mb-16">A EQUIPE.</h2>

          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <p className="text-gray-600 leading-relaxed mb-8">
                Nossa equipe é formada por profissionais apaixonados por tecnologia e saúde mental. Trabalhamos
                continuamente para criar a melhor experiência possível em psicoterapia online, unindo inovação
                tecnológica com o cuidado humano que cada pessoa merece.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Acreditamos que a tecnologia pode aproximar pessoas e facilitar o acesso a cuidados essenciais, sempre
                mantendo a privacidade e a segurança como prioridades absolutas.
              </p>
            </div>

            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-provence-900 mb-2">100%</div>
                <div className="text-sm text-gray-600">
                  Segurança e<br />
                  Privacidade
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-provence-900 mb-2">24/7</div>
                <div className="text-sm text-gray-600">
                  Suporte
                  <br />
                  Disponível
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-provence-900 mb-2">SSL</div>
                <div className="text-sm text-gray-600">
                  Criptografia
                  <br />
                  Avançada
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-provence-900 mb-2">CFP</div>
                <div className="text-sm text-gray-600">
                  Conformidade
                  <br />
                  Regulatória
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Links de Redes Sociais */}
        <div className="mt-32 flex justify-end space-x-6 text-sm text-gray-600">
          <a href="#" className="hover:text-provence-900 transition-colors">
            instagram.
          </a>
          <a href="#" className="hover:text-provence-900 transition-colors">
            facebook.
          </a>
          <a href="#" className="hover:text-provence-900 transition-colors">
            linkedin.
          </a>
        </div>
      </div>
    </main>
  )
}

