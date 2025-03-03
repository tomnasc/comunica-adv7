-- Verificar se a extensão uuid-ossp está instalada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar a tabela service_schedule para armazenar os cultos regulares
CREATE TABLE IF NOT EXISTS service_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sunday', 'wednesday', 'saturday')),
  time TIME NOT NULL,
  deadline TIME NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar comentários à tabela e colunas
COMMENT ON TABLE service_schedule IS 'Tabela para armazenar os cultos regulares';
COMMENT ON COLUMN service_schedule.id IS 'Identificador único do culto';
COMMENT ON COLUMN service_schedule.date IS 'Data do culto';
COMMENT ON COLUMN service_schedule.type IS 'Tipo do culto (domingo, quarta-feira, sábado)';
COMMENT ON COLUMN service_schedule.time IS 'Horário do culto';
COMMENT ON COLUMN service_schedule.deadline IS 'Prazo para envio de conteúdo';
COMMENT ON COLUMN service_schedule.status IS 'Status do culto (aberto ou fechado)';

-- Criar trigger para atualizar o timestamp de updated_at (se não existir)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verificar se o trigger já existe antes de criá-lo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_timestamp' 
    AND tgrelid = 'service_schedule'::regclass
  ) THEN
    CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON service_schedule
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  END IF;
END
$$;

-- Criar políticas de segurança para a tabela
ALTER TABLE service_schedule ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar erros de duplicação
DROP POLICY IF EXISTS "Usuários autenticados podem ver todos os cultos" ON service_schedule;
DROP POLICY IF EXISTS "Apenas administradores podem gerenciar cultos" ON service_schedule;

-- Política para permitir que usuários autenticados vejam todos os cultos
CREATE POLICY "Usuários autenticados podem ver todos os cultos"
  ON service_schedule FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir que apenas administradores possam inserir, atualizar ou excluir cultos
CREATE POLICY "Apenas administradores podem gerenciar cultos"
  ON service_schedule FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Conceder permissões na tabela
GRANT SELECT ON service_schedule TO authenticated;
GRANT INSERT, UPDATE, DELETE ON service_schedule TO authenticated;

-- Função para gerenciar automaticamente os cultos regulares
CREATE OR REPLACE FUNCTION auto_manage_services()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sunday_time TIME := '09:00:00';
  wednesday_time TIME := '19:30:00';
  saturday_time TIME := '19:30:00';
  sunday_deadline TIME := '08:00:00';
  wednesday_deadline TIME := '18:00:00';
  saturday_deadline TIME := '18:00:00';
  last_sunday DATE;
  last_wednesday DATE;
  last_saturday DATE;
  next_date DATE;
  current_date_time TIMESTAMP;
