"use client"

import { useState } from "react"
import { Search, Send, Paperclip, Smile, MoreVertical, Phone, Video, Info } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface Contact {
  id: string
  name: string
  avatar?: string
  lastMessage: string
  timestamp: string
  unread: number
  online: boolean
}

interface Message {
  id: string
  senderId: string
  content: string
  timestamp: string
  type: "text" | "file"
}

const contacts: Contact[] = []

const mockMessages: Message[] = []

export function ChatProfessional() {
  const [selectedContact, setSelectedContact] = useState<Contact>(contacts[0])
  const [messages, setMessages] = useState<Message[]>(mockMessages)
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSendMessage = () => {
    if (!newMessage.trim()) return

    const message: Message = {
      id: Date.now().toString(),
      senderId: "professional",
      content: newMessage,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      type: "text",
    }

    setMessages([...messages, message])
    setNewMessage("")
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
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className={cn(
                    "w-full p-4 rounded-xl flex items-start gap-3 transition-all mb-2",
                    selectedContact.id === contact.id
                      ? "bg-primary/10 border-2 border-primary/30"
                      : "hover:bg-card/50 border-2 border-transparent",
                  )}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12 border-2 border-primary/20">
                      <AvatarImage src={contact.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                        {contact.name.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    {contact.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-sm truncate">{contact.name}</p>
                      <span className="text-xs text-muted-foreground">{contact.timestamp}</span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
                  </div>
                  {contact.unread > 0 && (
                    <Badge className="bg-gradient-to-br from-red-500 to-pink-500 text-white border-0 h-5 min-w-5 flex items-center justify-center p-0 px-1.5">
                      {contact.unread}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-12 h-12 border-2 border-primary/20">
                  <AvatarImage src={selectedContact.avatar || "/placeholder.svg"} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                    {selectedContact.name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                {selectedContact.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background" />
                )}
              </div>
              <div>
                <p className="font-semibold">{selectedContact.name}</p>
                <p className="text-sm text-muted-foreground">{selectedContact.online ? "Online" : "Offline"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-card/80">
                <Phone className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-card/80">
                <Video className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-card/80">
                <Info className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-card/80">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwn = message.senderId === "professional"
                return (
                  <div
                    key={message.id}
                    className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                  >
                    <div className={cn("flex gap-3 max-w-[70%]", isOwn && "flex-row-reverse")}>
                      {!isOwn && (
                        <Avatar className="w-8 h-8 border-2 border-primary/20">
                          <AvatarImage src={selectedContact.avatar || "/placeholder.svg"} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs">
                            {selectedContact.name.split(" ").map((n) => n[0]).join("")}
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
                        <span className="text-xs text-muted-foreground mt-1">{message.timestamp}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t border-border/50">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-card/80">
                <Paperclip className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-card/80">
                <Smile className="w-5 h-5" />
              </Button>
              <Input
                placeholder="Digite sua mensagem..."
                className="flex-1 rounded-xl bg-card/50 border-border/50"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <Button
                size="icon"
                className="rounded-xl bg-gradient-to-r from-primary to-accent shadow-lg hover:shadow-xl transition-all"
                onClick={handleSendMessage}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
