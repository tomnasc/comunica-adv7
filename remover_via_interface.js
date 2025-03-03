// Script para remover todos os cultos regulares via interface do navegador
// Cole este código no console do navegador (F12) quando estiver na página de cultos regulares

(async function() {
  // Função para mostrar mensagens no console e na página
  function log(message, isError = false) {
    const style = isError ? 'color: red; font-weight: bold;' : 'color: blue; font-weight: bold;';
    console.log(`%c${message}`, style);
    
    // Criar um elemento de notificação na página
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.top = '10px';
    notification.style.right = '10px';
    notification.style.padding = '10px';
    notification.style.background = isError ? '#ffdddd' : '#ddffdd';
    notification.style.border = `1px solid ${isError ? 'red' : 'green'}`;
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '9999';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remover a notificação após 5 segundos
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 5000);
  }
  
  // Verificar se estamos na página correta
  if (!window.location.href.includes('/dashboard/services/regular')) {
    log('Este script deve ser executado na página de cultos regulares!', true);
    return;
  }
  
  try {
    log('Iniciando remoção de cultos regulares...');
    
    // Verificar se o Supabase está disponível
    if (!window.supabase) {
      log('Cliente Supabase não encontrado. Tentando acessar através do objeto global...', true);
      
      // Tentar encontrar o cliente Supabase no escopo global
      let supabaseClient = null;
      for (const key in window) {
        if (key.includes('supabase') || (window[key] && typeof window[key] === 'object' && window[key].auth)) {
          supabaseClient = window[key];
          log(`Possível cliente Supabase encontrado em window.${key}`);
          break;
        }
      }
      
      if (!supabaseClient) {
        log('Não foi possível encontrar o cliente Supabase. Abortando.', true);
        return;
      }
      
      window.supabase = supabaseClient;
    }
    
    // Buscar todos os cultos
    log('Buscando cultos regulares...');
    const { data: cultos, error } = await window.supabase
      .from('service_schedules')
      .select('id');
    
    if (error) {
      log(`Erro ao buscar cultos: ${error.message}`, true);
      return;
    }
    
    log(`Encontrados ${cultos.length} cultos para remover.`);
    
    if (cultos.length === 0) {
      log('Nenhum culto para remover.');
      return;
    }
    
    // Confirmar com o usuário
    if (!confirm(`Tem certeza que deseja remover TODOS os ${cultos.length} cultos regulares? Esta ação não pode ser desfeita!`)) {
      log('Operação cancelada pelo usuário.');
      return;
    }
    
    // Remover os cultos um por um
    log('Removendo cultos...');
    let removidos = 0;
    let falhas = 0;
    
    for (const culto of cultos) {
      try {
        const { error } = await window.supabase
          .from('service_schedules')
          .delete()
          .eq('id', culto.id);
        
        if (error) {
          log(`Erro ao remover culto ${culto.id}: ${error.message}`, true);
          falhas++;
        } else {
          removidos++;
          
          if (removidos % 5 === 0 || removidos === cultos.length) {
            log(`Progresso: ${removidos}/${cultos.length} cultos removidos.`);
          }
        }
        
        // Pequena pausa para não sobrecarregar o servidor
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        log(`Exceção ao remover culto ${culto.id}: ${err.message}`, true);
        falhas++;
      }
    }
    
    log(`Processo concluído. ${removidos} cultos removidos com sucesso. ${falhas} falhas.`);
    
    // Verificar se todos foram removidos
    const { data: restantes, error: errorVerificacao } = await window.supabase
      .from('service_schedules')
      .select('id');
    
    if (errorVerificacao) {
      log(`Erro ao verificar cultos restantes: ${errorVerificacao.message}`, true);
    } else {
      log(`Verificação final: ${restantes.length} cultos ainda restantes no banco de dados.`);
      
      if (restantes.length > 0) {
        log('Alguns cultos não puderam ser removidos. Tente recarregar a página e executar o script novamente.', true);
      } else {
        log('Todos os cultos foram removidos com sucesso! Recarregando a página...');
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    }
  } catch (error) {
    log(`Erro durante o processo de remoção: ${error.message}`, true);
  }
})(); 