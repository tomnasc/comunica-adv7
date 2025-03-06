-- Adicionar coluna is_external_link à tabela file_attachments
ALTER TABLE file_attachments ADD COLUMN IF NOT EXISTS is_external_link BOOLEAN DEFAULT FALSE;

-- Comentário para a coluna
COMMENT ON COLUMN file_attachments.is_external_link IS 'Indica se o arquivo está armazenado em um serviço externo (como Mega.io)';

-- Atualizar os registros existentes
UPDATE file_attachments SET is_external_link = FALSE WHERE is_external_link IS NULL; 