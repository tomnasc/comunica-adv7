# Desativação da Geração Automática de Cultos

Este diretório contém scripts SQL para modificar o comportamento do sistema de gerenciamento de cultos.

## Script: `desativar_geracao_automatica.sql`

Este script modifica a função `auto_manage_services` para desativar a geração automática de novos cultos. Após a execução deste script, a função apenas marcará cultos passados como fechados, sem adicionar novos cultos automaticamente.

### O que o script faz:

1. **Modifica a função `auto_manage_services`** para remover a lógica de criação automática de cultos, mantendo apenas a funcionalidade de marcar cultos passados como fechados.

2. **Cria uma nova função `add_manual_service`** que permite adicionar cultos manualmente através do SQL ou da API do Supabase.

3. **Atualiza a função `http_auto_manage_services`** para refletir a mudança no comportamento da função principal.

### Como executar o script:

1. Acesse o [Dashboard do Supabase](https://app.supabase.io)
2. Faça login com suas credenciais
3. Selecione o projeto que você está usando para o sistema de comunicação
4. No menu lateral, clique em **SQL Editor**
5. Clique em **+ New Query** para criar uma nova consulta
6. Copie e cole o conteúdo do arquivo `desativar_geracao_automatica.sql` no editor
7. Clique em **Run** para executar o script

### Como adicionar cultos manualmente:

Após a execução do script, você pode adicionar cultos manualmente de duas formas:

#### 1. Através da interface do sistema:

Use o botão "Adicionar Culto" na página de cultos regulares do dashboard.

#### 2. Através do SQL:

```sql
SELECT add_manual_service(
  '2023-12-24', -- Data do culto (formato: YYYY-MM-DD)
  'sunday',      -- Tipo do culto (sunday, wednesday ou saturday)
  '09:00:00',    -- Horário do culto (formato: HH:MM:SS)
  '08:00:00',    -- Prazo para envio (formato: HH:MM:SS)
  'open'         -- Status (open ou closed, padrão: open)
);
```

#### 3. Através da API do Supabase:

```javascript
const { data, error } = await supabase.rpc('add_manual_service', {
  p_date: '2023-12-24',
  p_type: 'sunday',
  p_time: '09:00:00',
  p_deadline: '08:00:00',
  p_status: 'open'
})
```

### Verificação:

Para verificar se a modificação foi aplicada corretamente, você pode:

1. Executar a função `auto_manage_services` e verificar se nenhum novo culto é criado:

```sql
SELECT auto_manage_services();
```

2. Verificar os cultos existentes:

```sql
SELECT * FROM service_schedule ORDER BY date DESC;
```

### Reverter a modificação:

Se você precisar reverter a modificação e restaurar a geração automática de cultos, execute o script original de criação da função `auto_manage_services` que está no arquivo `setup_service_management.sql`. 