-- Script SQL para criar uma função RPC que remove todos os cultos regulares
-- ATENÇÃO: Este script irá criar uma função que pode remover TODOS os cultos regulares!

-- Criar a função RPC para remover todos os cultos
CREATE OR REPLACE FUNCTION limpar_cultos_regulares()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com os privilégios do criador da função
AS $$
DECLARE
  total_antes INTEGER;
  total_removidos INTEGER;
  total_depois INTEGER;
BEGIN
  -- Contar quantos registros existem antes
  SELECT COUNT(*) INTO total_antes FROM service_schedules;
  
  -- Remover todos os registros
  DELETE FROM service_schedules;
  
  -- Contar quantos foram removidos
  GET DIAGNOSTICS total_removidos = ROW_COUNT;
  
  -- Contar quantos restaram
  SELECT COUNT(*) INTO total_depois FROM service_schedules;
  
  -- Retornar resultado como JSON
  RETURN json_build_object(
    'sucesso', TRUE,
    'total_antes', total_antes,
    'total_removidos', total_removidos,
    'total_depois', total_depois,
    'mensagem', 'Operação concluída com sucesso'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'sucesso', FALSE,
      'erro', SQLERRM,
      'codigo_erro', SQLSTATE,
      'mensagem', 'Erro ao remover cultos regulares'
    );
END;
$$;

-- Comentário sobre como usar a função
COMMENT ON FUNCTION limpar_cultos_regulares() IS 'Remove todos os cultos regulares da tabela service_schedules. Use com extrema cautela!';

-- Para executar a função, use:
-- SELECT limpar_cultos_regulares();

-- Para remover a função quando não for mais necessária:
-- DROP FUNCTION IF EXISTS limpar_cultos_regulares(); 