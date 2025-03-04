-- Script para corrigir o problema de referência circular nas políticas RLS
-- O problema está ocorrendo porque estamos tentando selecionar da tabela users dentro da política da própria tabela users

-- Remover as políticas existentes
DROP POLICY IF EXISTS "Permitir administradores lerem todos os usuários" ON public.users;
DROP POLICY IF EXISTS "Permitir administradores gerenciarem usuários" ON public.users;

-- Verificar se existe uma função para verificar se o usuário é administrador
DROP FUNCTION IF EXISTS auth.is_admin();

-- Criar função para verificar se o usuário é administrador sem depender da tabela users
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  -- Usar uma CTE para evitar referências circulares
  WITH user_role AS (
    SELECT role FROM users WHERE id = auth.uid()
  )
  SELECT EXISTS (SELECT 1 FROM user_role WHERE role = 'admin');
$$;

-- Criar política para permitir que administradores leiam todos os usuários
CREATE POLICY "Permitir administradores lerem todos os usuários"
ON public.users
FOR SELECT
USING (
  auth.is_admin()
);

-- Criar política para permitir que administradores gerenciem usuários
CREATE POLICY "Permitir administradores gerenciarem usuários"
ON public.users
FOR ALL
USING (
  auth.is_admin()
);

-- Verificar se as políticas foram criadas corretamente
DO $$
BEGIN
  RAISE NOTICE 'Políticas RLS corrigidas para evitar referência circular';
END
$$; 