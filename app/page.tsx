import Navbar from "@/components/navbar"
import Hero from "@/components/hero"
import Features from "@/components/features"
import About from "@/components/about"
import Contact from "@/components/contact"
import Footer from "@/components/footer"
import Testimonials from "@/components/testimonials"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-provence-100 via-white to-provence-300/20">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <About />
        <Testimonials />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
