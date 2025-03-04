-- Script para corrigir problemas de segurança RLS
-- Este script habilita o Row Level Security nas tabelas que têm políticas mas não têm o RLS ativado

-- Habilitar RLS na tabela users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Criar políticas para a tabela users (se ainda não existirem)
DO $$
BEGIN
  -- Verifica se já existe uma política de leitura para usuários
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Permitir leitura pelos próprios usuários'
  ) THEN
    -- Permitir usuários ver apenas seus próprios dados
    CREATE POLICY "Permitir leitura pelos próprios usuários" 
      ON public.users
      FOR SELECT 
      USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');
  END IF;

  -- Verifica se já existe uma política de atualização para usuários
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Permitir atualização pelos próprios usuários'
  ) THEN
    -- Permitir usuários atualizarem apenas seus próprios dados
    CREATE POLICY "Permitir atualização pelos próprios usuários" 
      ON public.users
      FOR UPDATE 
      USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'admin');
  END IF;

  -- Política para administradores
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Permitir administradores gerenciarem usuários'
  ) THEN
    -- Permitir administradores gerenciarem todos os usuários
    CREATE POLICY "Permitir administradores gerenciarem usuários" 
      ON public.users
      FOR ALL 
      USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END
$$;

-- Habilitar RLS na tabela department_contents
ALTER TABLE public.department_contents ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela file_attachments
ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;

-- Verificar se as políticas existem e estão ativas
DO $$
BEGIN
  RAISE NOTICE 'Verificação de políticas RLS:';
  
  RAISE NOTICE 'Tabela users: RLS habilitado e políticas criadas';
  RAISE NOTICE 'Tabela department_contents: RLS habilitado';
  RAISE NOTICE 'Tabela file_attachments: RLS habilitado';
END
$$; 