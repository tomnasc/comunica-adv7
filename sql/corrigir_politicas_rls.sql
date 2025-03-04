-- Script para corrigir as políticas RLS para visualização de usuários
-- Este script garante que administradores possam ver todos os usuários

-- Desativar temporariamente o RLS para garantir acesso
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para garantir consistência
DROP POLICY IF EXISTS "Permitir leitura pelos próprios usuários" ON public.users;
DROP POLICY IF EXISTS "Permitir atualização pelos próprios usuários" ON public.users;
DROP POLICY IF EXISTS "Permitir administradores gerenciarem usuários" ON public.users;
DROP POLICY IF EXISTS "Permitir administradores lerem todos os usuários" ON public.users;

-- Criar função para verificar se o usuário é administrador
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Criar política para permitir que administradores leiam todos os usuários
CREATE POLICY "Permitir administradores lerem todos os usuários"
ON public.users
FOR SELECT
USING (
  auth.is_admin()
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
  auth.is_admin()
);

-- Reativar o RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Verificar se as políticas existem e estão ativas
DO $$
BEGIN
  RAISE NOTICE 'Políticas RLS corrigidas para visualização de usuários';
END
$$; 