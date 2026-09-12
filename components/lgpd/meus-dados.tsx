"use client"

import { useEffect, useRef, useState } from "react"
import { Download, Loader2, ShieldCheck, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { API_BASE } from "@/lib/api-config"
import { logout } from "@/lib/logout"

type MensagemExclusao = {
  variant: "destructive" | "warning" | "success"
  texto: string
}

/**
 * Área do titular (LGPD): baixar uma cópia dos dados e excluir a conta.
 * Usada no perfil do paciente e do profissional.
 */
export function MeusDados() {
  // Exportação
  const [baixando, setBaixando] = useState(false)
  const [erroDownload, setErroDownload] = useState("")
  const [sucessoDownload, setSucessoDownload] = useState("")

  // Exclusão
  const [dialogAberto, setDialogAberto] = useState(false)
  const [senha, setSenha] = useState("")
  const [confirmacao, setConfirmacao] = useState("")
  const [excluindo, setExcluindo] = useState(false)
  const [excluido, setExcluido] = useState(false)
  const [mensagemExclusao, setMensagemExclusao] = useState<MensagemExclusao | null>(null)

  const timerLogout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerLogout.current) clearTimeout(timerLogout.current)
    }
  }, [])

  const handleBaixar = async () => {
    setBaixando(true)
    setErroDownload("")
    setSucessoDownload("")
    try {
      const res = await fetch(`${API_BASE}/usuarios/exportar_dados.php`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      })

      if (!res.ok) {
        let mensagem = "Não foi possível gerar o arquivo. Tente novamente em instantes."
        try {
          const data = await res.json()
          if (data && typeof data.message === "string" && data.message) mensagem = data.message
        } catch {
          // resposta sem JSON: mantém a mensagem padrão
        }
        setErroDownload(mensagem)
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = "provence-meus-dados.json"
      document.body.appendChild(link)
      link.click()
      link.remove()
      // Pequeno atraso para o navegador iniciar o download antes de liberar a URL
      setTimeout(() => URL.revokeObjectURL(url), 1000)

      setSucessoDownload("Arquivo gerado. Confira a pasta de downloads.")
    } catch {
      setErroDownload("Erro de conexão ao gerar o arquivo. Verifique sua internet e tente novamente.")
    } finally {
      setBaixando(false)
    }
  }

  const abrirDialog = () => {
    setSenha("")
    setConfirmacao("")
    setMensagemExclusao(null)
    setDialogAberto(true)
  }

  const onDialogChange = (aberto: boolean) => {
    // Enquanto a exclusão está em andamento (ou já concluída) o diálogo fica aberto
    if (!aberto && (excluindo || excluido)) return
    setDialogAberto(aberto)
    if (!aberto) {
      setSenha("")
      setConfirmacao("")
      setMensagemExclusao(null)
    }
  }

  const podeExcluir = confirmacao === "EXCLUIR" && senha.length > 0 && !excluindo && !excluido

  const handleExcluir = async () => {
    if (!podeExcluir) return
    setExcluindo(true)
    setMensagemExclusao(null)
    try {
      const res = await fetch(`${API_BASE}/usuarios/excluir_conta.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify({ senha, confirmacao }),
      })

      let data: { success?: boolean; message?: string } | null = null
      try {
        data = await res.json()
      } catch {
        data = null
      }

      if (res.status === 409) {
        setMensagemExclusao({
          variant: "warning",
          texto:
            data?.message ||
            "Existem pendências na sua conta (consulta futura, reembolso ou valores a receber). Resolva-as antes de excluir.",
        })
        return
      }

      if (!res.ok || !data?.success) {
        setMensagemExclusao({
          variant: "destructive",
          texto: data?.message || "Não foi possível excluir a conta. Tente novamente.",
        })
        return
      }

      setExcluido(true)
      setMensagemExclusao({
        variant: "success",
        texto: data.message || "Conta excluída. Você será desconectado em instantes.",
      })
      timerLogout.current = setTimeout(() => {
        logout()
      }, 1500)
    } catch {
      setMensagemExclusao({
        variant: "destructive",
        texto: "Erro de conexão ao excluir a conta. Verifique sua internet e tente novamente.",
      })
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <ShieldCheck className="w-5 h-5 text-provence-800" aria-hidden="true" />
          {"Meus dados e privacidade"}
        </CardTitle>
        <CardDescription>
          {
            "Você pode baixar uma cópia de tudo que a Provence guarda sobre você ou excluir sua conta. Para outros pedidos (correção de dados, dúvidas sobre privacidade), escreva para "
          }
          <a href="mailto:contato@provence.host" className="text-provence-800 underline underline-offset-2">
            contato@provence.host
          </a>
          {"."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {erroDownload && (
          <Alert variant="destructive">
            <AlertDescription>{erroDownload}</AlertDescription>
          </Alert>
        )}
        {sucessoDownload && (
          <Alert variant="success">
            <AlertDescription>{sucessoDownload}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleBaixar}
            disabled={baixando}
            className="gap-2 border-provence-300 text-provence-900 hover:bg-provence-50"
          >
            {baixando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {"Gerando arquivo..."}
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                {"Baixar meus dados"}
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={abrirDialog}
            className="gap-2 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            <Trash2 className="w-4 h-4" />
            {"Excluir minha conta"}
          </Button>
        </div>
      </CardContent>

      <Dialog open={dialogAberto} onOpenChange={onDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{"Excluir conta"}</DialogTitle>
            <DialogDescription>{"Antes de continuar, veja o que acontece com a sua conta."}</DialogDescription>
          </DialogHeader>

          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>{"Seus dados pessoais (nome, e-mail, telefone, CPF) serão removidos."}</li>
            <li>{"Registros de consultas e pagamentos ficam anonimizados pelo prazo legal."}</li>
            <li>{"Esta ação não pode ser desfeita."}</li>
          </ul>

          {mensagemExclusao && (
            <Alert variant={mensagemExclusao.variant}>
              <AlertDescription>{mensagemExclusao.texto}</AlertDescription>
            </Alert>
          )}

          {!excluido && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lgpd-senha">{"Senha atual"}</Label>
                <Input
                  id="lgpd-senha"
                  type="password"
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  disabled={excluindo}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lgpd-confirmacao">{"Digite EXCLUIR para confirmar"}</Label>
                <Input
                  id="lgpd-confirmacao"
                  autoComplete="off"
                  autoCapitalize="characters"
                  placeholder="EXCLUIR"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  disabled={excluindo}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onDialogChange(false)}
              disabled={excluindo || excluido}
            >
              {"Cancelar"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleExcluir}
              disabled={!podeExcluir}
              className="gap-2"
            >
              {excluindo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {"Excluindo..."}
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  {"Excluir definitivamente"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
