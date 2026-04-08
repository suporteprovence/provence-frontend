"use client"

import { useState } from "react"
import { Camera, Mail, Phone, MapPin, Award, Briefcase, GraduationCap, Save } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function PerfilProfessional() {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Meu Perfil</h2>
          <p className="text-muted-foreground">Gerencie suas informações profissionais</p>
        </div>
        <Button onClick={() => setIsEditing(!isEditing)} className="rounded-xl bg-gradient-to-r from-primary to-accent">
          {isEditing ? (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </>
          ) : (
            "Editar Perfil"
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="glass p-6 border-border/50">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4">
              <Avatar className="w-32 h-32 border-4 border-primary/20">
                <AvatarImage src="/professional-avatar.jpg" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-3xl font-semibold">
                  DS
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <Button
                  size="icon"
                  className="absolute bottom-0 right-0 rounded-full bg-gradient-to-r from-primary to-accent shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              )}
            </div>
            <h3 className="text-xl font-bold mb-1">Dr. Silva</h3>
            <p className="text-sm text-muted-foreground mb-4">Psicólogo Clínico</p>
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 mb-4">
              CRP 06/123456
            </Badge>
            <div className="w-full space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <span className="text-muted-foreground">dr.silva@email.com</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Phone className="w-4 h-4 text-accent" />
                </div>
                <span className="text-muted-foreground">(11) 98765-4321</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-muted-foreground">São Paulo, SP</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Details */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="info" className="space-y-6">
            <TabsList className="glass-strong border-border/50 p-1">
              <TabsTrigger value="info" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                Informações Pessoais
              </TabsTrigger>
              <TabsTrigger value="professional" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                Dados Profissionais
              </TabsTrigger>
              <TabsTrigger value="about" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white">
                Sobre Mim
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card className="glass p-6 border-border/50">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome Completo</Label>
                      <Input defaultValue="Dr. Silva" disabled={!isEditing} className="rounded-xl bg-card/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Nascimento</Label>
                      <Input type="date" defaultValue="1985-05-15" disabled={!isEditing} className="rounded-xl bg-card/50 border-border/50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input type="email" defaultValue="dr.silva@email.com" disabled={!isEditing} className="rounded-xl bg-card/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input defaultValue="(11) 98765-4321" disabled={!isEditing} className="rounded-xl bg-card/50 border-border/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <Input defaultValue="Rua das Flores, 123 - São Paulo, SP" disabled={!isEditing} className="rounded-xl bg-card/50 border-border/50" />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="professional">
              <Card className="glass p-6 border-border/50">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CRP</Label>
                      <Input defaultValue="06/123456" disabled={!isEditing} className="rounded-xl bg-card/50 border-border/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Especialização</Label>
                      <Input defaultValue="Psicologia Clínica" disabled={!isEditing} className="rounded-xl bg-card/50 border-border/50" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Formação Acadêmica
                    </Label>
                    <Card className="glass p-4 border-border/50">
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold">Mestrado em Psicologia Clínica</p>
                          <p className="text-sm text-muted-foreground">Universidade de São Paulo - 2010-2012</p>
                        </div>
                        <div>
                          <p className="font-semibold">Graduação em Psicologia</p>
                          <p className="text-sm text-muted-foreground">Universidade de São Paulo - 2005-2009</p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Certificações
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                        Terapia Cognitivo-Comportamental
                      </Badge>
                      <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                        Mindfulness
                      </Badge>
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                        Psicoterapia Breve
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      Experiência Profissional
                    </Label>
                    <Card className="glass p-4 border-border/50">
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold">Psicólogo Clínico - Consultório Particular</p>
                          <p className="text-sm text-muted-foreground">2015 - Presente</p>
                        </div>
                        <div>
                          <p className="font-semibold">Psicólogo - Hospital das Clínicas</p>
                          <p className="text-sm text-muted-foreground">2012 - 2015</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="about">
              <Card className="glass p-6 border-border/50">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sobre Mim</Label>
                    <Textarea
                      placeholder="Conte um pouco sobre você e sua abordagem terapêutica..."
                      className="rounded-xl bg-card/50 border-border/50 min-h-[200px]"
                      disabled={!isEditing}
                      defaultValue="Sou psicólogo clínico com mais de 10 anos de experiência em atendimento individual e de casais. Minha abordagem é baseada na Terapia Cognitivo-Comportamental, com foco em ajudar meus pacientes a desenvolverem habilidades para lidar com desafios emocionais e comportamentais."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Áreas de Atuação</Label>
                    <Textarea
                      placeholder="Descreva suas principais áreas de atuação..."
                      className="rounded-xl bg-card/50 border-border/50 min-h-[150px]"
                      disabled={!isEditing}
                      defaultValue={"- Ansiedade e Transtornos de Ansiedade\n- Depressão\n- Relacionamentos e Terapia de Casal\n- Desenvolvimento Pessoal\n- Gestão de Estresse"}
                    />
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
