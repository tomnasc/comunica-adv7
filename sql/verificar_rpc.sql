-- Script para verificar a função RPC get_regular_services

-- 1. Verificar se a função existe
SELECT 
    p.proname AS nome_funcao,
    pg_get_function_arguments(p.oid) AS argumentos,
    pg_get_function_result(p.oid) AS tipo_retorno,
    p.prosrc AS definicao
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    n.nspname = 'public' 
    AND p.proname = 'get_regular_services';

-- 2. Se a função não existir, vamos criar uma
DO $$
BEGIN
    -- Verificar se a função existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_regular_services'
    ) THEN
        -- Criar a função
        CREATE OR REPLACE FUNCTION get_regular_services()
        RETURNS SETOF service_schedules
        LANGUAGE sql
        SECURITY DEFINER
        AS $$
            SELECT * FROM service_schedules
            ORDER BY date DESC;
        $$;
        
        -- Conceder permissão para usuários anônimos e autenticados
        GRANT EXECUTE ON FUNCTION get_regular_services() TO anon, authenticated;
        
        RAISE NOTICE 'Função get_regular_services criada com sucesso.';
    ELSE
        RAISE NOTICE 'A função get_regular_services já existe.';
    END IF;
END
$$;

-- 3. Testar a função
SELECT * FROM get_regular_services();

-- 4. Verificar as permissões da função
SELECT 
    p.proname AS function_name,
    r.rolname AS grantee,
    CASE WHEN has_function_privilege(r.oid, p.oid, 'EXECUTE') THEN 'EXECUTE' ELSE NULL END AS privilege
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    CROSS JOIN pg_roles r
WHERE 
    n.nspname = 'public' 
    AND p.proname = 'get_regular_services'
    AND r.rolname IN ('anon', 'authenticated')
ORDER BY 
    r.rolname; 