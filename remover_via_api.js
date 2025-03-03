// Script para remover todos os cultos regulares via API REST do Supabase
// Salve este arquivo como remover_via_api.js e execute com Node.js

// Configurações do Supabase - substitua pelos seus valores reais
const SUPABASE_URL = 'https://ntbkptgsbqcfoxamktzm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50YmtwdGdzYnFjZm94YW1rdHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0NTMxMTksImV4cCI6MjA1NjAyOTExOX0.yngWaJMwaRhSyNMzTwRk8h0SlEDBBCyJgP7dtj2dKnU';

// Função para fazer requisições HTTP
async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
      throw new Error(`Erro HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }
    
    return response;
  } catch (error) {
    if (retries <= 0) throw error;
    
    console.log(`Tentativa falhou. Tentando novamente em ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return fetchWithRetry(url, options, retries - 1, delay * 2);
  }
}

// Função principal
async function removerCultosRegulares() {
  try {
    console.log('Iniciando remoção de cultos regulares...');
    
    // 1. Primeiro, obter todos os IDs dos cultos
    console.log('Buscando IDs dos cultos...');
    const getResponse = await fetchWithRetry(
      `${SUPABASE_URL}/rest/v1/service_schedules?select=id`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );
    
    const cultos = await getResponse.json();
    console.log(`Encontrados ${cultos.length} cultos para remover.`);
    
    if (cultos.length === 0) {
      console.log('Nenhum culto para remover.');
      return;
    }
    
    // 2. Remover os cultos um por um
    console.log('Removendo cultos individualmente...');
    let removidos = 0;
    
    for (const culto of cultos) {
      try {
        const deleteResponse = await fetchWithRetry(
          `${SUPABASE_URL}/rest/v1/service_schedules?id=eq.${culto.id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Prefer': 'return=minimal'
            }
          }
        );
        
        removidos++;
        
        if (removidos % 10 === 0 || removidos === cultos.length) {
          console.log(`Progresso: ${removidos}/${cultos.length} cultos removidos.`);
        }
      } catch (error) {
        console.error(`Erro ao remover culto ${culto.id}:`, error.message);
      }
    }
    
    console.log(`Processo concluído. ${removidos} cultos foram removidos.`);
    
    // 3. Verificar se todos foram removidos
    const verificacaoResponse = await fetchWithRetry(
      `${SUPABASE_URL}/rest/v1/service_schedules?select=count`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'count=exact'
        }
      }
    );
    
    const count = verificacaoResponse.headers.get('content-range')?.split('/')[1] || 'desconhecido';
    console.log(`Verificação final: ${count} cultos restantes no banco de dados.`);
    
  } catch (error) {
    console.error('Erro durante o processo de remoção:', error);
  }
}

// Executar a função principal
removerCultosRegulares(); 