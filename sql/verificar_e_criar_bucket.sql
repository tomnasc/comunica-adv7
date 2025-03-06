-- Script para verificar e criar o bucket "attachments" diretamente

-- Verificar se o bucket existe
SELECT name, owner, created_at, updated_at, public
FROM storage.buckets
WHERE name = 'attachments';

-- Remover o bucket se existir (para recriar do zero)
DROP POLICY IF EXISTS "Permitir leitura pública" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload por usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir atualização por criadores" ON storage.objects;
DROP POLICY IF EXISTS "Permitir exclusão por criadores" ON storage.objects;
DROP POLICY IF EXISTS "Permitir gerenciamento por administradores" ON storage.objects;

DELETE FROM storage.objects WHERE bucket_id = 'attachments';
DELETE FROM storage.buckets WHERE name = 'attachments';

-- Criar o bucket com configurações corretas
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('attachments', 'attachments', true, false, 52428800, '{image/png,image/jpeg,image/jpg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain}');

-- Criar políticas de acesso para o bucket
CREATE POLICY "Permitir leitura pública" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'attachments');

CREATE POLICY "Permitir upload por usuários autenticados" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Permitir atualização por criadores" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'attachments' AND auth.uid() = owner);

CREATE POLICY "Permitir exclusão por criadores" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'attachments' AND auth.uid() = owner);

CREATE POLICY "Permitir gerenciamento por administradores" 
ON storage.objects FOR ALL
TO authenticated 
USING (
    bucket_id = 'attachments' AND 
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Verificar se o bucket foi criado
SELECT name, owner, created_at, updated_at, public
FROM storage.buckets
WHERE name = 'attachments'; 