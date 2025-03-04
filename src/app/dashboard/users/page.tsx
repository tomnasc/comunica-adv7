'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import { createClient } from '@supabase/supabase-js'
import type { User } from '@/types'

// Cria cliente Supabase com a chave de serviço para operações administrativas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    role: ''
  })
  const [sortConfig, setSortConfig] = useState({
    key: 'name' as keyof User,
    direction: 'asc' as 'asc' | 'desc'
  })
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    department: '',
    role: 'user',
    password: ''
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
          window.location.href = '/dashboard'
          return
        }

        setCurrentUser(data)
        await loadUsers()
      }
    }

    getUser()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, filters])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name')

      if (error) throw error

      setUsers(data)
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error)
      toast.error('Erro ao carregar usuários')
    } finally {
      setIsLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = [...users]

    // Aplicar filtro de busca
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.department.toLowerCase().includes(searchLower)
      )
    }

    // Aplicar filtro de departamento
    if (filters.department) {
      filtered = filtered.filter(user => user.department === filters.department)
    }

    // Aplicar filtro de função
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role)
    }

    // Aplicar ordenação
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key] ?? ''
      const bValue = b[sortConfig.key] ?? ''
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    setFilteredUsers(filtered)
  }

  const handleSort = (key: keyof User) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Função para gerar senha aleatória de 6 dígitos
  const generateRandomPassword = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  // Função para enviar email de boas-vindas
  const sendWelcomeEmail = async (email: string, password: string, name: string) => {
    try {
      console.log('Enviando email com os dados:', { email, password, name });
      const response = await fetch('/api/send-welcome-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Resposta de erro do servidor:', errorData);
        throw new Error(`Erro ao enviar email: ${errorData.error || response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      throw error;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isEditMode) {
        if (showResetPassword) {
          // Gerar nova senha aleatória
          const newPassword = generateRandomPassword()
          
          // Atualizar senha no Supabase Auth usando o cliente admin
          const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            formData.id,
            { password: newPassword }
          )

          if (authError) throw authError

          // Enviar email com nova senha
          await sendWelcomeEmail(formData.email, newPassword, formData.name)
          
          toast.success('Nova senha gerada e enviada por email!')
        }

        // Atualizar usuário existente
        const { error: dbError } = await supabase.rpc('update_user', {
          target_user_id: formData.id,
          user_name: formData.name,
          user_email: formData.email,
          user_department: formData.department,
          user_role: formData.role
        })

        if (dbError) throw dbError

        toast.success('Usuário atualizado com sucesso!')
      } else {
        // Gerar senha aleatória para novo usuário
        const password = generateRandomPassword()

        // Criar novo usuário usando o cliente admin
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: formData.email,
          password: password,
          email_confirm: true
        })

        if (authError) throw authError

        if (!authData.user) {
          throw new Error('Erro ao criar usuário no Auth')
        }

        const { error: dbError } = await supabase.rpc('create_new_user', {
          user_id: authData.user.id,
          user_name: formData.name,
          user_email: formData.email,
          user_department: formData.department,
          user_role: formData.role
        })

        if (dbError) {
          console.error('Erro ao criar usuário no banco:', dbError)
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
          throw dbError
        }

        // Enviar email com as credenciais
        await sendWelcomeEmail(formData.email, password, formData.name)

        toast.success('Usuário criado com sucesso! Um email foi enviado com as credenciais.')
      }

      setIsModalOpen(false)
      setFormData({ id: '', name: '', email: '', department: '', role: 'user', password: '' })
      setIsEditMode(false)
      setShowResetPassword(false)
      await loadUsers()
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error)
      toast.error(error.message || 'Erro ao salvar usuário')
    }
  }

  const handleEdit = (user: User) => {
    setFormData({
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      password: ''
    })
    setIsEditMode(true)
    setIsModalOpen(true)
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return

    try {
      // Primeira etapa: excluir da tabela auth.users usando supabaseAdmin
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (authError) {
        console.error('Erro ao excluir usuário da autenticação:', authError)
        toast.error(`Erro ao excluir usuário do sistema de autenticação: ${authError.message}`)
        return
      }

      // Segunda etapa: excluir da tabela public.users usando a função RPC
      const { data, error: dbError } = await supabase.rpc('delete_user', {
        target_user_id: userId
      })

      if (dbError) {
        console.error('Erro ao excluir usuário do banco de dados:', dbError)
        toast.error(`Usuário excluído da autenticação, mas erro ao excluir do banco de dados: ${dbError.message}`)
        return
      }

      toast.success('Usuário excluído com sucesso de ambos os sistemas!')
      setUsers(users.filter(user => user.id !== userId))
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error)
      toast.error(error.message || 'Erro ao excluir usuário')
    }
  }

  const departments = Array.from(new Set(users.map(user => user.department)))
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)
  const paginatedUsers = filteredUsers.slice(
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
            <h1 className="text-2xl font-semibold text-gray-900">Gerenciar Usuários</h1>
            <button
              onClick={() => {
                setIsEditMode(false)
                setFormData({ id: '', name: '', email: '', department: '', role: 'user', password: '' })
                setIsModalOpen(true)
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Adicionar Usuário
            </button>
          </div>

          {/* Filtros */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <input
              type="text"
              placeholder="Buscar..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <select
              value={filters.department}
              onChange={(e) => setFilters(f => ({ ...f, department: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Todos os Departamentos</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <select
              value={filters.role}
              onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Todas as Funções</option>
              <option value="admin">Administrador</option>
              <option value="user">Usuário</option>
            </select>
          </div>

          {/* Lista de Usuários */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    Nome {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('email')}
                  >
                    Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('department')}
                  >
                    Departamento {sortConfig.key === 'department' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('role')}
                  >
                    Função {sortConfig.key === 'role' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {user.id !== currentUser.id && (
                        <div className="flex justify-end space-x-4">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
                  {isEditMode ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
                </h3>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Nome
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        disabled={isEditMode}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                        Departamento
                      </label>
                      <input
                        type="text"
                        id="department"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                        Função
                      </label>
                      <select
                        id="role"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      >
                        <option value="user">Usuário</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>

                    {isEditMode && (
                      <div className="mt-4">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            checked={showResetPassword}
                            onChange={(e) => setShowResetPassword(e.target.checked)}
                            className="form-checkbox h-5 w-5 text-indigo-600"
                          />
                          <span className="ml-2">Gerar e enviar nova senha por email</span>
                        </label>
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
                        setFormData({ id: '', name: '', email: '', department: '', role: 'user', password: '' })
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