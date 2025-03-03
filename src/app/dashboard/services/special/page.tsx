'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import type { User, SpecialService, ServiceStatus } from '@/types'
import { useRouter } from 'next/navigation'

export default function SpecialServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<SpecialService[]>([])
  const [filteredServices, setFilteredServices] = useState<SpecialService[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState({
    search: '',
    status: '' as ServiceStatus | '',
    date: '',
    startDate: '',
    endDate: ''
  })
  const [sortConfig, setSortConfig] = useState({
    key: 'date' as keyof SpecialService,
    direction: 'asc' as 'asc' | 'desc'
  })
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    description: '',
    date: '',
    time: '',
    deadline: '',
    status: 'scheduled' as ServiceStatus
  })

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
  }, [services, filters, sortConfig])

  const loadServices = async () => {
    try {
      setIsLoading(true)
      
      console.log('Carregando serviços especiais...');
      
      const { data, error } = await supabase
        .from('special_services')
        .select('*')
        .order('date', { ascending: false })

      if (error) {
        console.error('Erro ao carregar cultos especiais:', error)
        throw error
      }

      console.log(`Recebidos ${data?.length || 0} serviços especiais`);
      setServices(data || [])
    } catch (error: any) {
      console.error('Erro ao carregar cultos:', error)
      toast.error('Erro ao carregar cultos')
      setServices([])
    } finally {
      setIsLoading(false)
    }
  }

  const filterServices = () => {
    let filtered = [...services]

    // Aplicar filtro de busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(service => 
        service.title.toLowerCase().includes(searchLower) ||
        (service.description?.toLowerCase() || '').includes(searchLower)
      )
    }

    // Aplicar filtro de status
    if (filters.status) {
      filtered = filtered.filter(service => service.status === filters.status)
    }

    // Aplicar filtro de data específica
    if (filters.date) {
      filtered = filtered.filter(service => service.date === filters.date)
    }

    // Aplicar filtro de intervalo de datas
    if (filters.startDate && filters.endDate) {
      filtered = filtered.filter(service => 
        service.date >= filters.startDate && service.date <= filters.endDate
      )
    } else if (filters.startDate) {
      filtered = filtered.filter(service => service.date >= filters.startDate)
    } else if (filters.endDate) {
      filtered = filtered.filter(service => service.date <= filters.endDate)
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

  const handleSort = (key: keyof SpecialService) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Enviando formulário de culto especial:', formData);
    
    try {
      if (isEditMode) {
        // Atualizar culto existente
        const { error: dbError } = await supabase.rpc('update_special_service', {
          service_id: formData.id,
          service_title: formData.title,
          service_description: formData.description,
          service_date: formData.date,
          service_time: formData.time,
          service_deadline: new Date(formData.deadline).toISOString(),
          service_status: formData.status
        })

        if (dbError) {
          console.error('Erro ao atualizar culto especial:', dbError);
          throw dbError;
        }

        toast.success('Culto atualizado com sucesso!')
      } else {
        // Criar novo culto
        const { error: dbError } = await supabase.rpc('create_special_service', {
          service_title: formData.title,
          service_description: formData.description,
          service_date: formData.date,
          service_time: formData.time,
          service_deadline: new Date(formData.deadline).toISOString()
        })

        if (dbError) {
          console.error('Erro ao criar culto especial:', dbError);
          throw dbError;
        }

        toast.success('Culto criado com sucesso!')
      }

      setIsModalOpen(false)
      setFormData({
        id: '',
        title: '',
        description: '',
        date: '',
        time: '',
        deadline: '',
        status: 'scheduled'
      })
      setIsEditMode(false)
      await loadServices()
    } catch (error: any) {
      console.error('Erro ao salvar culto:', error)
      toast.error(error.message || 'Erro ao salvar culto')
    }
  }

  const handleEdit = (service: SpecialService) => {
    setFormData({
      id: service.id,
      title: service.title,
      description: service.description || '',
      date: service.date,
      time: service.time,
      deadline: service.deadline,
      status: service.status
    })
    setIsEditMode(true)
    setIsModalOpen(true)
  }

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Tem certeza que deseja excluir este culto?')) return

    try {
      const { error: dbError } = await supabase.rpc('delete_special_service', {
        service_id: serviceId
      })

      if (dbError) throw dbError

      toast.success('Culto excluído com sucesso!')
      setServices(services.filter(service => service.id !== serviceId))
    } catch (error: any) {
      console.error('Erro ao excluir culto:', error)
      toast.error(error.message || 'Erro ao excluir culto')
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const formatTime = (time: string) => {
    return time.substring(0, 5) // Remove os segundos
  }

  const formatStatus = (status: ServiceStatus) => {
    const statusMap = {
      scheduled: 'Agendado',
      canceled: 'Cancelado',
      completed: 'Concluído'
    }
    return statusMap[status]
  }

  const formatDeadline = (deadline: string) => {
    return new Date(deadline).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
            <h1 className="text-2xl font-semibold text-gray-900">Cultos Especiais</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  setIsEditMode(false)
                  setFormData({
                    id: '',
                    title: '',
                    description: '',
                    date: '',
                    time: '',
                    deadline: '',
                    status: 'scheduled'
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
            <input
              type="text"
              placeholder="Buscar por título..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as ServiceStatus | '' }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Todos os Status</option>
              <option value="scheduled">Agendado</option>
              <option value="canceled">Cancelado</option>
              <option value="completed">Concluído</option>
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
              <h3 className="text-lg font-medium text-gray-900">Nenhum culto especial encontrado</h3>
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
                      onClick={() => handleSort('title')}
                    >
                      Título {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
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
                  {paginatedServices.length > 0 ? (
                    paginatedServices.map((service) => (
                      <tr key={service.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(service.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {service.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(service.time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDeadline(service.deadline)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            service.status === 'scheduled' ? 'bg-green-100 text-green-800' : 
                            service.status === 'canceled' ? 'bg-red-100 text-red-800' : 
                            'bg-blue-100 text-blue-800'
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
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                        Nenhum culto especial encontrado
                      </td>
                    </tr>
                  )}
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
                  {isEditMode ? 'Editar Culto Especial' : 'Adicionar Novo Culto Especial'}
                </h3>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Título
                      </label>
                      <input
                        type="text"
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Descrição
                      </label>
                      <textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
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

                    {isEditMode && (
                      <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <select
                          id="status"
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value as ServiceStatus })}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                          <option value="scheduled">Agendado</option>
                          <option value="canceled">Cancelado</option>
                          <option value="completed">Concluído</option>
                        </select>
                      </div>
                    )}
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
                          title: '',
                          description: '',
                          date: '',
                          time: '',
                          deadline: '',
                          status: 'scheduled'
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