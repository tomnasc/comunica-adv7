-- Script para inserir um culto e verificar se ele aparece na consulta

-- 1. Inserir um culto de teste
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

-- 2. Verificar se o culto foi inserido corretamente
SELECT id, date, type, time, deadline, status
FROM service_schedules
WHERE date >= CURRENT_DATE
ORDER BY date ASC;

-- 3. Testar a função get_regular_services
SELECT * FROM get_regular_services();

-- 4. Verificar se há alguma política de RLS que possa estar bloqueando a visualização
SELECT *
FROM pg_policies
WHERE tablename = 'service_schedules';

-- 5. Criar uma política de RLS para permitir a visualização de todos os cultos
DO $$
BEGIN
    -- Verificar se a política já existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'service_schedules' AND policyname = 'enable_select_for_all_users'
    ) THEN
        -- Criar a política
        CREATE POLICY enable_select_for_all_users ON service_schedules
            FOR SELECT
            USING (true);
        
        -- Garantir que RLS está habilitado na tabela
        ALTER TABLE service_schedules ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Política de RLS para SELECT criada com sucesso.';
    ELSE
        RAISE NOTICE 'A política de RLS para SELECT já existe.';
    END IF;
END
$$;

-- 6. Verificar novamente as políticas de RLS
SELECT *
FROM pg_policies
WHERE tablename = 'service_schedules';

-- 7. Testar novamente a função get_regular_services
SELECT * FROM get_regular_services(); 