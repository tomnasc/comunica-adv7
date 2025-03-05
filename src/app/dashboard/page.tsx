'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@/types'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          toast.error('Erro ao carregar dados do usuário')
          return
        }

        setUser(data)
      }
    }

    getUser()
  }, [])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error('Erro ao sair')
      return
    }

    router.push('/login')
  }

  if (!user) {
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
              <h1 className="text-xl font-semibold">Comunicação ADV7</h1>
            </div>
            <div className="flex items-center">
              <span className="mr-4">Olá, {user.name}</span>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card para adicionar conteúdo */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900">Adicionar Conteúdo</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Adicione conteúdo para os próximos cultos
                </p>
                <button
                  onClick={() => router.push('/dashboard/content/new')}
                  className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Adicionar
                </button>
              </div>
            </div>

            {/* Card para visualizar conteúdos */}
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900">Meus Conteúdos</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Visualize e gerencie seus conteúdos
                </p>
                <button
                  onClick={() => router.push('/dashboard/content')}
                  className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Visualizar
                </button>
              </div>
            </div>

            {user.role === 'admin' && (
              <>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <h3 className="text-lg font-medium text-gray-900">Gerenciar Usuários</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Gerencie os usuários do sistema
                    </p>
                    <button
                      onClick={() => router.push('/dashboard/users')}
                      className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Gerenciar
                    </button>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <h3 className="text-lg font-medium text-gray-900">Cultos Especiais</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Gerencie os cultos especiais (JA, Santa Ceia, etc.)
                    </p>
                    <button
                      onClick={() => router.push('/dashboard/services/special')}
                      className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Gerenciar
                    </button>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <h3 className="text-lg font-medium text-gray-900">Cultos Regulares</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Gerencie os cultos regulares (Domingo, Quarta, Sábado)
                    </p>
                    <button
                      onClick={() => router.push('/dashboard/services/regular')}
                      className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Gerenciar
                    </button>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <h3 className="text-lg font-medium text-gray-900">Visão Geral dos Cultos</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Visualize todos os cultos e seus conteúdos
                    </p>
                    <button
                      onClick={() => router.push('/dashboard/services/info')}
                      className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Visualizar
                    </button>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <h3 className="text-lg font-medium text-gray-900">Corrigir Anexos</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Corrija problemas com anexos e buckets de armazenamento
                    </p>
                    <button
                      onClick={() => router.push('/dashboard/fix-attachments')}
                      className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Acessar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 