"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type MoedaInputProps = Omit<React.ComponentPropsWithoutRef<"input">, "value" | "onChange" | "type"> & {
  /** Valor em formato decimal com ponto (ex: "900.00") ou vazio. */
  value: string
  /** Devolve o valor em formato decimal com ponto (ex: "900" ou ""). */
  onValueChange: (valor: string) => void
  /** Teto do valor; se ultrapassar, corrige automático para o máximo. */
  max?: number
}

/**
 * Campo de dinheiro no padrão brasileiro. A digitação constrói o valor a partir
 * dos centavos: 4 -> 0,04 ; 40 -> 0,40 ; 400 -> 4,00 ; 40000 -> 400,00.
 * Sempre exibe com vírgula. Reutilizável em qualquer campo de valor.
 */
export function MoedaInput({ value, onValueChange, max, placeholder, ...props }: MoedaInputProps) {
  const display = value === "" || value == null ? "" : formatBRL(Number(value))

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 12)
    if (digits === "") {
      onValueChange("")
      return
    }
    let n = parseInt(digits, 10) / 100
    if (max != null && n > max) n = max
    onValueChange(String(n))
  }

  return (
    <Input
      {...props}
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={placeholder ?? "0,00"}
    />
  )
}
