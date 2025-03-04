-- Verifica se o RLS está habilitado na tabela users
SELECT relname as table_name, relrowsecurity as rls_enabled
FROM pg_class 
WHERE relname = 'users' AND relkind = 'r';

-- Lista todas as políticas RLS existentes para a tabela users
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'users';

-- Verifica o tipo de autenticação JWT disponível
SELECT current_setting('request.jwt.claims', true) as jwt_claims;

-- Verifica o valor de auth.uid() para o usuário atual
SELECT auth.uid() as auth_user_id; 