-- Script para desativar a geração automática de cultos
-- Este script modifica a função auto_manage_services para não adicionar novos cultos

-- Criar uma nova versão da função auto_manage_services que apenas marca cultos passados como fechados
CREATE OR REPLACE FUNCTION auto_manage_services()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_date_time TIMESTAMP;
BEGIN
  -- Obter a data/hora atual
  current_date_time := NOW() AT TIME ZONE 'America/Sao_Paulo';
  
  -- Marcar cultos passados como 'closed'
  UPDATE service_schedules
  SET status = 'closed'
  WHERE date < CURRENT_DATE
    AND status = 'open';
    
  -- Log da operação
  RAISE NOTICE 'Função auto_manage_services executada em %. Apenas cultos passados foram marcados como fechados. A geração automática de novos cultos está desativada.', current_date_time;
END;
$$;

-- Comentário explicativo na função
COMMENT ON FUNCTION auto_manage_services() IS 'Função modificada para não gerar novos cultos automaticamente. Apenas marca cultos passados como fechados.';

-- Criar uma função para adicionar cultos manualmente
CREATE OR REPLACE FUNCTION add_manual_service(
  p_date DATE,
  p_type TEXT,
  p_time TIME,
  p_deadline TIMESTAMP WITH TIME ZONE,
  p_status TEXT DEFAULT 'open'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Validar o tipo
  IF p_type NOT IN ('sunday', 'wednesday', 'saturday') THEN
    RAISE EXCEPTION 'Tipo de culto inválido. Use sunday, wednesday ou saturday.';
  END IF;
  
  -- Validar o status
  IF p_status NOT IN ('open', 'closed') THEN
    RAISE EXCEPTION 'Status inválido. Use open ou closed.';
  END IF;
  
  -- Inserir o novo culto
  INSERT INTO service_schedules (date, type, time, deadline, status)
  VALUES (p_date, p_type, p_time, p_deadline, p_status)
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;

-- Comentário explicativo na função
COMMENT ON FUNCTION add_manual_service(DATE, TEXT, TIME, TIMESTAMP WITH TIME ZONE, TEXT) IS 'Função para adicionar cultos manualmente. Use esta função para criar novos cultos após a desativação da geração automática.';

-- Conceder permissão para usuários autenticados chamarem a função
GRANT EXECUTE ON FUNCTION add_manual_service(DATE, TEXT, TIME, TIMESTAMP WITH TIME ZONE, TEXT) TO authenticated;

-- Atualizar a função HTTP para refletir a mudança
CREATE OR REPLACE FUNCTION http_auto_manage_services()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Executar a função de gerenciamento automático (agora apenas fecha cultos passados)
  PERFORM auto_manage_services();
  
  -- Retornar resultado
  SELECT json_build_object(
    'success', true,
    'message', 'Cultos passados marcados como fechados. A geração automática de novos cultos está desativada.',
    'timestamp', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Comentário explicativo na função
COMMENT ON FUNCTION http_auto_manage_services() IS 'Função HTTP para executar auto_manage_services. Agora apenas marca cultos passados como fechados, sem gerar novos cultos.';
