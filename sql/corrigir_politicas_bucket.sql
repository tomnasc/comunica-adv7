-- Script para corrigir as políticas do bucket de anexos

-- Verificar se o bucket "attachments" existe e criar se não existir
DO $$
DECLARE
    bucket_exists BOOLEAN;
BEGIN
    -- Verificar se o bucket existe
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = 'attachments'
    ) INTO bucket_exists;

    -- Criar o bucket se não existir
    IF NOT bucket_exists THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('attachments', 'attachments', true);
        
        RAISE NOTICE 'Bucket "attachments" criado com sucesso.';
    ELSE
        RAISE NOTICE 'Bucket "attachments" já existe.';
    END IF;
END $$;

-- Remover políticas existentes para garantir consistência
DROP POLICY IF EXISTS "Permitir leitura pública de anexos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload de anexos por usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização de anexos por usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusão de anexos por usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir leitura pública" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload por usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização por criadores" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusão por criadores" ON storage.objects;
DROP POLICY IF EXISTS "Permitir gerenciamento por administradores" ON storage.objects;

-- Criar novas políticas com a sintaxe correta

-- Política para permitir leitura pública
CREATE POLICY "Permitir leitura pública" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'attachments');

-- Política para permitir upload por usuários autenticados
CREATE POLICY "Permitir upload por usuários autenticados" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'attachments');

-- Política para permitir atualização por usuários autenticados que criaram o objeto
CREATE POLICY "Permitir atualização por criadores" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'attachments' AND auth.uid() = owner);

-- Política para permitir exclusão por usuários autenticados que criaram o objeto
CREATE POLICY "Permitir exclusão por criadores" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'attachments' AND auth.uid() = owner);

-- Política para permitir que administradores gerenciem todos os objetos
CREATE POLICY "Permitir gerenciamento por administradores" 
ON storage.objects 
TO authenticated 
USING (
    bucket_id = 'attachments' AND 
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Verificar as políticas criadas
DO $$
BEGIN
    RAISE NOTICE 'Políticas de acesso para o bucket "attachments" configuradas com sucesso.';
END $$; 