'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import type { User, ServiceSchedule } from '@/types'
import { useRouter } from 'next/navigation'

export default function RegularServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<ServiceSchedule[]>([])
  const [filteredServices, setFilteredServices] = useState<ServiceSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isUpdatingServices, setIsUpdatingServices] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    status: '' as 'open' | 'closed' | 'all',
    type: '' as 'sunday' | 'wednesday' | 'saturday' | 'all',
    date: '',
    startDate: '',
    endDate: ''
  })
  const [sortConfig, setSortConfig] = useState({
    key: 'date' as keyof ServiceSchedule,
    direction: 'asc' as 'asc' | 'desc'
  })
  const [formData, setFormData] = useState({
    id: '',
    date: '',
    type: 'sunday' as 'sunday' | 'wednesday' | 'saturday',
    time: '',
    deadline: '',
    status: 'open' as 'open' | 'closed'
  })
  const [isFixingDeadlines, setIsFixingDeadlines] = useState(false)

  const ITEMS_PER_PAGE = 10

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (error) {
          toast.error('Erro ao carregar dados do usuário')
          return
        }

        if (data.role !== 'admin') {
          toast.error('Acesso não autorizado')
          router.push('/dashboard')
          return
        }

        setCurrentUser(data)
        await loadServices()
      } else {
        router.push('/login')
      }
    }

    getUser()
  }, [router])

  useEffect(() => {
    filterServices()
  }, [services, filters])

  useEffect(() => {
    filterServices();
  }, [services, filters, sortConfig]);

  const loadServices = async () => {
    try {
      setIsLoading(true)
      
      console.log('Carregando serviços regulares...');
      
      // Método 1: Usar o cliente Supabase diretamente (preferido)
      const { data: regularData, error } = await supabase
        .from('service_schedules')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Erro ao carregar cultos via cliente Supabase:', error);
        throw error;
      }
      
      console.log(`Recebidos ${regularData?.length || 0} serviços via cliente Supabase`);
      
      // Se não houver dados, tentar o método alternativo
      if (!regularData || regularData.length === 0) {
        console.log('Nenhum serviço encontrado via cliente Supabase. Tentando método alternativo...');
        
        // Método 2: Usar valores fixos para garantir que a chamada funcione
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ntbkptgsbqcfoxamktzm.supabase.co'
        const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50YmtwdGdzYnFjZm94YW1rdHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0NTMxMTksImV4cCI6MjA1NjAyOTExOX0.yngWaJMwaRhSyNMzTwRk8h0SlEDBBCyJgP7dtj2dKnU'
        
        console.log('Tentando carregar serviços via fetch direto...');
        
        try {
          // Tentar primeiro via RPC
          const regularResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_regular_services`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            // Adicionar um parâmetro de cache-busting para evitar cache
            cache: 'no-store'
          });
          
          if (!regularResponse.ok) {
            console.warn(`Resposta não-OK do endpoint RPC: ${regularResponse.status}`);
            throw new Error(`Erro na resposta RPC: ${regularResponse.status}`);
          }
          
          const rpcData = await regularResponse.json();
          console.log(`Recebidos ${rpcData.length} serviços via RPC`);
          
          if (rpcData && rpcData.length > 0) {
            // Processar os dados recebidos via RPC
            processAndSetServices(rpcData);
            return;
          } else {
            console.warn('Nenhum serviço recebido via RPC. Tentando fetch direto da tabela...');
          }
        } catch (rpcError) {
          console.error('Erro ao carregar via RPC:', rpcError);
          console.log('Tentando fetch direto da tabela...');
        }
        
        // Se RPC falhar, tentar fetch direto da tabela
        try {
          const tableResponse = await fetch(`${SUPABASE_URL}/rest/v1/service_schedules?order=date.desc`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            cache: 'no-store'
          });
          
          if (!tableResponse.ok) {
            console.warn(`Resposta não-OK do endpoint da tabela: ${tableResponse.status}`);
            throw new Error(`Erro na resposta da tabela: ${tableResponse.status}`);
          }
          
          const tableData = await tableResponse.json();
          console.log(`Recebidos ${tableData.length} serviços via fetch direto da tabela`);
          
          if (tableData && tableData.length > 0) {
            // Processar os dados recebidos via fetch direto
            processAndSetServices(tableData);
            return;
          } else {
            console.warn('Nenhum serviço recebido via fetch direto.');
          }
        } catch (tableError) {
          console.error('Erro ao carregar via fetch direto:', tableError);
        }
        
        // Se chegou aqui, nenhum método funcionou
        console.error('Todos os métodos de carregamento falharam. Definindo lista vazia.');
        setServices([]);
        setIsLoading(false);
        return;
      }
      
      // Processar os dados recebidos via cliente Supabase
      processAndSetServices(regularData);
    } catch (error: any) {
      console.error('Erro ao carregar cultos:', error);
      toast.error('Erro ao carregar cultos');
      setServices([]);
      setIsLoading(false);
    }
  }
  
  // Função auxiliar para processar os serviços e definir o estado
  const processAndSetServices = (servicesData: ServiceSchedule[]) => {
    try {
      // Verificar e garantir que todos os serviços tenham um deadline válido
      const processedServices = servicesData.map((service: ServiceSchedule) => {
        try {
          // Verificar se o deadline é apenas um horário (formato HH:MM:SS ou HH:MM)
          const isTimeOnly = typeof service.deadline === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(service.deadline);
          
          if (isTimeOnly || !service.deadline || new Date(service.deadline).toString() === 'Invalid Date') {
            console.warn(`Serviço ${service.id} com deadline inválido:`, service.deadline);
            
            // Extrair as horas e minutos do deadline se for apenas um horário
            let hours = 18;
            let minutes = 0;
            
            if (isTimeOnly && typeof service.deadline === 'string') {
              const timeParts = service.deadline.split(':');
              if (timeParts.length >= 2) {
                hours = parseInt(timeParts[0], 10) || 18;
                minutes = parseInt(timeParts[1], 10) || 0;
              }
            }
            
            // Definir um deadline padrão (1 dia antes da data do serviço)
            const serviceDate = new Date(service.date);
            if (isNaN(serviceDate.getTime())) {
              console.error(`Data de serviço inválida para o serviço ${service.id}:`, service.date);
              // Usar data atual como fallback
              const today = new Date();
              const defaultDeadline = new Date(today);
              defaultDeadline.setHours(hours, minutes, 0, 0);
              
              // Remover os segundos do ISO string
              const isoWithoutSeconds = defaultDeadline.toISOString().replace(/:\d{2}\.\d{3}Z$/, ':00.000Z');
              
              return {
                ...service,
                deadline: isoWithoutSeconds
              };
            }
            
            const defaultDeadline = new Date(serviceDate);
            defaultDeadline.setDate(defaultDeadline.getDate() - 1);
            defaultDeadline.setHours(hours, minutes, 0, 0);
            
            // Remover os segundos do ISO string
            const isoWithoutSeconds = defaultDeadline.toISOString().replace(/:\d{2}\.\d{3}Z$/, ':00.000Z');
            
            return {
              ...service,
              deadline: isoWithoutSeconds
            };
          }
          
          // Verificar se o deadline já é um ISO string válido
          const deadlineDate = new Date(service.deadline);
          if (isNaN(deadlineDate.getTime())) {
            console.error(`Deadline inválido após processamento para o serviço ${service.id}:`, service.deadline);
            // Usar um valor padrão
            const serviceDate = new Date(service.date);
            const defaultDeadline = new Date(serviceDate);
            defaultDeadline.setDate(defaultDeadline.getDate() - 1);
            defaultDeadline.setHours(18, 0, 0, 0);
            
            // Remover os segundos do ISO string
            const isoWithoutSeconds = defaultDeadline.toISOString().replace(/:\d{2}\.\d{3}Z$/, ':00.000Z');
            
            return {
              ...service,
              deadline: isoWithoutSeconds
            };
          }
          
          // Remover os segundos do ISO string para todos os serviços
          const isoWithoutSeconds = deadlineDate.toISOString().replace(/:\d{2}\.\d{3}Z$/, ':00.000Z');
          
          return {
            ...service,
            deadline: isoWithoutSeconds
          };
        } catch (error) {
          console.error(`Erro ao processar deadline do serviço ${service.id}:`, error);
          // Retornar o serviço original em caso de erro
          return service;
        }
      });
      
      console.log('Serviços carregados e processados:', processedServices.length);
      setServices(processedServices);
      
      // Corrigir os deadlines no banco de dados em uma única operação
      fixDeadlinesInDatabase(processedServices);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao processar serviços:', error);
      setServices([]);
      setIsLoading(false);
    }
  }

  // Função para corrigir os deadlines no banco de dados
  const fixDeadlinesInDatabase = async (services: ServiceSchedule[]) => {
    try {
      const servicesToFix = services.filter(service => {
        // Usar apenas o deadline atual, sem referência a originalDeadline
        const isTimeOnly = typeof service.deadline === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(service.deadline);
        return isTimeOnly || !service.deadline || new Date(service.deadline).toString() === 'Invalid Date';
      });
      
      if (servicesToFix.length === 0) {
        console.log('Nenhum serviço precisa ter o deadline corrigido no banco de dados');
        return;
      }
      
      console.log(`Corrigindo ${servicesToFix.length} deadlines no banco de dados...`);
      
      for (const service of servicesToFix) {
        await supabase
          .from('service_schedules')
          .update({ deadline: service.deadline })
          .eq('id', service.id);
      }
      
      console.log('Deadlines corrigidos no banco de dados');
    } catch (error) {
      console.error('Erro ao corrigir deadlines no banco de dados:', error);
    }
  }

  // Função para atualizar os cultos regulares automaticamente
  const updateRegularServices = async () => {
    try {
      console.log('Iniciando atualização de cultos regulares...')
      setIsUpdatingServices(true)
      
      // Usar valores fixos para garantir que a chamada funcione
      const SUPABASE_URL = 'https://ntbkptgsbqcfoxamktzm.supabase.co'
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50YmtwdGdzYnFjZm94YW1rdHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0NTMxMTksImV4cCI6MjA1NjAyOTExOX0.yngWaJMwaRhSyNMzTwRk8h0SlEDBBCyJgP7dtj2dKnU'
      
      console.log('URL do Supabase:', SUPABASE_URL)
      console.log('Chave anônima (primeiros 10 caracteres):', SUPABASE_ANON_KEY.substring(0, 10) + '...')
      
      console.log('Atualizando cultos regulares via fetch direto...')
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/http_auto_manage_services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      })
      
      console.log('Resposta recebida, status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Erro na resposta:', response.status, errorData)
        throw new Error(`Erro na resposta: ${response.status} - ${JSON.stringify(errorData)}`)
      }
      
      const data = await response.json()
      console.log('Cultos passados fechados com sucesso:', data)
      toast.success('Cultos passados fechados com sucesso')
      
      console.log('Recarregando dados...')
      await loadServices() // Recarregar os dados após a atualização
    } catch (error) {
      console.error('Erro ao atualizar cultos regulares:', error)
      toast.error('Erro ao fechar cultos passados')
    } finally {
      setIsUpdatingServices(false)
      console.log('Processo de atualização finalizado')
    }
  }

  const filterServices = () => {
    let filtered = [...services]

    // Aplicar filtro de tipo
    if (filters.type) {
      filtered = filtered.filter(service => service.type === filters.type)
    }

    // Aplicar filtro de status
    if (filters.status) {
      filtered = filtered.filter(service => service.status === filters.status)
    }

    // Aplicar filtro de data
    if (filters.date) {
      filtered = filtered.filter(service => service.date === filters.date)
    }

    // Aplicar ordenação
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key] ?? ''
      const bValue = b[sortConfig.key] ?? ''
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    setFilteredServices(filtered)
  }

  const handleSort = (key: keyof ServiceSchedule) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      console.log('Dados do formulário antes do processamento:', formData);
      
      // Verificar se todos os campos obrigatórios estão preenchidos
      if (!formData.date || !formData.type || !formData.time) {
        console.error('Campos obrigatórios não preenchidos:', { 
          date: formData.date, 
          type: formData.type, 
          time: formData.time 
        });
        toast.error('Por favor, preencha todos os campos obrigatórios');
        return;
      }
      
      // Verificar se o deadline foi preenchido
      let deadlineISO;
      
      if (!formData.deadline || formData.deadline.trim() === '') {
        // Se o deadline não foi preenchido, definir um valor padrão (18:00 do dia anterior ao culto)
        console.log('Deadline não preenchido, usando valor padrão');
        const serviceDate = new Date(formData.date);
        const defaultDeadline = new Date(serviceDate);
        defaultDeadline.setDate(defaultDeadline.getDate() - 1);
        defaultDeadline.setHours(18, 0, 0, 0); // 18:00 do dia anterior
        
        // Remover os segundos do ISO string
        deadlineISO = defaultDeadline.toISOString().replace(/:\d{2}\.\d{3}Z$/, ':00.000Z');
        console.log('Deadline padrão gerado:', deadlineISO);
      } else {
        // Garantir que o deadline esteja no formato correto para o banco de dados
        try {
          console.log('Processando deadline do formulário:', formData.deadline);
          
          // Abordagem simplificada: criar uma data a partir da string do formulário
          // e garantir que NÃO tenha segundos
          if (formData.deadline.includes('T')) {
            // Extrair as partes da data e hora
            const [datePart, timePart] = formData.deadline.split('T');
            console.log('Partes da data:', datePart, timePart);
            
            // Extrair componentes
            const [year, month, day] = datePart.split('-').map(num => parseInt(num, 10));
            let [hour, minute] = timePart.split(':').map(num => parseInt(num, 10));
            
            // Garantir que hour e minute sejam números válidos
            hour = isNaN(hour) ? 0 : hour;
            minute = isNaN(minute) ? 0 : minute;
            
            console.log('Componentes da data:', year, month, day, hour, minute);
            
            // Criar uma data no fuso horário local com segundos zerados
            // Mês em JavaScript é baseado em zero (0-11)
            const localDate = new Date(year, month - 1, day, hour, minute, 0);
            
            if (isNaN(localDate.getTime())) {
              console.error('Data inválida após parsing:', localDate);
              toast.error('Data de prazo inválida');
              return;
            }
            
            console.log('Data local criada:', localDate);
            
            // Converter para ISO string e remover os segundos
            deadlineISO = localDate.toISOString().replace(/:\d{2}\.\d{3}Z$/, ':00.000Z');
            console.log('Deadline convertido para ISO sem segundos:', deadlineISO);
          } else {
            throw new Error('Formato de data não contém separador T');
          }
        } catch (error) {
          console.error('Erro ao processar deadline:', error);
          toast.error('Erro ao processar data de prazo');
          return;
        }
      }
      
      // Dados a serem salvos
      const serviceData = {
        date: formData.date,
        type: formData.type,
        time: formData.time,
        deadline: deadlineISO,
        status: formData.status
      };
      
      console.log('Dados finais a serem salvos:', serviceData);
      
      if (isEditMode) {
        // Atualizar culto existente
        console.log(`Atualizando culto ID ${formData.id} com deadline ${deadlineISO}`);
        const { data, error: dbError } = await supabase
          .from('service_schedules')
          .update(serviceData)
          .eq('id', formData.id)
          .select();

        if (dbError) {
          console.error('Erro do Supabase ao atualizar:', dbError);
          console.error('Código do erro:', dbError.code);
          console.error('Detalhes do erro:', dbError.details);
          console.error('Mensagem do erro:', dbError.message);
          console.error('Dica:', dbError.hint);
          throw dbError;
        }
        
        console.log('Culto atualizado, resposta:', data);
        toast.success('Culto atualizado com sucesso!');
      } else {
        // Criar novo culto
        console.log(`Criando novo culto com deadline ${deadlineISO}`);
        
        // Verificar a conexão com o Supabase
        console.log('URL do Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log('Chave anônima (primeiros 10 caracteres):', 
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10) + '...' : 
          'não definida');
        
        // Tentar inserir o culto
        console.log('Iniciando inserção no Supabase...');
        const { data, error: dbError } = await supabase
          .from('service_schedules')
          .insert(serviceData)
          .select();

        if (dbError) {
          console.error('Erro do Supabase ao inserir:', dbError);
          console.error('Código do erro:', dbError.code);
          console.error('Detalhes do erro:', dbError.details);
          console.error('Mensagem do erro:', dbError.message);
          console.error('Dica:', dbError.hint);
          throw dbError;
        }
        
        if (!data || data.length === 0) {
          console.warn('Nenhum dado retornado após a inserção, mas sem erro reportado');
        } else {
          console.log('Culto criado, resposta:', data);
        }
        
        toast.success('Culto criado com sucesso!');
      }

      setIsModalOpen(false);
      setFormData({
        id: '',
        date: '',
        type: 'sunday',
        time: '',
        deadline: '',
        status: 'open'
      });
      setIsEditMode(false);
      
      console.log('Recarregando serviços após salvar...');
      await loadServices();
    } catch (error: any) {
      console.error('Erro ao salvar culto:', error);
      console.error('Stack trace:', error.stack);
      
      // Tentar extrair mais informações do erro
      if (error.response) {
        console.error('Resposta do erro:', error.response);
      }
      
      toast.error(error.message || 'Erro ao salvar culto');
    }
  }

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Tem certeza que deseja excluir este culto?')) return

    try {
      console.log('Excluindo culto com ID:', serviceId);
      
      // Verificar se o ID é válido
      if (!serviceId || serviceId.trim() === '') {
        console.error('ID de culto inválido para exclusão');
        toast.error('ID de culto inválido');
        return;
      }
      
      // Mostrar toast de carregamento
      toast.loading('Excluindo culto...');
      
      // Excluir o culto usando a API direta do Supabase
      const { error: dbError } = await supabase
        .from('service_schedules')
        .delete()
        .eq('id', serviceId);

      if (dbError) {
        console.error('Erro ao excluir culto:', dbError);
        toast.dismiss();
        toast.error('Erro ao excluir culto: ' + dbError.message);
        return;
      }

      console.log('Culto excluído com sucesso no banco de dados!');
      
      // Atualizar a lista de cultos localmente
      const updatedServices = services.filter(service => service.id !== serviceId);
      console.log(`Lista de serviços atualizada: ${services.length} -> ${updatedServices.length}`);
      
      // Atualizar os estados
      setServices(updatedServices);
      
      // Forçar a atualização dos filteredServices
      setTimeout(() => {
        setFilteredServices(updatedServices.filter(service => {
          // Replicar a lógica de filtro
          if (filters.type && service.type !== filters.type) return false;
          if (filters.status && service.status !== filters.status) return false;
          if (filters.date && service.date !== filters.date) return false;
          return true;
        }));
        
        // Mostrar mensagem de sucesso
        toast.dismiss();
        toast.success('Culto excluído com sucesso!');
        
        // Recarregar os serviços do banco de dados após um tempo
        setTimeout(async () => {
          console.log('Recarregando serviços após exclusão...');
          await loadServices();
        }, 1000);
      }, 100);
    } catch (error: any) {
      console.error('Erro ao excluir culto:', error);
      toast.dismiss();
      toast.error(error.message || 'Erro ao excluir culto');
    }
  }

  const handleEdit = (service: ServiceSchedule) => {
    try {
      console.log('Editando serviço:', service);
      
      // Verificar se o serviço é válido
      if (!service || !service.id) {
        console.error('Serviço inválido para edição');
        toast.error('Serviço inválido');
        return;
      }
      
      console.log('Deadline original:', service.deadline);
      
      // Formatar o deadline para o formato esperado pelo input datetime-local (YYYY-MM-DDTHH:MM)
      let formattedDeadline = '';
      
      try {
        // Se o deadline for null ou undefined, usar um valor padrão
        if (!service.deadline) {
          console.log('Deadline não existe, criando um padrão');
          
          // Criar uma data padrão (18:00 do dia anterior)
          const serviceDate = new Date(service.date);
          const deadlineDate = new Date(serviceDate);
          deadlineDate.setDate(deadlineDate.getDate() - 1);
          deadlineDate.setHours(18, 0, 0, 0);
          
          // Formatar para YYYY-MM-DDTHH:MM
          formattedDeadline = deadlineDate.toISOString().slice(0, 16);
        }
        // Se o deadline for uma string no formato HH:MM:SS ou HH:MM
        else if (typeof service.deadline === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(service.deadline)) {
          console.log('Deadline é apenas um horário, criando data completa');
          
          // Extrair horas e minutos
          const timeParts = service.deadline.split(':');
          const hours = parseInt(timeParts[0], 10) || 18;
          const minutes = parseInt(timeParts[1], 10) || 0;
          
          // Criar uma data completa (1 dia antes do serviço)
          const serviceDate = new Date(service.date);
          const deadlineDate = new Date(serviceDate);
          deadlineDate.setDate(deadlineDate.getDate() - 1);
          deadlineDate.setHours(hours, minutes, 0, 0);
          
          // Formatar para YYYY-MM-DDTHH:MM
          formattedDeadline = deadlineDate.toISOString().slice(0, 16);
        }
        // Se o deadline for uma data ISO
        else {
          console.log('Convertendo deadline existente para formato local');
          
          // Converter a string ISO para um objeto Date
          const deadlineDate = new Date(service.deadline);
          
          if (isNaN(deadlineDate.getTime())) {
            throw new Error('Data de deadline inválida: ' + service.deadline);
          }
          
          // Formatar para YYYY-MM-DDTHH:MM (formato local)
          // Usar toISOString e pegar apenas a parte YYYY-MM-DDTHH:MM
          formattedDeadline = deadlineDate.toISOString().slice(0, 16);
          
          console.log('Deadline formatado para o formulário:', formattedDeadline);
        }
      } catch (error) {
        console.error('Erro ao processar deadline:', error);
        
        // Em caso de erro, usar um valor padrão
        const serviceDate = new Date(service.date);
        const defaultDate = new Date(serviceDate);
        defaultDate.setDate(defaultDate.getDate() - 1);
        defaultDate.setHours(18, 0, 0, 0);
        
        formattedDeadline = defaultDate.toISOString().slice(0, 16);
        console.log('Usando deadline padrão após erro:', formattedDeadline);
      }
      
      // Atualizar o estado do formulário com todos os dados do serviço
      setFormData({
        id: service.id,
        date: service.date,
        type: service.type,
        time: service.time,
        deadline: formattedDeadline,
        status: service.status
      });
      
      console.log('Formulário atualizado para edição:', {
        id: service.id,
        date: service.date,
        type: service.type,
        time: service.time,
        deadline: formattedDeadline,
        status: service.status
      });
      
      // Ativar o modo de edição e abrir o modal
      setIsEditMode(true);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Erro ao processar data de deadline:', error);
      toast.error('Erro ao processar a data de prazo');
    }
  }

  const formatDate = (date: string) => {
    // Criar a data a partir da string, mas garantir que não haja ajuste de fuso horário
    const [year, month, day] = date.split('-').map(Number);
    const formattedDate = new Date(year, month - 1, day);
    
    // Formatar a data no padrão brasileiro
    return formattedDate.toLocaleDateString('pt-BR');
  }

  const formatTime = (time: string) => {
    return time.substring(0, 5) // Remove os segundos
  }

  const formatType = (type: string) => {
    const typeMap: {[key: string]: string} = {
      'sunday': 'Domingo',
      'wednesday': 'Quarta-feira',
      'saturday': 'Sábado'
    }
    return typeMap[type] || type
  }

  const formatStatus = (status: string) => {
    const statusMap: {[key: string]: string} = {
      'open': 'Aberto',
      'closed': 'Fechado'
    }
    return statusMap[status] || status
  }

  const formatDeadline = (deadline: string) => {
    // Criar a data a partir da string ISO
    const deadlineDate = new Date(deadline);
    
    // Ajustar para o fuso horário local
    const localDate = new Date(
      deadlineDate.getTime() + deadlineDate.getTimezoneOffset() * 60000
    );
    
    // Formatar a data e hora no padrão brasileiro
    return localDate.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const totalPages = Math.ceil(filteredServices.length / ITEMS_PER_PAGE)
  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Cultos Regulares</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Voltar
              </button>
              <button
                onClick={updateRegularServices}
                disabled={isUpdatingServices}
                className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 ${isUpdatingServices ? 'opacity-70' : 'hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
              >
                {isUpdatingServices ? 'Atualizando...' : 'Fechar Cultos Passados'}
              </button>
              <button
                onClick={() => {
                  setIsEditMode(false)
                  setFormData({
                    id: '',
                    date: '',
                    type: 'sunday',
                    time: '',
                    deadline: '',
                    status: 'open'
                  })
                  setIsModalOpen(true)
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Adicionar Culto
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <select
              value={filters.type}
              onChange={(e) => setFilters(f => ({ ...f, type: e.target.value as 'sunday' | 'wednesday' | 'saturday' | 'all' }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="all">Todos os Tipos</option>
              <option value="sunday">Domingo</option>
              <option value="wednesday">Quarta-feira</option>
              <option value="saturday">Sábado</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as 'open' | 'closed' | 'all' }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="all">Todos os Status</option>
              <option value="open">Aberto</option>
              <option value="closed">Fechado</option>
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Data inicial"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Data final"
            />
          </div>

          {/* Lista de Cultos */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900">Nenhum culto encontrado</h3>
              <p className="text-gray-500">
                Tente ajustar os filtros ou adicione um novo culto.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('date')}
                    >
                      Data {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('type')}
                    >
                      Tipo {sortConfig.key === 'type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('time')}
                    >
                      Horário {sortConfig.key === 'time' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('deadline')}
                    >
                      Prazo para Envio {sortConfig.key === 'deadline' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort('status')}
                    >
                      Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredServices.map((service) => (
                    <tr key={service.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(service.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatType(service.type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(service.time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDeadline(service.deadline)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          service.status === 'open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {formatStatus(service.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-4">
                          <button
                            onClick={() => handleEdit(service)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="mt-4 flex justify-center">
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Anterior
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === i + 1
                        ? 'text-indigo-600 bg-indigo-50'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Próxima
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Formulário */}
      {isModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {isEditMode ? 'Editar Culto' : 'Adicionar Novo Culto'}
                </h3>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                        Tipo
                      </label>
                      <select
                        id="type"
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as 'sunday' | 'wednesday' | 'saturday' })}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="sunday">Domingo</option>
                        <option value="wednesday">Quarta-feira</option>
                        <option value="saturday">Sábado</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                        Data
                      </label>
                      <input
                        type="date"
                        id="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                        Horário
                      </label>
                      <input
                        type="time"
                        id="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
                        Prazo para Envio
                      </label>
                      <input
                        type="datetime-local"
                        id="deadline"
                        value={formData.deadline}
                        onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <select
                        id="status"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'open' | 'closed' })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="open">Aberto</option>
                        <option value="closed">Fechado</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                    >
                      {isEditMode ? 'Salvar' : 'Adicionar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false)
                        setIsEditMode(false)
                        setFormData({
                          id: '',
                          date: '',
                          type: 'sunday',
                          time: '',
                          deadline: '',
                          status: 'open'
                        })
                      }}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 