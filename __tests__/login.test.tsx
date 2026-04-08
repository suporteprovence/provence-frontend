/**
 * Testes de regressão - Fluxo de Login
 * Garante que o fluxo de login não quebre com futuras alterações.
 * Rodar: npx jest __tests__/login.test.tsx
 */

import React from "react"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import "@testing-library/jest-dom"

// Mock do next/navigation
const mockPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), forward: jest.fn(), refresh: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => "/login",
}))

// Mock do next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement("a", { href }, children)
})

// Mock do localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value }),
    removeItem: jest.fn((key: string) => { delete store[key] }),
    clear: jest.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, "localStorage", { value: localStorageMock })

import LoginPage from "../app/login/page"

describe("Página de Login", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    localStorageMock.clear()
    // @ts-ignore
    delete global.fetch
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("renderiza o formulário de login", async () => {
    await act(async () => { render(<LoginPage />) })

    expect(screen.getByText("Bem-vindo")).toBeInTheDocument()
    expect(screen.getByText("E-mail")).toBeInTheDocument()
    expect(screen.getByText("Senha")).toBeInTheDocument()
    expect(screen.getByText("Entrar")).toBeInTheDocument()
  })

  it("exibe label 'E-mail' com hífen (português correto)", async () => {
    await act(async () => { render(<LoginPage />) })
    expect(screen.getByText("E-mail")).toBeInTheDocument()
  })

  it("não faz fetch quando campos estão vazios (validação HTML nativa)", async () => {
    global.fetch = jest.fn() as any

    await act(async () => { render(<LoginPage />) })

    await act(async () => {
      fireEvent.click(screen.getByText("Entrar"))
    })

    // O required nativo do HTML impede o submit, então fetch não é chamado
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("tem link para cadastro", async () => {
    await act(async () => { render(<LoginPage />) })
    const link = screen.getByText("Cadastre-se")
    expect(link.closest("a")).toHaveAttribute("href", "/register")
  })

  it("tem link para esqueci a senha", async () => {
    await act(async () => { render(<LoginPage />) })
    const link = screen.getByText("Esqueci minha senha")
    expect(link.closest("a")).toHaveAttribute("href", "/esqueci-senha")
  })

  it("redireciona paciente para /paciente após login", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 1, nome: "Teste", email: "t@t.com", tipo_usuario: "paciente", aprovado: true, perfil_completo: true, aceita_termos: true },
        }),
      })
    ) as any

    await act(async () => { render(<LoginPage />) })

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "t@t.com" } })
      fireEvent.change(screen.getByPlaceholderText("Sua senha"), { target: { value: "123456" } })
      fireEvent.click(screen.getByText("Entrar"))
    })

    // Aguarda o fetch resolver
    await act(async () => { await Promise.resolve() })

    // Avança o setTimeout de 1500ms
    act(() => { jest.advanceTimersByTime(2000) })

    expect(mockPush).toHaveBeenCalledWith("/paciente")
  })

  it("redireciona profissional para /profissional após login", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 2, nome: "Dr", email: "d@t.com", tipo_usuario: "profissional", aprovado: true, perfil_completo: true, aceita_termos: true },
        }),
      })
    ) as any

    await act(async () => { render(<LoginPage />) })

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "d@t.com" } })
      fireEvent.change(screen.getByPlaceholderText("Sua senha"), { target: { value: "123456" } })
      fireEvent.click(screen.getByText("Entrar"))
    })

    await act(async () => { await Promise.resolve() })
    act(() => { jest.advanceTimersByTime(2000) })

    expect(mockPush).toHaveBeenCalledWith("/profissional")
  })

  it("redireciona admin para /admin/dashboard após login", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { id: 3, nome: "Admin", email: "a@t.com", tipo_usuario: "admin", aprovado: true, perfil_completo: true, aceita_termos: true },
        }),
      })
    ) as any

    await act(async () => { render(<LoginPage />) })

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "a@t.com" } })
      fireEvent.change(screen.getByPlaceholderText("Sua senha"), { target: { value: "123456" } })
      fireEvent.click(screen.getByText("Entrar"))
    })

    await act(async () => { await Promise.resolve() })
    act(() => { jest.advanceTimersByTime(2000) })

    expect(mockPush).toHaveBeenCalledWith("/admin/dashboard")
  })

  it("mostra erro quando credenciais estão incorretas", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: false, message: "Senha incorreta" }),
      })
    ) as any

    await act(async () => { render(<LoginPage />) })

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "t@t.com" } })
      fireEvent.change(screen.getByPlaceholderText("Sua senha"), { target: { value: "errada" } })
      fireEvent.click(screen.getByText("Entrar"))
    })

    await act(async () => { await Promise.resolve() })

    expect(screen.getByText("Senha incorreta")).toBeInTheDocument()
  })

  it("salva dados do usuário no localStorage após login", async () => {
    const userData = { id: 1, nome: "T", email: "t@t.com", tipo_usuario: "paciente", aprovado: true, perfil_completo: true, aceita_termos: true }

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: userData }),
      })
    ) as any

    await act(async () => { render(<LoginPage />) })

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "t@t.com" } })
      fireEvent.change(screen.getByPlaceholderText("Sua senha"), { target: { value: "123456" } })
      fireEvent.click(screen.getByText("Entrar"))
    })

    await act(async () => { await Promise.resolve() })

    expect(localStorageMock.setItem).toHaveBeenCalledWith("user_logged", expect.any(String))
  })

  it("mostra erro de conexão quando fetch falha", async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error("Network error"))) as any

    await act(async () => { render(<LoginPage />) })

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("seu@email.com"), { target: { value: "t@t.com" } })
      fireEvent.change(screen.getByPlaceholderText("Sua senha"), { target: { value: "123456" } })
      fireEvent.click(screen.getByText("Entrar"))
    })

    await act(async () => { await Promise.resolve() })

    expect(screen.getByText(/erro de conexão/i)).toBeInTheDocument()
  })
})
