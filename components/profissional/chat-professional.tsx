"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Send } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { API_BASE } from "@/lib/api-config"

interface Conversation {
  id: number
  patient: string
  lastMessage: string
  time: string
  unread: number
  online: boolean
}

interface Message {
  id: number
  sender: "professional" | "patient"
  content: string
  time: string
}

export function ChatProfessional() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchConversations()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/chat/listar.php`, {
        method: "GET",
        credentials: "include",
      })
      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        const formatted: Conversation[] = data.data.map((conv: any) => ({
          id: conv.id,
          patient: conv.nome_paciente || conv.nome_profissional || "Paciente",
          lastMessage: conv.ultima_mensagem || "Sem mensagens",
          time: conv.data_ultima_mensagem
            ? new Date(conv.data_ultima_mensagem).toLocaleDateString("pt-BR")
            : "",
          unread: conv.nao_lidas || 0,
          online: conv.online || false,
        }))

        setConversations(formatted)
        if (formatted.length > 0) {
          setSelectedChat(formatted[0])
          fetchMessages(formatted[0].id)
        }
      } else {
        toast({
          title: "Erro",
          description: data.message || "Erro ao carregar conversas",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao buscar conversas:", error)
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (consultaId: number) => {
    try {
      const response = await fetch(`${API_BASE}/chat/listar.php?consulta_id=${consultaId}`, {
        method: "GET",
        credentials: "include",
      })
      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        const formatted: Message[] = data.data.map((msg: any, index: number) => ({
          id: msg.id || index,
          sender: msg.tipo_remetente === "profissional" ? "professional" : "patient",
          content: msg.mensagem,
          time: new Date(msg.enviada_em).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }))
        setMessages(formatted)
      }
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error)
    }
  }

  const handleSelectChat = (conversation: Conversation) => {
    setSelectedChat(conversation)
    fetchMessages(conversation.id)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return

    try {
      setSending(true)
      const response = await fetch(`${API_BASE}/chat/enviar.php`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consulta_id: selectedChat.id,
          mensagem: newMessage,
        }),
      })
      const data = await response.json()

      if (data.success) {
        setNewMessage("")
        fetchMessages(selectedChat.id)
      } else {
        toast({
          title: "Erro",
          description: data.message || "Erro ao enviar mensagem",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
      toast({
        title: "Erro",
        description: "Erro ao enviar mensagem",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)

  const filteredConversations = conversations.filter((conversation) =>
    conversation.patient.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <p className="text-muted-foreground">Carregando conversas...</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-12rem)]">
      <Card className="glass border-border/50 h-full flex overflow-hidden">
        {/* Contacts Sidebar */}
        <div className="w-80 border-r border-border/50 flex flex-col">
          <div className="p-4 border-b border-border/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pacientes..."
                className="pl-10 rounded-xl bg-card/50 border-border/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => handleSelectChat(conversation)}
                    className={cn(
                      "w-full p-4 rounded-xl flex items-start gap-3 transition-all mb-2",
                      selectedChat?.id === conversation.id
                        ? "bg-primary/10 border-2 border-primary/30"
                        : "hover:bg-card/50 border-2 border-transparent",
                    )}
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12 border-2 border-primary/20">
                        <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                          {initials(conversation.patient)}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm truncate">{conversation.patient}</p>
                        <span className="text-xs text-muted-foreground">{conversation.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{conversation.lastMessage}</p>
                    </div>
                    {conversation.unread > 0 && (
                      <Badge className="bg-gradient-to-br from-red-500 to-pink-500 text-white border-0 h-5 min-w-5 flex items-center justify-center p-0 px-1.5">
                        {conversation.unread}
                      </Badge>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma conversa encontrada</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        {selectedChat ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-border/50 flex items-center gap-3">
              <Avatar className="w-12 h-12 border-2 border-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  {initials(selectedChat.patient)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{selectedChat.patient}</p>
                <p className="text-sm text-muted-foreground">Paciente</p>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwn = message.sender === "professional"
                  return (
                    <div key={message.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                      <div className={cn("flex gap-3 max-w-[70%]", isOwn && "flex-row-reverse")}>
                        {!isOwn && (
                          <Avatar className="w-8 h-8 border-2 border-primary/20">
                            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs">
                              {initials(selectedChat.patient)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn("flex flex-col", isOwn && "items-end")}>
                          <div
                            className={cn(
                              "rounded-2xl px-4 py-3",
                              isOwn
                                ? "bg-gradient-to-br from-primary to-accent text-white rounded-br-sm"
                                : "bg-card/80 border border-border/50 rounded-bl-sm",
                            )}
                          >
                            <p className="text-sm">{message.content}</p>
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">{message.time}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-border/50">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Digite sua mensagem..."
                  className="flex-1 rounded-xl bg-card/50 border-border/50"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  disabled={sending}
                />
                <Button
                  size="icon"
                  className="rounded-xl bg-gradient-to-r from-primary to-accent shadow-lg hover:shadow-xl transition-all"
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Selecione uma conversa para começar</p>
          </div>
        )}
      </Card>
    </div>
  )
}
