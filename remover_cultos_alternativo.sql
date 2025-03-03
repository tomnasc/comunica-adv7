-- Script SQL alternativo para remover todos os cultos regulares do banco de dados
-- ATENÇÃO: Este script irá remover TODOS os cultos regulares do banco de dados!

-- Verificar as políticas RLS que podem estar protegendo a tabela
SELECT * FROM pg_policies WHERE tablename = 'service_schedules';

-- Desativar temporariamente RLS para esta operação (requer privilégios de superusuário)
-- ALTER TABLE service_schedules DISABLE ROW LEVEL SECURITY;

-- Método 1: DELETE direto com bypass de segurança
DELETE FROM "service_schedules";

-- Método 2: Se o método 1 não funcionar, tentar com uma transação explícita
BEGIN;
  -- Desativar triggers temporariamente se existirem
  -- ALTER TABLE service_schedules DISABLE TRIGGER ALL;
  
  -- Executar o DELETE
  DELETE FROM service_schedules;
  
  -- Reativar triggers
  -- ALTER TABLE service_schedules ENABLE TRIGGER ALL;
COMMIT;

-- Método 3: Se os métodos anteriores não funcionarem, tentar TRUNCATE
-- TRUNCATE TABLE service_schedules;

-- Verificar se a remoção foi bem-sucedida
SELECT COUNT(*) as cultos_restantes FROM service_schedules;

-- Reativar RLS se foi desativado
-- ALTER TABLE service_schedules ENABLE ROW LEVEL SECURITY; 