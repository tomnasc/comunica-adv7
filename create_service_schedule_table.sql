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

-- Criar trigger para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON service_schedule
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Criar políticas de segurança para a tabela
ALTER TABLE service_schedule ENABLE ROW LEVEL SECURITY;

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