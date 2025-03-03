# Sistema de Comunicação ADV7

Este é um sistema de gerenciamento de comunicação para a Igreja Adventista do Sétimo Dia, desenvolvido com Next.js, React e Supabase.

## Funcionalidades Principais

### Gerenciamento de Usuários
- Cadastro de usuários (admin e usuários comuns)
- Edição de perfis
- Controle de acesso baseado em funções

### Gerenciamento de Conteúdo
- Adição de conteúdo por departamento
- Upload de arquivos
- Visualização de conteúdo por culto

### Gerenciamento de Cultos
- **Cultos Regulares (Automáticos)**
  - Gerados automaticamente para as próximas 8 semanas
  - Atualização automática de status (aberto/fechado)
  - Tipos: Domingo, Quarta-feira e Sábado
  
- **Cultos Especiais (Manuais)**
  - Cadastro manual por administradores
  - Definição de título, descrição, data e hora
  - Controle de status (agendado, cancelado, concluído)

## Gerenciamento Automático de Cultos Regulares

O sistema possui um mecanismo automático para gerenciar os cultos regulares:

1. **Adição Automática**: Novos cultos são adicionados automaticamente para as próximas 8 semanas.
2. **Atualização de Status**: Cultos passados são marcados como "fechados" automaticamente.
3. **Execução Automática**: O processo é executado quando um administrador acessa o dashboard.
4. **Atualização Manual**: Administradores podem forçar a atualização através do botão "Atualizar Cultos".

### Configuração dos Cultos Regulares

Os cultos regulares seguem a seguinte configuração:

| Dia da Semana | Horário | Prazo para Envio |
|---------------|---------|------------------|
| Domingo       | 09:00   | 08:00            |
| Quarta-feira  | 19:30   | 18:00            |
| Sábado        | 19:30   | 18:00            |

## Instalação e Configuração

### Pré-requisitos
- Node.js 14+
- Conta no Supabase

### Configuração do Banco de Dados
1. Execute o script `setup_service_management.sql` no Supabase SQL Editor para:
   - Criar a tabela `service_schedule` para armazenar os cultos regulares
   - Criar a função `trigger_set_timestamp` para atualizar automaticamente o campo `updated_at`
   - Configurar as políticas de segurança para a tabela
   - Criar as funções `auto_manage_services` e `http_auto_manage_services` para gerenciamento automático
   - Gerar os primeiros cultos regulares para as próximas 8 semanas

### Variáveis de Ambiente
Crie um arquivo `.env.local` com as seguintes variáveis:

```
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_do_supabase
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Instalação
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## Uso

1. Acesse o sistema através do navegador
2. Faça login com suas credenciais
3. Navegue pelo dashboard para acessar as diferentes funcionalidades
4. Os administradores terão acesso a todas as funcionalidades, incluindo gerenciamento de usuários e cultos especiais
5. Os usuários comuns terão acesso limitado às funcionalidades de conteúdo

## Solução de Problemas

### Erro ao carregar dados na página de informações dos cultos
Se você encontrar um erro ao carregar dados na página de informações dos cultos, verifique se:

1. A tabela `service_schedule` foi criada no banco de dados
2. As funções `auto_manage_services` e `http_auto_manage_services` foram criadas corretamente
3. Execute o script `setup_service_management.sql` no SQL Editor do Supabase para configurar tudo de uma vez

Após executar o script, atualize a página e tente novamente. 
