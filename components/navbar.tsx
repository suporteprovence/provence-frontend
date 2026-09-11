"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Menu, X, LogIn, UserPlus } from "lucide-react"
import Image from "next/image"

const ProvenceLogo = () => {
  return (
    <div className="flex items-center -ml-6">
      <Image
        src="/provence-logo.png"
        alt="Provence Logo"
        width={140}
        height={56}
        className="h-12 sm:h-14 w-auto"
      />
    </div>
  )
}

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navItems = [
    { name: "Sobre Nós", href: "/sobre-nos" },
  ]

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/90 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex items-center justify-between h-24">
          <Link href="/" className="flex items-center">
            <ProvenceLogo />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-10">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-700 hover:text-provence-900 transition-colors text-base font-medium"
              >
                {item.name}
              </Link>
            ))}
            <Link
              href="/login"
              className="text-provence-900 hover:text-provence-950 transition-colors text-base font-medium flex items-center gap-2 px-5 py-2.5 rounded-full hover:bg-provence-50"
            >
              <LogIn size={20} />
              Entrar
            </Link>
            <Link
              href="/register"
              className="bg-provence-900 text-white px-7 py-3 rounded-full hover:bg-provence-950 transition-all text-base font-medium shadow-sm hover:shadow-lg flex items-center gap-2 hover:scale-105 transform duration-200"
            >
              <UserPlus size={20} />
              Cadastrar
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-provence-900 hover:bg-provence-50 p-3 rounded-full transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/95 backdrop-blur-md border-t"
          >
            <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12 py-8">
              <div className="flex flex-col gap-5">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="text-gray-700 hover:text-provence-900 transition-colors py-2.5 text-xl font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <Link
                  href="/login"
                  className="text-provence-900 hover:text-provence-950 transition-colors py-3.5 flex items-center gap-3 text-xl font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <LogIn size={24} />
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="bg-provence-900 text-white px-7 py-3.5 rounded-full hover:bg-provence-950 transition-all text-center shadow-sm hover:shadow-lg mt-3 flex items-center justify-center gap-3 text-xl font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <UserPlus size={24} />
                  Cadastrar
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

