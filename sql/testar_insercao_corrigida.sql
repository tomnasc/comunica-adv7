-- Script para testar a inserção de um culto usando a função add_manual_service corrigida

-- Primeiro, vamos verificar a estrutura da tabela service_schedules
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'service_schedules'
ORDER BY ordinal_position;

-- Agora, vamos testar a inserção de um culto usando a função add_manual_service
-- Método 1: Usando conversões explícitas de tipo para cada parâmetro
SELECT add_manual_service(
  (CURRENT_DATE + INTERVAL '7 days')::DATE,                -- Data do culto (próxima semana)
  'sunday'::TEXT,                                          -- Tipo do culto
  '09:00:00'::TIME,                                        -- Horário do culto
  (CURRENT_DATE + INTERVAL '6 days' + INTERVAL '18 hours')::TIMESTAMP WITH TIME ZONE, -- Deadline (18:00 do dia anterior)
  'open'::TEXT                                             -- Status
);

-- Método 2: Construindo o timestamp a partir da data e hora com conversões explícitas
DO $$
DECLARE
  culto_data DATE := (CURRENT_DATE + INTERVAL '14 days')::DATE;
  culto_deadline TIMESTAMP WITH TIME ZONE;
  novo_id UUID;
BEGIN
  -- Criar o timestamp para o deadline (18:00 do dia anterior ao culto)
  culto_deadline := ((culto_data - INTERVAL '1 day')::DATE + TIME '18:00:00')::TIMESTAMP WITH TIME ZONE;
  
  -- Chamar a função para adicionar o culto com conversões explícitas
  SELECT add_manual_service(
    culto_data,                 -- Data do culto
    'wednesday'::TEXT,          -- Tipo do culto
    '19:30:00'::TIME,           -- Horário do culto
    culto_deadline,             -- Deadline como timestamp
    'open'::TEXT                -- Status
  ) INTO novo_id;
  
  -- Exibir o ID do novo culto
  RAISE NOTICE 'Novo culto criado com ID: %', novo_id;
END $$;

-- Verificar se os cultos foram inseridos corretamente
SELECT id, date, type, time, deadline, status
FROM service_schedules
WHERE date > CURRENT_DATE
ORDER BY date DESC
LIMIT 5; 