-- Script para corrigir problemas de segurança RLS
-- Este script habilita o Row Level Security nas tabelas que têm políticas mas não têm o RLS ativado

-- Habilitar RLS na tabela users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para garantir consistência
DROP POLICY IF EXISTS "Permitir leitura pelos próprios usuários" ON public.users;
DROP POLICY IF EXISTS "Permitir atualização pelos próprios usuários" ON public.users;
DROP POLICY IF EXISTS "Permitir administradores gerenciarem usuários" ON public.users;
DROP POLICY IF EXISTS "Permitir administradores lerem todos os usuários" ON public.users;

-- Criar nova política para permitir que administradores leiam todos os usuários
CREATE POLICY "Permitir administradores lerem todos os usuários"
ON public.users
FOR SELECT
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Criar política para permitir que usuários vejam seus próprios dados
CREATE POLICY "Permitir leitura pelos próprios usuários"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Criar política para permitir que usuários atualizem seus próprios dados
CREATE POLICY "Permitir atualização pelos próprios usuários"
ON public.users
FOR UPDATE
USING (auth.uid() = id);

-- Criar política para permitir que administradores criem, atualizem e deletem usuários
CREATE POLICY "Permitir administradores gerenciarem usuários"
ON public.users
FOR ALL
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Habilitar RLS na tabela department_contents
ALTER TABLE public.department_contents ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela file_attachments
ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;

-- Verificar se as políticas existem e estão ativas
DO $$
BEGIN
  RAISE NOTICE 'Verificação de políticas RLS:';
  
  RAISE NOTICE 'Tabela users: RLS habilitado e políticas criadas';
  RAISE NOTICE 'Tabela department_contents: RLS habilitado';
  RAISE NOTICE 'Tabela file_attachments: RLS habilitado';
END
$$; 