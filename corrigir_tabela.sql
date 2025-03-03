-- Script para verificar e corrigir o nome da tabela no banco de dados

-- Primeiro, verificar se a tabela service_schedule (sem 's') existe
DO $$
DECLARE
  tabela_sem_s_existe BOOLEAN;
  tabela_com_s_existe BOOLEAN;
BEGIN
  -- Verificar se a tabela service_schedule (sem 's') existe
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'service_schedule'
  ) INTO tabela_sem_s_existe;
  
  -- Verificar se a tabela service_schedules (com 's') existe
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'service_schedules'
  ) INTO tabela_com_s_existe;
  
  -- Exibir resultado da verificação
  RAISE NOTICE 'Tabela service_schedule (sem s) existe: %', tabela_sem_s_existe;
  RAISE NOTICE 'Tabela service_schedules (com s) existe: %', tabela_com_s_existe;
  
  -- Se a tabela service_schedule (sem 's') existe e a tabela service_schedules (com 's') não existe
  IF tabela_sem_s_existe AND NOT tabela_com_s_existe THEN
    -- Renomear a tabela
    RAISE NOTICE 'Renomeando a tabela service_schedule para service_schedules...';
    EXECUTE 'ALTER TABLE service_schedule RENAME TO service_schedules';
    RAISE NOTICE 'Tabela renomeada com sucesso!';
  ELSIF tabela_sem_s_existe AND tabela_com_s_existe THEN
    -- Ambas as tabelas existem, situação inesperada
    RAISE NOTICE 'ATENÇÃO: Ambas as tabelas existem. Verificar manualmente!';
  ELSIF NOT tabela_sem_s_existe AND NOT tabela_com_s_existe THEN
    -- Nenhuma das tabelas existe
    RAISE NOTICE 'ATENÇÃO: Nenhuma das tabelas existe. É necessário criar a tabela!';
  ELSE
    -- A tabela service_schedules (com 's') já existe
    RAISE NOTICE 'A tabela service_schedules (com s) já existe. Nenhuma ação necessária.';
  END IF;
END $$;

-- Verificar novamente após a possível correção
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