'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@/types'

export default function FixAttachmentsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isFixing, setIsFixing] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
          toast.error('Acesso não autorizado')
          router.push('/login')
          return
        }

        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (error) {
          toast.error('Erro ao carregar dados do usuário')
          router.push('/dashboard')
          return
        }

        if (data.role !== 'admin') {
          toast.error('Acesso não autorizado')
          router.push('/dashboard')
          return
        }

        setUser(data)
      } catch (error) {
        console.error('Erro ao verificar usuário:', error)
        toast.error('Erro ao verificar usuário')
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()
  }, [router])

  const fixAttachments = async () => {
    try {
      setIsFixing(true)
      const response = await fetch('/api/fix-attachments')
      const data = await response.json()
      
      if (response.ok) {
        toast.success(`${data.message}`)
        setResult(data)
      } else {
        toast.error(`Erro: ${data.error}`)
      }
    } catch (error) {
      console.error('Erro ao corrigir anexos:', error)
      toast.error('Erro ao corrigir anexos')
    } finally {
      setIsFixing(false)
    }
  }

  const createBucket = async () => {
    try {
      setIsFixing(true)
      
      // Chamar a função RPC para criar o bucket
      const { error } = await supabase.rpc('create_storage_bucket', {
        bucket_name: 'attachments',
        is_public: true
      })
      
      if (error) {
        throw error
      }
      
      toast.success('Bucket "attachments" criado com sucesso')
    } catch (error: any) {
      console.error('Erro ao criar bucket:', error)
      toast.error(`Erro ao criar bucket: ${error.message}`)
    } finally {
      setIsFixing(false)
    }
  }

  if (isLoading) {
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
            <h1 className="text-2xl font-semibold text-gray-900">Corrigir Anexos</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Voltar
            </button>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Corrigir problemas com anexos
              </h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>
                  Esta página permite corrigir problemas com anexos, como o erro "Bucket not found".
                </p>
              </div>
              <div className="mt-5 space-y-4">
                <button
                  onClick={createBucket}
                  disabled={isFixing}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isFixing ? 'Criando bucket...' : 'Criar bucket "attachments"'}
                </button>
                
                <button
                  onClick={fixAttachments}
                  disabled={isFixing}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isFixing ? 'Corrigindo anexos...' : 'Corrigir URLs dos anexos'}
                </button>
              </div>
            </div>
          </div>

          {result && (
            <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Resultado
                </h3>
                <div className="mt-2">
                  <pre className="mt-4 bg-gray-50 p-4 rounded-md overflow-auto text-sm">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 