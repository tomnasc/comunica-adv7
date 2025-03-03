-- Script SQL para remover cultos regulares em lotes
-- ATENÇÃO: Este script irá remover TODOS os cultos regulares do banco de dados!

-- Primeiro, verificar quantos registros existem
SELECT COUNT(*) as total_cultos_regulares FROM service_schedules;

-- Criar uma tabela temporária com os IDs a serem excluídos
CREATE TEMP TABLE ids_para_excluir AS
SELECT id FROM service_schedules;

-- Verificar quantos IDs foram coletados
SELECT COUNT(*) as ids_coletados FROM ids_para_excluir;

-- Remover em lotes de 100 registros
DO $$
DECLARE
    v_id UUID;
    v_contador INTEGER := 0;
BEGIN
    FOR v_id IN SELECT id FROM ids_para_excluir LOOP
        DELETE FROM service_schedules WHERE id = v_id;
        v_contador := v_contador + 1;
        
        -- Registrar progresso a cada 10 exclusões
        IF v_contador % 10 = 0 THEN
            RAISE NOTICE 'Excluídos % registros', v_contador;
        END IF;
        
        -- Commit a cada 100 exclusões para evitar bloqueios longos
        IF v_contador % 100 = 0 THEN
            COMMIT;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Total de % registros excluídos', v_contador;
END $$;

-- Verificar se a remoção foi bem-sucedida
SELECT COUNT(*) as cultos_restantes FROM service_schedules;

-- Limpar a tabela temporária
DROP TABLE IF EXISTS ids_para_excluir; 