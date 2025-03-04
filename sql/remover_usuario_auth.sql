-- Script para remover usuário do sistema de autenticação
-- ATENÇÃO: Certifique-se de executar primeiro o script verificar_usuarios.sql
-- para confirmar qual usuário será removido.

-- Substitua este ID pelo ID do usuário que deseja excluir
-- Obtido a partir da consulta anterior
-- VAR user_id = 'ID-DO-USUARIO';

-- Remover o usuário da tabela auth.users
DELETE FROM auth.users
WHERE email = 'everton@myphp.com.br';

-- Verificar se a remoção foi concluída
SELECT COUNT(*) FROM auth.users WHERE email = 'everton@myphp.com.br';

-- NOTA: O Supabase pode ter restrições que impedem a exclusão direta
-- de usuários da tabela auth.users via SQL. Nesse caso, você deve
-- usar as APIs administrativas do Supabase ou a interface do Supabase Studio.

-- Método alternativo: Você pode usar a função de API do Supabase:
-- POST /auth/v1/admin/users/{USER_ID}
-- Com o cabeçalho: apikey: SUPABASE_SERVICE_ROLE_KEY
-- E o corpo: { "email": "novo-email-unico@exemplo.com" }
-- Para alterar o email do usuário para um valor único temporário. 