BEGIN
  -- Obter a data/hora atual
  current_date_time := NOW() AT TIME ZONE 'America/Sao_Paulo';
  
  -- Marcar cultos passados como 'closed'
  UPDATE service_schedule
  SET status = 'closed'
  WHERE date < CURRENT_DATE
    AND status = 'open';
  
  -- Encontrar a data do último culto de domingo cadastrado
  SELECT MAX(date) INTO last_sunday
  FROM service_schedule
  WHERE type = 'sunday';
  
  -- Encontrar a data do último culto de quarta-feira cadastrado
  SELECT MAX(date) INTO last_wednesday
  FROM service_schedule
  WHERE type = 'wednesday';
  
  -- Encontrar a data do último culto de sábado cadastrado
  SELECT MAX(date) INTO last_saturday
  FROM service_schedule
  WHERE type = 'saturday';
  
  -- Se não houver cultos cadastrados, usar a data atual como base
  IF last_sunday IS NULL THEN
    last_sunday := CURRENT_DATE;
    -- Ajustar para o último domingo
    last_sunday := last_sunday - EXTRACT(DOW FROM last_sunday)::integer;
  END IF;
  
  IF last_wednesday IS NULL THEN
    last_wednesday := CURRENT_DATE;
    -- Ajustar para a última quarta-feira (DOW 3)
    last_wednesday := last_wednesday - MOD(EXTRACT(DOW FROM last_wednesday)::integer - 3 + 7, 7);
  END IF;
  
  IF last_saturday IS NULL THEN
    last_saturday := CURRENT_DATE;
    -- Ajustar para o último sábado (DOW 6)
    last_saturday := last_saturday - MOD(EXTRACT(DOW FROM last_saturday)::integer - 6 + 7, 7);
  END IF;
  
  -- Adicionar cultos de domingo para as próximas 8 semanas
  FOR i IN 1..8 LOOP
    next_date := last_sunday + (i * 7);
    
    -- Verificar se o culto já existe
    IF NOT EXISTS (
      SELECT 1 FROM service_schedule 
      WHERE date = next_date AND type = 'sunday'
    ) THEN
      INSERT INTO service_schedule (date, type, time, deadline, status)
      VALUES (next_date, 'sunday', sunday_time, sunday_deadline, 'open');
    END IF;
  END LOOP;
  
  -- Adicionar cultos de quarta-feira para as próximas 8 semanas
  FOR i IN 1..8 LOOP
    next_date := last_wednesday + (i * 7);
    
    -- Verificar se o culto já existe
    IF NOT EXISTS (
      SELECT 1 FROM service_schedule 
      WHERE date = next_date AND type = 'wednesday'
    ) THEN
      INSERT INTO service_schedule (date, type, time, deadline, status)
      VALUES (next_date, 'wednesday', wednesday_time, wednesday_deadline, 'open');
    END IF;
  END LOOP;
  
  -- Adicionar cultos de sábado para as próximas 8 semanas
  FOR i IN 1..8 LOOP
    next_date := last_saturday + (i * 7);
    
    -- Verificar se o culto já existe
    IF NOT EXISTS (
      SELECT 1 FROM service_schedule 
      WHERE date = next_date AND type = 'saturday'
    ) THEN
      INSERT INTO service_schedule (date, type, time, deadline, status)
      VALUES (next_date, 'saturday', saturday_time, saturday_deadline, 'open');
    END IF;
  END LOOP;
END;
$$;

-- Criar uma função que pode ser chamada via HTTP para executar o gerenciamento automático
CREATE OR REPLACE FUNCTION http_auto_manage_services()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Executar a função de gerenciamento automático
  PERFORM auto_manage_services();
  
  -- Retornar resultado
  SELECT json_build_object(
    'success', true,
    'message', 'Cultos regulares atualizados com sucesso',
    'timestamp', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Conceder permissão para usuários autenticados chamarem a função HTTP
GRANT EXECUTE ON FUNCTION http_auto_manage_services() TO authenticated;

-- Criar uma função que pode ser chamada via HTTP para obter os cultos regulares
CREATE OR REPLACE FUNCTION get_regular_services()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Obter os cultos regulares
  SELECT json_agg(s)
  INTO result
  FROM (
    SELECT *
    FROM service_schedule
    WHERE date >= CURRENT_DATE
    ORDER BY date ASC
    LIMIT 10
  ) s;
  
  -- Se não houver cultos, retornar um array vazio
  IF result IS NULL THEN
    result := '[]'::json;
  END IF;
  
  RETURN result;
END;
$$;

-- Conceder permissão para usuários anônimos chamarem a função HTTP
GRANT EXECUTE ON FUNCTION get_regular_services() TO anon;
GRANT EXECUTE ON FUNCTION get_regular_services() TO authenticated;

-- Criar uma função que pode ser chamada via HTTP para obter os cultos especiais
CREATE OR REPLACE FUNCTION get_special_services()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Obter os cultos especiais
  SELECT json_agg(s)
  INTO result
  FROM (
    SELECT *
    FROM special_services
    WHERE date >= CURRENT_DATE
    ORDER BY date ASC
    LIMIT 10
  ) s;
  
  -- Se não houver cultos, retornar um array vazio
  IF result IS NULL THEN
    result := '[]'::json;
  END IF;
  
  RETURN result;
END;
$$;

-- Conceder permissão para usuários anônimos chamarem a função HTTP
GRANT EXECUTE ON FUNCTION get_special_services() TO anon;
GRANT EXECUTE ON FUNCTION get_special_services() TO authenticated;

-- Executar a função para criar os primeiros cultos
SELECT auto_manage_services(); 