-- Script para verificar usuários nas tabelas auth.users e public.users

-- Verificar usuários na tabela auth.users
SELECT id, email, created_at, last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;

-- Verificar usuários na tabela public.users
SELECT id, email, name, role, created_at
FROM public.users
ORDER BY created_at DESC;

-- Usuários que existem em auth.users mas não em public.users
SELECT au.id, au.email, au.created_at, NULL as name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Usuários que existem em public.users mas não em auth.users
SELECT pu.id, pu.email, pu.created_at, pu.name
FROM public.users pu
LEFT JOIN auth.users au ON pu.id = au.id
WHERE au.id IS NULL
ORDER BY pu.created_at DESC;

-- Verificar especificamente pelo email informado
SELECT 'auth.users' as tabela, id, email, created_at
FROM auth.users 
WHERE email = 'everton@myphp.com.br'
UNION ALL
SELECT 'public.users' as tabela, id, email, created_at
FROM public.users
WHERE email = 'everton@myphp.com.br'; 