'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import type { User, ServiceSchedule, DepartmentContent, FileAttachment, SpecialService } from '@/types'

export default function ServiceInfoPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [regularServices, setRegularServices] = useState<ServiceSchedule[]>([])
  const [specialServices, setSpecialServices] = useState<SpecialService[]>([])
  const [contents, setContents] = useState<{[key: string]: DepartmentContent[]}>({})
  const [attachments, setAttachments] = useState<{[key: string]: FileAttachment[]}>({})
  const [isUpdatingServices, setIsUpdatingServices] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      try {
        console.log('Verificando usuário...')
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.error('Erro ao verificar usuário:', authError)
          toast.error('Erro ao verificar usuário')
          router.push('/login')
          return
        }
        
        if (!authUser) {
          console.log('Usuário não autenticado')
          toast.error('Acesso não autorizado')
          router.push('/login')
          return
        }
        
        console.log('Usuário autenticado:', authUser.id)
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (error) {
          console.error('Erro ao buscar dados do usuário:', error)
          toast.error('Erro ao buscar dados do usuário')
          router.push('/dashboard')
          return
        }
        
        if (data.role !== 'admin') {
          console.log('Usuário não é admin:', data.role)
          toast.error('Acesso não autorizado')
          router.push('/dashboard')
          return
        }

        console.log('Usuário é admin, carregando dados...')
        setUser(data)
        
        // Tentar atualizar os cultos primeiro
        try {
          console.log('Tentando atualizar os cultos...')
          const { data: updateData, error: updateError } = await supabase.rpc('http_auto_manage_services')
          
          if (updateError) {
            console.error('Erro ao atualizar cultos:', updateError)
          } else {
            console.log('Cultos atualizados com sucesso:', updateData)
          }
        } catch (updateError) {
          console.error('Erro ao atualizar cultos:', updateError)
        }
        
        // Carregar os dados
        await loadData()
      } catch (error) {
        console.error('Erro ao verificar usuário:', error)
        toast.error('Erro ao verificar usuário')
        router.push('/login')
      }
    }

    checkUser()
  }, [router])

  const loadData = async () => {
    setLoading(true)
    try {
      console.log('Iniciando carregamento de dados...')
      
      // Verificar se o usuário está autenticado
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('Sessão não encontrada')
        toast.error('Sessão expirada. Faça login novamente.')
        router.push('/login')
        return
      }
      
      console.log('Sessão válida, token:', session.access_token.substring(0, 10) + '...')
      
      // Carregar serviços regulares usando fetch direto
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ntbkptgsbqcfoxamktzm.supabase.co'
      const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50YmtwdGdzYnFjZm94YW1rdHptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0NTMxMTksImV4cCI6MjA1NjAyOTExOX0.yngWaJMwaRhSyNMzTwRk8h0SlEDBBCyJgP7dtj2dKnU'
      
      console.log('Carregando serviços regulares via fetch direto...')
      const regularResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_regular_services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      })
      
      if (!regularResponse.ok) {
        const errorData = await regularResponse.json()
        throw new Error(`Erro na resposta: ${regularResponse.status} - ${JSON.stringify(errorData)}`)
      }
      
      const regularData = await regularResponse.json()
      console.log('Serviços regulares carregados:', regularData?.length || 0)
      
      // Também carregar serviços regulares diretamente da tabela como backup
      console.log('Carregando serviços regulares diretamente da tabela como backup...')
      const { data: backupRegularData, error: backupRegularError } = await supabase
        .from('service_schedules')
        .select('*')
        .order('date', { ascending: true })
      
      if (backupRegularError) {
        console.error('Erro ao carregar serviços regulares de backup:', backupRegularError)
      } else {
        console.log('Serviços regulares de backup carregados:', backupRegularData?.length || 0)
      }
      
      // Usar os dados de backup se os dados principais estiverem vazios
      const finalRegularData = regularData?.length > 0 ? regularData : (backupRegularData || [])
      console.log('Total final de serviços regulares:', finalRegularData.length)
      
      // Carregar serviços especiais
      console.log('Carregando serviços especiais...')
      const { data: specialData, error: specialError } = await supabase
        .from('special_services')
        .select('*')
        .order('date', { ascending: true })

      if (specialError) {
        console.error('Erro ao carregar serviços especiais:', specialError)
        throw specialError
      }
      
      console.log('Serviços especiais carregados:', specialData?.length || 0)

      // Carregar conteúdos para os serviços
      console.log('Carregando conteúdos...')
      const serviceIds = finalRegularData.map((service: ServiceSchedule) => service.id)
      
      if (serviceIds.length === 0) {
        console.log('Nenhum serviço regular encontrado para carregar conteúdos')
        setRegularServices([])
        setSpecialServices(specialData || [])
        setContents({})
        setAttachments({})
        setLoading(false)
        return
      }
      
      const { data: contentData, error: contentError } = await supabase
        .from('department_contents')
        .select('*, department:department_id(name)')
        .in('service_id', serviceIds)

      if (contentError) {
        console.error('Erro ao carregar conteúdos:', contentError)
        throw contentError
      }
      
      console.log('Conteúdos carregados:', contentData?.length || 0)

      // Organizar conteúdos por serviço
      const contentsByService: {[key: string]: DepartmentContent[]} = {}
      if (contentData && contentData.length > 0) {
        contentData.forEach((content: any) => {
          if (!contentsByService[content.service_id]) {
            contentsByService[content.service_id] = []
          }
          contentsByService[content.service_id].push({
            ...content,
            department_name: content.department?.name
          })
        })
      }

      // Carregar anexos para os conteúdos
      console.log('Carregando anexos...')
      const contentIds = contentData ? contentData.map((content: any) => content.id) : []
      
      if (contentIds.length === 0) {
        console.log('Nenhum conteúdo encontrado para carregar anexos')
        setRegularServices(finalRegularData)
        setSpecialServices(specialData || [])
        setContents(contentsByService)
        setAttachments({})
        setLoading(false)
        return
      }
      
      const { data: attachmentData, error: attachmentError } = await supabase
        .from('file_attachments')
        .select('*')
        .in('content_id', contentIds)

      if (attachmentError) {
        console.error('Erro ao carregar anexos:', attachmentError)
        throw attachmentError
      }
      
      console.log('Anexos carregados:', attachmentData?.length || 0)

      // Organizar anexos por conteúdo
      const attachmentsByContent: {[key: string]: FileAttachment[]} = {}
      if (attachmentData && attachmentData.length > 0) {
        attachmentData.forEach((attachment: FileAttachment) => {
          if (!attachmentsByContent[attachment.content_id]) {
            attachmentsByContent[attachment.content_id] = []
          }
          attachmentsByContent[attachment.content_id].push(attachment)
        })
      }

      console.log('Finalizando carregamento de dados...')
      setRegularServices(finalRegularData)
      setSpecialServices(specialData || [])
      setContents(contentsByService)
      setAttachments(attachmentsByContent)
      console.log('Dados carregados com sucesso!')
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  // Função para atualizar os cultos regulares
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
      console.log('Cultos regulares atualizados com sucesso:', data)
      toast.success('Cultos regulares atualizados com sucesso')
      
      console.log('Recarregando dados...')
      await loadData() // Recarregar os dados após a atualização
    } catch (error) {
      console.error('Erro ao atualizar cultos regulares:', error)
      toast.error('Erro ao atualizar cultos regulares')
    } finally {
      setIsUpdatingServices(false)
      console.log('Processo de atualização finalizado')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const getServiceTypeLabel = (type: string) => {
    const types: {[key: string]: string} = {
      'sunday': 'Domingo',
      'wednesday': 'Quarta-feira',
      'saturday': 'Sábado'
    }
    return types[type] || type
  }

  const getStatusLabel = (status: string) => {
    const statuses: {[key: string]: string} = {
      'open': 'Aberto',
      'closed': 'Fechado',
      'scheduled': 'Agendado',
      'canceled': 'Cancelado',
      'completed': 'Concluído'
    }
    return statuses[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: {[key: string]: string} = {
      'open': 'bg-green-100 text-green-800',
      'closed': 'bg-red-100 text-red-800',
      'scheduled': 'bg-blue-100 text-blue-800',
      'canceled': 'bg-red-100 text-red-800',
      'completed': 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Informações dos Cultos</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 mr-2"
              >
                Voltar
              </button>
              <button
                onClick={() => router.push('/dashboard/services/regular')}
                className={`mr-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                Editar Cultos Regulares
              </button>
              <button
                onClick={loadData}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sobre os Cultos Regulares</h3>
            <p className="text-sm text-gray-600">
              Os cultos regulares são gerenciados automaticamente pelo sistema. Novos cultos são adicionados para as próximas 8 semanas e os cultos passados são marcados como fechados. 
              Você pode atualizar manualmente os cultos clicando no botão "Atualizar Cultos" acima.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Cultos Regulares Agendados/Abertos</h2>
            {regularServices.filter(service => ['open', 'scheduled'].includes(service.status)).length === 0 ? (
              <p className="text-gray-500">Nenhum culto regular agendado ou aberto.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {regularServices
                  .filter(service => ['open', 'scheduled'].includes(service.status))
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map(service => (
                    <div key={service.id} className="bg-white shadow overflow-hidden rounded-lg">
                      <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {getServiceTypeLabel(service.type)}
                          </h3>
                          <p className="mt-1 text-sm text-gray-500">
                            {formatDate(service.date)} às {service.time.substring(0, 5)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(service.status)}`}>
                          {getStatusLabel(service.status)}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                        <h4 className="text-md font-medium text-gray-900 mb-2">Conteúdos:</h4>
                        {contents[service.id] && contents[service.id].length > 0 ? (
                          <div className="space-y-4">
                            {contents[service.id].map(content => (
                              <div key={content.id} className="bg-gray-50 p-3 rounded-md">
                                <div className="flex justify-between">
                                  <h5 className="font-medium">{content.department_name}</h5>
                                </div>
                                <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
                                  {content.content}
                                </div>
                                {attachments[content.id] && attachments[content.id].length > 0 && (
                                  <div className="mt-2">
                                    <h6 className="text-xs font-medium text-gray-500">Anexos:</h6>
                                    <ul className="mt-1 space-y-1">
                                      {attachments[content.id].map(attachment => (
                                        <li key={attachment.id}>
                                          <a 
                                            href={attachment.file_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-indigo-600 hover:text-indigo-900"
                                          >
                                            {attachment.filename || attachment.description}
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Nenhum conteúdo adicionado.</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Cultos Especiais</h2>
            {specialServices.length === 0 ? (
              <p className="text-gray-500">Nenhum culto especial agendado.</p>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {specialServices.map(service => (
                  <div key={service.id} className="bg-white shadow overflow-hidden rounded-lg">
                    <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {service.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {formatDate(service.date)} às {service.time.substring(0, 5)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(service.status)}`}>
                        {getStatusLabel(service.status)}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                      {service.description ? (
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {service.description}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Sem descrição.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 