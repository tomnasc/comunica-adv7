-- Criar função para criar bucket de storage com privilégios de administrador
CREATE OR REPLACE FUNCTION admin_create_bucket(bucket_name TEXT, is_public BOOLEAN DEFAULT false)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com as permissões do criador da função
AS $$
DECLARE
    bucket_exists BOOLEAN;
BEGIN
    -- Verificar se o usuário é administrador
    IF NOT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Apenas administradores podem criar buckets';
    END IF;

    -- Verificar se o bucket já existe
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets WHERE name = bucket_name
    ) INTO bucket_exists;

    -- Criar o bucket se não existir
    IF NOT bucket_exists THEN
        -- Desabilitar temporariamente RLS
        ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;
        
        -- Inserir o bucket
        INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
        VALUES (
            bucket_name, 
            bucket_name, 
            is_public, 
            false, 
            52428800, -- 50MB
            '{image/png,image/jpeg,image/jpg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain}'
        );
        
        -- Reabilitar RLS
        ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
        
        -- Desabilitar temporariamente RLS para objetos
        ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
        
        -- Criar políticas de acesso
        -- Política para permitir leitura pública
        DROP POLICY IF EXISTS "Permitir leitura pública" ON storage.objects;
        CREATE POLICY "Permitir leitura pública" 
        ON storage.objects FOR SELECT 
        USING (bucket_id = bucket_name);

        -- Política para permitir upload por usuários autenticados
        DROP POLICY IF EXISTS "Permitir upload por usuários autenticados" ON storage.objects;
        CREATE POLICY "Permitir upload por usuários autenticados" 
        ON storage.objects FOR INSERT 
        TO authenticated 
        WITH CHECK (bucket_id = bucket_name);

        -- Política para permitir atualização por usuários autenticados que criaram o objeto
        DROP POLICY IF EXISTS "Permitir atualização por criadores" ON storage.objects;
        CREATE POLICY "Permitir atualização por criadores" 
        ON storage.objects FOR UPDATE 
        TO authenticated 
        USING (bucket_id = bucket_name AND auth.uid() = owner);

        -- Política para permitir exclusão por usuários autenticados que criaram o objeto
        DROP POLICY IF EXISTS "Permitir exclusão por criadores" ON storage.objects;
        CREATE POLICY "Permitir exclusão por criadores" 
        ON storage.objects FOR DELETE 
        TO authenticated 
        USING (bucket_id = bucket_name AND auth.uid() = owner);

        -- Política para permitir que administradores gerenciem todos os objetos
        DROP POLICY IF EXISTS "Permitir gerenciamento por administradores" ON storage.objects;
        CREATE POLICY "Permitir gerenciamento por administradores" 
        ON storage.objects FOR ALL
        TO authenticated 
        USING (
            bucket_id = bucket_name AND 
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
        
        -- Reabilitar RLS para objetos
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
        
        -- Criar arquivo de fallback
        PERFORM pg_sleep(1); -- Pequena pausa para garantir que as políticas sejam aplicadas
        
        RAISE NOTICE 'Bucket "%" criado com sucesso.', bucket_name;
    ELSE
        RAISE NOTICE 'Bucket "%" já existe.', bucket_name;
    END IF;
END;
$$;

-- Conceder permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION admin_create_bucket TO authenticated; 