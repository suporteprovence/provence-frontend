-- Provence — alinha o valor máximo da consulta para R$ 1.000,00
-- (a plataforma estava com 500 na config, mas o cadastro usa 1000; unifica em 1000).
-- Rodar uma vez no phpMyAdmin (banco u218657465_PROVENCE).

UPDATE configuracoes_sistema SET valor = '1000.00' WHERE chave = 'valor_maximo_consulta';

-- Garante o mínimo em 50 (caso não exista, ignore o resultado)
UPDATE configuracoes_sistema SET valor = '50.00' WHERE chave = 'valor_minimo_consulta';
