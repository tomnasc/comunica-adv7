-- Função para atualizar as configurações do bucket para permitir arquivos de áudio
CREATE OR REPLACE FUNCTION admin_update_bucket_mime_types()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bucket_id text;
BEGIN
  -- Desativar temporariamente RLS
  ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;
  ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
  
  -- Verificar se o bucket existe
  SELECT id INTO bucket_id FROM storage.buckets WHERE name = 'attachments';
  
  -- Se o bucket existir, atualizar as configurações
  IF bucket_id IS NOT NULL THEN
    UPDATE storage.buckets
    SET allowed_mime_types = array_cat(
      COALESCE(allowed_mime_types, '{}'::text[]),
      '{audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/x-m4a}'::text[]
    )
    WHERE name = 'attachments';
    
    RAISE NOTICE 'Bucket "attachments" atualizado com suporte para arquivos de áudio.';
  ELSE
    -- Se o bucket não existir, criar com as configurações corretas
    INSERT INTO storage.buckets (id, name, allowed_mime_types, file_size_limit, created_at, updated_at, owner, public)
    VALUES (
      gen_random_uuid(),
      'attachments',
      '{image/png,image/jpeg,image/jpg,image/gif,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/x-m4a}'::text[],
      52428800, -- 50MB
      now(),
      now(),
      NULL,
      FALSE
    );
    
    RAISE NOTICE 'Bucket "attachments" criado com suporte para arquivos de áudio.';
  END IF;
  
  -- Reativar RLS
  ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  
  -- Criar política de acesso para o bucket se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Acesso público para leitura de anexos'
  ) THEN
    CREATE POLICY "Acesso público para leitura de anexos"
    ON storage.objects FOR SELECT
    USING (bucket_id = (SELECT id FROM storage.buckets WHERE name = 'attachments'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Usuários autenticados podem fazer upload'
  ) THEN
    CREATE POLICY "Usuários autenticados podem fazer upload"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = (SELECT id FROM storage.buckets WHERE name = 'attachments'));
  END IF;
  
  RAISE NOTICE 'Configuração do bucket "attachments" concluída com sucesso.';
END;
$$;

-- Executar a função
SELECT admin_update_bucket_mime_types();

-- Remover a função após a execução (opcional)
-- DROP FUNCTION admin_update_bucket_mime_types(); 