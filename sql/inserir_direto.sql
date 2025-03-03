-- Script para inserir um culto diretamente na tabela service_schedules

-- Verificar a estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'service_schedules'
ORDER BY ordinal_position;

-- Inserir um culto diretamente na tabela
INSERT INTO service_schedules (
  date, 
  type, 
  time, 
  deadline, 
  status
)
VALUES (
  (CURRENT_DATE + INTERVAL '7 days')::DATE,  -- Data do culto (próxima semana)
  'sunday',                                  -- Tipo do culto
  '09:00:00'::TIME,                          -- Horário do culto
  (CURRENT_DATE + INTERVAL '6 days' + INTERVAL '18 hours')::TIMESTAMP WITH TIME ZONE, -- Deadline (18:00 do dia anterior)
  'open'                                     -- Status
)
RETURNING *;

-- Verificar se o culto foi inserido corretamente
SELECT id, date, type, time, deadline, status
FROM service_schedules
WHERE date > CURRENT_DATE
ORDER BY date DESC
LIMIT 5; 