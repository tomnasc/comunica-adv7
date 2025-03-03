-- Script para configurar as políticas de RLS na tabela service_schedules

-- 1. Verificar se a tabela existe
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Verificar se a tabela existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'service_schedules'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'A tabela service_schedules existe.';
    ELSE
        RAISE NOTICE 'A tabela service_schedules não existe!';
        RETURN;
    END IF;
END
$$;

-- 2. Verificar as políticas de RLS existentes
SELECT *
FROM pg_policies
WHERE tablename = 'service_schedules';

-- 3. Habilitar RLS na tabela
ALTER TABLE service_schedules ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de RLS para permitir todas as operações para usuários autenticados
DO $$
BEGIN
    -- Política para SELECT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'service_schedules' AND policyname = 'enable_select_for_all_users'
    ) THEN
        CREATE POLICY enable_select_for_all_users ON service_schedules
            FOR SELECT
            USING (true);
        RAISE NOTICE 'Política de SELECT criada com sucesso.';
    ELSE
        RAISE NOTICE 'A política de SELECT já existe.';
    END IF;
    
    -- Política para INSERT
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'service_schedules' AND policyname = 'enable_insert_for_authenticated'
    ) THEN
        CREATE POLICY enable_insert_for_authenticated ON service_schedules
            FOR INSERT
            WITH CHECK (auth.role() = 'authenticated');
        RAISE NOTICE 'Política de INSERT criada com sucesso.';
    ELSE
        RAISE NOTICE 'A política de INSERT já existe.';
    END IF;
    
    -- Política para UPDATE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'service_schedules' AND policyname = 'enable_update_for_authenticated'
    ) THEN
        CREATE POLICY enable_update_for_authenticated ON service_schedules
            FOR UPDATE
            USING (auth.role() = 'authenticated');
        RAISE NOTICE 'Política de UPDATE criada com sucesso.';
    ELSE
        RAISE NOTICE 'A política de UPDATE já existe.';
    END IF;
    
    -- Política para DELETE
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'service_schedules' AND policyname = 'enable_delete_for_authenticated'
    ) THEN
        CREATE POLICY enable_delete_for_authenticated ON service_schedules
            FOR DELETE
            USING (auth.role() = 'authenticated');
        RAISE NOTICE 'Política de DELETE criada com sucesso.';
    ELSE
        RAISE NOTICE 'A política de DELETE já existe.';
    END IF;
END
$$;

-- 5. Verificar as políticas de RLS após a criação
SELECT *
FROM pg_policies
WHERE tablename = 'service_schedules';

-- 6. Testar a inserção de um culto
INSERT INTO service_schedules (
  date, 
  type, 
  time, 
  deadline, 
  status
)
VALUES (
  CURRENT_DATE + INTERVAL '14 days', -- Data do culto (duas semanas à frente)
  'wednesday',                       -- Tipo do culto
  '19:30:00',                        -- Horário do culto
  (CURRENT_DATE + INTERVAL '13 days' + INTERVAL '18 hours')::TIMESTAMP WITH TIME ZONE, -- Deadline como timestamp
  'open'                             -- Status
)
RETURNING *;

-- 7. Verificar se o culto foi inserido corretamente
SELECT id, date, type, time, deadline, status
FROM service_schedules
WHERE date >= CURRENT_DATE
ORDER BY date ASC; 