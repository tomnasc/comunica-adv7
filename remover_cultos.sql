-- Script SQL para remover todos os cultos regulares do banco de dados
-- ATENÇÃO: Este script irá remover TODOS os cultos regulares do banco de dados!

-- Primeiro, verificar quantos registros existem e seus IDs
SELECT COUNT(*) as total_cultos_regulares FROM service_schedules;
SELECT id, type, date, status FROM service_schedules LIMIT 10;

-- Verificar se existem restrições de chave estrangeira que possam impedir a exclusão
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name='service_schedules';

-- Remover todos os cultos regulares com RETURNING para ver o que foi excluído
DELETE FROM service_schedules RETURNING id, type, date;

-- Verificar se a remoção foi bem-sucedida
SELECT COUNT(*) as cultos_restantes FROM service_schedules;

-- Se ainda houver registros, tentar uma abordagem mais direta com TRUNCATE
-- TRUNCATE TABLE service_schedules;

-- Verificar novamente
-- SELECT COUNT(*) as cultos_restantes_apos_truncate FROM service_schedules;
