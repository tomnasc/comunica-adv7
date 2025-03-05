-- Criar função para criar bucket de storage
CREATE OR REPLACE FUNCTION create_storage_bucket(bucket_name TEXT, is_public BOOLEAN DEFAULT false)
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
        INSERT INTO storage.buckets (id, name, public)
        VALUES (bucket_name, bucket_name, is_public);
        
        RAISE NOTICE 'Bucket "%" criado com sucesso.', bucket_name;
    ELSE
        RAISE NOTICE 'Bucket "%" já existe.', bucket_name;
    END IF;
END;
$$;

-- Conceder permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION create_storage_bucket TO authenticated; 