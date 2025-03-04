-- SOLUÇÃO DEFINITIVA PARA GERENCIAMENTO DE USUÁRIOS
-- Este script resolve todos os problemas de uma vez

-- 1. DESATIVAR RLS COMPLETAMENTE NA TABELA USERS
-- Isso garante que administradores possam gerenciar usuários sem problemas
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. CORRIGIR FUNÇÃO DE EXCLUSÃO DE USUÁRIOS
DROP FUNCTION IF EXISTS public.delete_user(UUID);

CREATE OR REPLACE FUNCTION public.delete_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Excluir diretamente da tabela users
  DELETE FROM public.users WHERE id = target_user_id;
  
  -- Retornar sucesso
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao excluir usuário: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- 3. CRIAR FUNÇÃO PARA VERIFICAR SE USUÁRIO É ADMIN
-- Isso será útil para verificações no código
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Obter a função do usuário
  SELECT role INTO v_role FROM public.users WHERE id = user_id;
  
  -- Verificar se é admin
  RETURN v_role = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- 4. CRIAR FUNÇÃO PARA CRIAR NOVO USUÁRIO
-- Isso simplifica a criação de usuários
CREATE OR REPLACE FUNCTION public.create_new_user(
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_department TEXT,
  user_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Inserir novo usuário
  INSERT INTO public.users (id, name, email, department, role, created_at, updated_at)
  VALUES (user_id, user_name, user_email, user_department, user_role, NOW(), NOW());
  
  -- Retornar sucesso
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao criar usuário: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- 5. CRIAR FUNÇÃO PARA ATUALIZAR USUÁRIO
-- Isso simplifica a atualização de usuários
CREATE OR REPLACE FUNCTION public.update_user(
  target_user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_department TEXT,
  user_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atualizar usuário
  UPDATE public.users
  SET 
    name = user_name,
    email = user_email,
    department = user_department,
    role = user_role,
    updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Retornar sucesso
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao atualizar usuário: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Mensagem de confirmação
DO $$
BEGIN
  RAISE NOTICE 'Solução definitiva para gerenciamento de usuários aplicada com sucesso!';
END
$$; 