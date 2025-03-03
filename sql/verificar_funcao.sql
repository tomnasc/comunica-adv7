-- Script para verificar a definição exata da função add_manual_service

-- Verificar as funções com nome add_manual_service
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
    AND p.proname = 'add_manual_service';

-- Verificar os tipos de dados das colunas na tabela service_schedules
SELECT 
    column_name, 
    data_type, 
    udt_name,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
    AND table_name = 'service_schedules'
ORDER BY 
    ordinal_position;

-- Verificar se a função foi criada corretamente
\df add_manual_service 