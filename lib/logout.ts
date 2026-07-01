import { API_BASE } from "@/lib/api-config"

// Chaves gravadas no login (app/login/page.tsx) e telas relacionadas
const AUTH_KEYS = [
  "user_logged",
  "usuario",
  "user",
  "auth_user",
  "userId",
  "userType",
  "token",
  "cadastro_pendente",
]

/**
 * Encerra a sessão PHP no servidor (auth/logout.php) e limpa o estado local.
 * É resiliente: mesmo que a chamada ao servidor falhe, os dados locais são
 * apagados e o usuário é redirecionado para /login.
 */
export async function logout(redirectTo = "/login") {
  try {
    await fetch(`${API_BASE}/auth/logout.php`, {
      method: "POST",
      credentials: "include",
    })
  } catch (error) {
    console.error("Erro ao encerrar sessão no servidor:", error)
  } finally {
    if (typeof window !== "undefined") {
      AUTH_KEYS.forEach((key) => localStorage.removeItem(key))
      window.location.href = redirectTo
    }
  }
}
