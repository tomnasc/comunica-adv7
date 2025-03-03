'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import type { User, DepartmentContent, ServiceSchedule, FileAttachment } from '@/types'

type ContentWithService = DepartmentContent & {
  service_schedules: ServiceSchedule
  file_attachments: FileAttachment[]
}

export default function ContentListPage() {
  const router = useRouter()
  const [contents, setContents] = useState<ContentWithService[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

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

        setUser(data)
        await loadContents(data.id)
      }
    }

    getUser()
  }, [])

  const loadContents = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('department_contents')
        .select(`
          *,
          service_schedules (*),
          file_attachments (*)
        `)
        .eq('department_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setContents(data)
    } catch (error: any) {
      console.error('Erro ao carregar conteúdos:', error)
      toast.error('Erro ao carregar conteúdos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (contentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este conteúdo?')) return

    try {
      const { error } = await supabase
        .from('department_contents')
        .delete()
        .eq('id', contentId)

      if (error) throw error

      toast.success('Conteúdo excluído com sucesso!')
      setContents(contents.filter(content => content.id !== contentId))
    } catch (error: any) {
      console.error('Erro ao excluir conteúdo:', error)
      toast.error('Erro ao excluir conteúdo')
    }
  }

  if (isLoading || !user) {
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
            <h1 className="text-2xl font-semibold text-gray-900">Meus Conteúdos</h1>
            <button
              onClick={() => router.push('/dashboard/content/new')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Adicionar Novo
            </button>
          </div>

          {contents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum conteúdo encontrado</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {contents.map((content) => (
                  <li key={content.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            Culto: {new Date(content.service_schedules.date).toLocaleDateString('pt-BR')} - {content.service_schedules.time.split(':').slice(0, 2).join(':')}
                          </h3>
                          <p className="mt-2 text-sm text-gray-600">{content.content}</p>
                          
                          {content.file_attachments.length > 0 && (
                            <div className="mt-3">
                              <h4 className="text-sm font-medium text-gray-700">Anexos:</h4>
                              <ul className="mt-2 space-y-2">
                                {content.file_attachments.map((file) => (
                                  <li key={file.id} className="flex items-center space-x-2">
                                    <a
                                      href={file.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-indigo-600 hover:text-indigo-900"
                                    >
                                      {file.filename}
                                    </a>
                                    <span className="text-sm text-gray-500">- {file.description}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="ml-4 flex items-center space-x-4">
                          <button
                            onClick={() => handleDelete(content.id)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <div className="flex items-center text-sm text-gray-500">
                          <span>
                            Enviado em: {new Date(content.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 