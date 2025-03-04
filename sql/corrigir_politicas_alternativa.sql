-- Script alternativo para corrigir o problema de acesso ao dashboard
-- Desativa o RLS na tabela users temporariamente para permitir acesso ao dashboard

-- Desativar RLS na tabela users
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Uma alternativa é criar uma política que permite acesso a todos (menos restritiva)
-- DROP POLICY IF EXISTS "Permitir acesso a todos os usuários" ON public.users;
-- CREATE POLICY "Permitir acesso a todos os usuários" ON public.users USING (true);

-- Mensagem de confirmação
DO $$
BEGIN
  RAISE NOTICE 'RLS desativado na tabela users para permitir acesso ao dashboard';
END
$$; 