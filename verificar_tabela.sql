-- Verificar se a tabela existe e seu nome correto
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'service_schedule%';

-- Verificar a estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'service_schedules'
ORDER BY ordinal_position;

-- Verificar as políticas de segurança (RLS) na tabela
SELECT *
FROM pg_policies
WHERE tablename = 'service_schedules';

-- Verificar permissões na tabela
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'service_schedules'
AND table_schema = 'public';

-- Verificar se há triggers na tabela
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'service_schedules'
AND event_object_schema = 'public';

-- Contar registros na tabela
SELECT COUNT(*) FROM service_schedules;
