-- Script para verificar os cultos existentes no banco de dados

-- 1. Verificar a estrutura da tabela primeiro
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'service_schedules'
ORDER BY ordinal_position;

-- 2. Verificar todos os cultos na tabela (sem a coluna updated_at)
SELECT id, date, type, time, deadline, status, created_at
FROM service_schedules
ORDER BY date DESC;

-- 3. Verificar se existem cultos futuros
SELECT id, date, type, time, deadline, status
FROM service_schedules
WHERE date >= CURRENT_DATE
ORDER BY date ASC;

-- 4. Verificar as políticas de RLS na tabela
SELECT *
FROM pg_policies
WHERE tablename = 'service_schedules';

-- 5. Verificar se o usuário autenticado tem permissão para visualizar os cultos
-- Execute este comando como um usuário autenticado
SELECT auth.uid() as current_user_id;

-- 6. Verificar se há algum trigger na tabela que possa estar afetando a visualização
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'service_schedules'; 