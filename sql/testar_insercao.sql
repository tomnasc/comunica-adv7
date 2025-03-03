-- Script para testar a inserção de um culto diretamente na tabela
-- Primeiro, vamos verificar o nome correto da tabela
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'service_schedule%';

-- Agora, vamos tentar inserir um culto de teste
INSERT INTO service_schedules (
  date, 
  type, 
  time, 
  deadline, 
  status
)
VALUES (
  CURRENT_DATE + INTERVAL '7 days', -- Data do culto (próxima semana)
  'sunday',                         -- Tipo do culto
  '09:00:00',                       -- Horário do culto
  (CURRENT_DATE + INTERVAL '6 days' + INTERVAL '18 hours')::TIMESTAMP WITH TIME ZONE, -- Deadline como timestamp
  'open'                            -- Status
)
RETURNING *;

-- Alternativamente, vamos testar usando a função add_manual_service
SELECT add_manual_service(
  (CURRENT_DATE + INTERVAL '14 days')::date, -- Data do culto (daqui a duas semanas)
  'wednesday',                               -- Tipo do culto
  '19:30:00',                                -- Horário do culto
  ((CURRENT_DATE + INTERVAL '13 days' + INTERVAL '18 hours')::TIMESTAMP WITH TIME ZONE), -- Prazo para envio como timestamp
  'open'                                     -- Status
); 