"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { API_BASE } from "@/lib/api-config"

interface Conversation {
  id: number
  doctor: string
  specialty: string
  lastMessage: string
  time: string
  unread: number
  online: boolean
}

interface Message {
  id: number
  sender: "doctor" | "patient"
  text: string
  time: string
}

export function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/chat/listar.php`, {
        method: "GET",
        credentials: "include",
      })

      const data = await response.json()

      if (data.success && data.data) {
        const formattedConversations = data.data.map((conv: any) => ({
          id: conv.id,
          doctor: conv.nome_profissional || conv.nome_paciente,
          specialty: conv.especialidade || "Consulta",
          lastMessage: conv.ultima_mensagem || "Sem mensagens",
          time: conv.data_ultima_mensagem || "Agora",
          unread: conv.nao_lidas || 0,
          online: conv.online || false,
        }))

        setConversations(formattedConversations)
        if (formattedConversations.length > 0) {
          setSelectedChat(formattedConversations[0])
          fetchMessages(formattedConversations[0].id)
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

      if (data.success && data.data) {
        const formattedMessages = data.data.map((msg: any, index: number) => ({
          id: msg.id || index,
          sender: msg.tipo_remetente === "profissional" ? "doctor" : "patient",
          text: msg.mensagem,
          time: new Date(msg.enviada_em).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }))

        setMessages(formattedMessages)
        scrollToBottom()
      }
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChat) return

    try {
      setSendingMessage(true)
      const response = await fetch(`${API_BASE}/chat/enviar.php`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          consulta_id: selectedChat.id,
          mensagem: message,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage("")
        fetchMessages(selectedChat.id)
        toast({
          title: "Sucesso",
          description: "Mensagem enviada",
        })
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
      setSendingMessage(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const filteredConversations = conversations.filter((conv) =>
    conv.doctor.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <p className="text-gray-500">Carregando conversas...</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      <Card className="bg-white border-0 shadow-md lg:col-span-1">
        <CardContent className="p-4 h-full flex flex-col">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar conversas..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    setSelectedChat(conv)
                    fetchMessages(conv.id)
                  }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChat?.id === conv.id ? "bg-provence-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-provence-900 text-white">
                          {conv.doctor
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      {conv.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-gray-900 truncate">{conv.doctor}</h4>
                        <span className="text-xs text-gray-500">{conv.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{conv.specialty}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                        {conv.unread > 0 && (
                          <Badge className="bg-provence-900 text-white text-xs px-2 py-0">{conv.unread}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">Nenhuma conversa encontrada</p>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedChat ? (
        <Card className="bg-white border-0 shadow-md lg:col-span-2">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="p-4 border-b flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-provence-900 text-white">
                  {selectedChat.doctor
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedChat.doctor}</h3>
                <p className="text-sm text-gray-500">{selectedChat.specialty}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "patient" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.sender === "patient" ? "bg-provence-900 text-white" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                    <span
                      className={`text-xs mt-1 block ${msg.sender === "patient" ? "text-provence-50" : "text-gray-500"}`}
                    >
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  className="flex-1"
                  disabled={sendingMessage}
                />
                <Button
                  className="bg-provence-900 hover:bg-provence-950"
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !message.trim()}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-white border-0 shadow-md lg:col-span-2 flex items-center justify-center">
          <p className="text-gray-500">Selecione uma conversa para começar</p>
        </Card>
      )}
    </div>
  )
}
