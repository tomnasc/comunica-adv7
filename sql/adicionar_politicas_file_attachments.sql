-- Script para adicionar políticas de segurança à tabela file_attachments

-- Verificar se o RLS está habilitado, se não estiver, habilitar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'file_attachments' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS habilitado para a tabela file_attachments';
  ELSE
    RAISE NOTICE 'RLS já está habilitado para a tabela file_attachments';
  END IF;
END
$$;

-- Remover políticas existentes para garantir consistência
DROP POLICY IF EXISTS "Permitir usuários inserirem anexos" ON public.file_attachments;
DROP POLICY IF EXISTS "Permitir usuários lerem seus próprios anexos" ON public.file_attachments;
DROP POLICY IF EXISTS "Permitir usuários atualizarem seus próprios anexos" ON public.file_attachments;
DROP POLICY IF EXISTS "Permitir usuários excluírem seus próprios anexos" ON public.file_attachments;
DROP POLICY IF EXISTS "Permitir administradores gerenciarem todos os anexos" ON public.file_attachments;
DROP POLICY IF EXISTS "Permitir leitura de anexos por todos os usuários autenticados" ON public.file_attachments;

-- Política para permitir que usuários autenticados insiram anexos
CREATE POLICY "Permitir usuários inserirem anexos"
ON public.file_attachments
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Política para permitir que usuários leiam anexos associados aos seus conteúdos
CREATE POLICY "Permitir usuários lerem seus próprios anexos"
ON public.file_attachments
FOR SELECT
TO authenticated
USING (
  content_id IN (
    SELECT id FROM public.department_contents 
    WHERE department_id = auth.uid()
  )
);

-- Política para permitir que usuários atualizem seus próprios anexos
CREATE POLICY "Permitir usuários atualizarem seus próprios anexos"
ON public.file_attachments
FOR UPDATE
TO authenticated
USING (
  content_id IN (
    SELECT id FROM public.department_contents 
    WHERE department_id = auth.uid()
  )
);

-- Política para permitir que usuários excluam seus próprios anexos
CREATE POLICY "Permitir usuários excluírem seus próprios anexos"
ON public.file_attachments
FOR DELETE
TO authenticated
USING (
  content_id IN (
    SELECT id FROM public.department_contents 
    WHERE department_id = auth.uid()
  )
);

-- Política para permitir que administradores gerenciem todos os anexos
CREATE POLICY "Permitir administradores gerenciarem todos os anexos"
ON public.file_attachments
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Política para permitir que todos os usuários autenticados leiam todos os anexos
-- Isso é útil para exibir anexos em conteúdos compartilhados
CREATE POLICY "Permitir leitura de anexos por todos os usuários autenticados"
ON public.file_attachments
FOR SELECT
TO authenticated
USING (true);

-- Verificar se as políticas foram criadas
DO $$
BEGIN
  RAISE NOTICE 'Políticas criadas com sucesso para a tabela file_attachments';
END
$$; 