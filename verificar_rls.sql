-- Script para verificar e corrigir as políticas de RLS na tabela service_schedules

-- Verificar se a tabela tem RLS ativado
SELECT relname as table_name, relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'service_schedules';

-- Verificar as políticas de RLS existentes
SELECT *
FROM pg_policies
WHERE tablename = 'service_schedules';

-- Verificar permissões na tabela
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'service_schedules'
AND table_schema = 'public';

-- Verificar se o usuário autenticado tem permissão para inserir
DO $$
BEGIN
  -- Verificar se existe uma política para INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_schedules' 
    AND cmd = 'INSERT'
  ) THEN
    RAISE NOTICE 'Não existe política para INSERT na tabela service_schedules';
    
    -- Criar uma política para permitir INSERT para usuários autenticados
    EXECUTE 'CREATE POLICY service_schedules_insert_policy ON service_schedules 
             FOR INSERT 
             TO authenticated 
             WITH CHECK (true)';
             
    RAISE NOTICE 'Política de INSERT criada para usuários autenticados';
  ELSE
    RAISE NOTICE 'Já existe uma política para INSERT na tabela service_schedules';
  END IF;
  
  -- Verificar se existe uma política para SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_schedules' 
    AND cmd = 'SELECT'
  ) THEN
    RAISE NOTICE 'Não existe política para SELECT na tabela service_schedules';
    
    -- Criar uma política para permitir SELECT para usuários autenticados
    EXECUTE 'CREATE POLICY service_schedules_select_policy ON service_schedules 
             FOR SELECT 
             TO authenticated 
             USING (true)';
             
    RAISE NOTICE 'Política de SELECT criada para usuários autenticados';
  ELSE
    RAISE NOTICE 'Já existe uma política para SELECT na tabela service_schedules';
  END IF;
  
  -- Verificar se existe uma política para UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_schedules' 
    AND cmd = 'UPDATE'
  ) THEN
    RAISE NOTICE 'Não existe política para UPDATE na tabela service_schedules';
    
    -- Criar uma política para permitir UPDATE para usuários autenticados
    EXECUTE 'CREATE POLICY service_schedules_update_policy ON service_schedules 
             FOR UPDATE 
             TO authenticated 
             USING (true)';
             
    RAISE NOTICE 'Política de UPDATE criada para usuários autenticados';
  ELSE
    RAISE NOTICE 'Já existe uma política para UPDATE na tabela service_schedules';
  END IF;
  
  -- Verificar se existe uma política para DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_schedules' 
    AND cmd = 'DELETE'
  ) THEN
    RAISE NOTICE 'Não existe política para DELETE na tabela service_schedules';
    
    -- Criar uma política para permitir DELETE para usuários autenticados
    EXECUTE 'CREATE POLICY service_schedules_delete_policy ON service_schedules 
             FOR DELETE 
             TO authenticated 
             USING (true)';
             
    RAISE NOTICE 'Política de DELETE criada para usuários autenticados';
  ELSE
    RAISE NOTICE 'Já existe uma política para DELETE na tabela service_schedules';
  END IF;
  
  -- Garantir que RLS está ativado na tabela
  EXECUTE 'ALTER TABLE service_schedules ENABLE ROW LEVEL SECURITY';
  
  RAISE NOTICE 'RLS está ativado na tabela service_schedules';
END $$;

-- Verificar novamente as políticas após as possíveis correções
SELECT *
FROM pg_policies
WHERE tablename = 'service_schedules'; 