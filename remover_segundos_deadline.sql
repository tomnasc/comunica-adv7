-- Script SQL corrigido para remover segundos dos deadlines no Supabase
-- Atualizar todos os deadlines para remover os segundos
UPDATE service_schedules
SET deadline = date_trunc('minute', deadline)
WHERE deadline IS NOT NULL;

-- Verificar se existem deadlines com segundos após a atualização
SELECT id, deadline, EXTRACT(SECOND FROM deadline) as segundos
FROM service_schedules
WHERE deadline IS NOT NULL AND EXTRACT(SECOND FROM deadline) > 0;

-- Verificar quantos registros foram atualizados
SELECT COUNT(*) as total_registros FROM service_schedules WHERE deadline IS NOT NULL;

-- Verificar o formato dos deadlines após a atualização
SELECT id, deadline, to_char(deadline, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as formato_texto
FROM service_schedules
WHERE deadline IS NOT NULL
LIMIT 10;
