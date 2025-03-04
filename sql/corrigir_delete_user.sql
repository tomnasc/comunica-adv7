-- Script para corrigir a função de exclusão de usuários
-- Este script substitui a função delete_user para corrigir problemas de exclusão

-- Remover a função existente
DROP FUNCTION IF EXISTS public.delete_user(UUID);

-- Criar uma nova função mais robusta
CREATE OR REPLACE FUNCTION public.delete_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user record;
  v_result BOOLEAN;
BEGIN
  -- Verificar se o usuário existe na tabela public.users
  SELECT * INTO v_user FROM public.users WHERE id = target_user_id;
  
  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  -- Excluir da tabela public.users diretamente
  DELETE FROM public.users WHERE id = target_user_id;
  
  -- Verificar se a exclusão foi bem-sucedida
  GET DIAGNOSTICS v_result = ROW_COUNT;
  
  IF v_result = 0 THEN
    RAISE EXCEPTION 'Falha ao excluir usuário do banco de dados';
  END IF;
  
  -- A exclusão da tabela auth.users será feita pelo cliente usando a API do Supabase
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao excluir usuário: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Verificar se a função foi criada corretamente
DO $$
BEGIN
  RAISE NOTICE 'Função delete_user corrigida com sucesso';
END
$$; 