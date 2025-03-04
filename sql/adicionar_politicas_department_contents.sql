-- Script para adicionar políticas de segurança à tabela department_contents

-- Verificar se o RLS está habilitado, se não estiver, habilitar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'department_contents' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.department_contents ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS habilitado para a tabela department_contents';
  ELSE
    RAISE NOTICE 'RLS já está habilitado para a tabela department_contents';
  END IF;
END
$$;

-- Remover políticas existentes para garantir consistência
DROP POLICY IF EXISTS "Permitir usuários inserirem conteúdos" ON public.department_contents;
DROP POLICY IF EXISTS "Permitir usuários lerem seus próprios conteúdos" ON public.department_contents;
DROP POLICY IF EXISTS "Permitir usuários atualizarem seus próprios conteúdos" ON public.department_contents;
DROP POLICY IF EXISTS "Permitir usuários excluírem seus próprios conteúdos" ON public.department_contents;
DROP POLICY IF EXISTS "Permitir administradores gerenciarem todos os conteúdos" ON public.department_contents;
DROP POLICY IF EXISTS "Permitir leitura de conteúdos por todos os usuários autenticados" ON public.department_contents;

-- Política para permitir que usuários autenticados insiram conteúdos
CREATE POLICY "Permitir usuários inserirem conteúdos"
ON public.department_contents
FOR INSERT
TO authenticated
WITH CHECK (department_id = auth.uid() OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- Política para permitir que usuários leiam seus próprios conteúdos
CREATE POLICY "Permitir usuários lerem seus próprios conteúdos"
ON public.department_contents
FOR SELECT
TO authenticated
USING (department_id = auth.uid());

-- Política para permitir que usuários atualizem seus próprios conteúdos
CREATE POLICY "Permitir usuários atualizarem seus próprios conteúdos"
ON public.department_contents
FOR UPDATE
TO authenticated
USING (department_id = auth.uid());

-- Política para permitir que usuários excluam seus próprios conteúdos
CREATE POLICY "Permitir usuários excluírem seus próprios conteúdos"
ON public.department_contents
FOR DELETE
TO authenticated
USING (department_id = auth.uid());

-- Política para permitir que administradores gerenciem todos os conteúdos
CREATE POLICY "Permitir administradores gerenciarem todos os conteúdos"
ON public.department_contents
FOR ALL
TO authenticated
USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- Política para permitir que todos os usuários autenticados leiam todos os conteúdos
-- Isso é útil para exibir conteúdos compartilhados
CREATE POLICY "Permitir leitura de conteúdos por todos os usuários autenticados"
ON public.department_contents
FOR SELECT
TO authenticated
USING (true);

-- Verificar se as políticas foram criadas
DO $$
BEGIN
  RAISE NOTICE 'Políticas criadas com sucesso para a tabela department_contents';
END
$$; 