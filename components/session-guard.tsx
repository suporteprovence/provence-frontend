"use client"

import { useEffect } from "react"
import { logout } from "@/lib/logout"
import { API_BASE } from "@/lib/api-config"

// Marcadores gravados no login. Só deslogamos se o usuário estiver logado.
const MARCADORES_LOGIN = ["user_logged", "usuario", "user", "auth_user", "token"]
// Mensagens que o backend retorna quando a sessão caiu.
const RE_SESSAO_EXPIRADA = /n[aã]o autenticad|sess[aã]o expirad/i

// Módulo-nível: garante que o logout dispare uma vez só.
let jaDeslogando = false

function estaLogado(): boolean {
  return MARCADORES_LOGIN.some((k) => {
    try {
      return !!localStorage.getItem(k)
    } catch {
      return false
    }
  })
}

/**
 * Desloga o cliente automaticamente quando a sessão expira.
 * Intercepta o fetch uma única vez (global) e, se qualquer chamada à API
 * voltar como "sessão expirada" (HTTP 401 ou corpo com a mensagem), limpa o
 * login e redireciona para /login. Ignora as rotas de auth e só age com o
 * usuário logado, pra nunca deslogar por engano em página pública ou no login.
 */
export function SessionGuard() {
  useEffect(() => {
    const original = window.fetch

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await original(...args)
      try {
        const input = args[0]
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : (input as Request).url

        const ehApi = typeof url === "string" && url.startsWith(API_BASE)
        const ehAuth = typeof url === "string" && url.includes("/auth/")

        if (ehApi && !ehAuth && !jaDeslogando && estaLogado()) {
          let expirou = res.status === 401
          if (!expirou && res.status === 200) {
            try {
              // parseia o JSON pra decodificar os acentos (ã -> ã)
              const body = await res.clone().json()
              if (body && body.success === false && typeof body.message === "string") {
                expirou = RE_SESSAO_EXPIRADA.test(body.message)
              }
            } catch {
              // não é JSON: ignora
            }
          }
          if (expirou) {
            jaDeslogando = true
            logout()
          }
        }
      } catch {
        // o guard nunca pode quebrar a requisição original
      }
      return res
    }

    return () => {
      window.fetch = original
    }
  }, [])

  return null
}
