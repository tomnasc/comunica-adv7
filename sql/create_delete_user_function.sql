-- Função para excluir um usuário completamente do sistema
-- Esta função exclui o usuário tanto da tabela public.users quanto da tabela auth.users

-- Cria ou substitui a função existente
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
  -- Verifica se o usuário existe na tabela public.users
  SELECT * INTO v_user FROM public.users WHERE id = target_user_id;
  
  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'Usuário não encontrado';
  END IF;
  
  -- Excluir da tabela public.users primeiro
  DELETE FROM public.users WHERE id = target_user_id;
  
  -- Verificar se a exclusão foi bem-sucedida
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Agora excluir da tabela auth.users usando o cliente administrativo
  -- Isso não é possível diretamente via SQL; será feito na parte do cliente
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao excluir usuário: %', SQLERRM;
    RETURN FALSE;
END;
$$; 