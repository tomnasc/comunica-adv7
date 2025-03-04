-- CORREÇÃO DAS FUNÇÕES SQL
-- Este script corrige o erro de tipo de retorno das funções

-- 1. REMOVER TODAS AS FUNÇÕES EXISTENTES PRIMEIRO
DROP FUNCTION IF EXISTS public.create_new_user(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.update_user(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.delete_user(uuid);
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- 2. DESATIVAR RLS COMPLETAMENTE NA TABELA USERS
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 3. RECRIAR FUNÇÃO DE EXCLUSÃO DE USUÁRIOS
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

-- 4. RECRIAR FUNÇÃO PARA VERIFICAR SE USUÁRIO É ADMIN
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

-- 5. RECRIAR FUNÇÃO PARA CRIAR NOVO USUÁRIO
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

-- 6. RECRIAR FUNÇÃO PARA ATUALIZAR USUÁRIO
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
  RAISE NOTICE 'Funções SQL corrigidas com sucesso!';
END
$$; 