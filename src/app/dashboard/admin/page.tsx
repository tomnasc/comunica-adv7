'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import type { User } from '@/types'

export default function AdminPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
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

        if (data.role !== 'admin') {
          toast.error('Acesso negado. Apenas administradores podem acessar esta página.')
          router.push('/dashboard')
          return
        }

        setUser(data)
      } else {
        router.push('/login')
      }
    }

    getUser()
  }, [router])

  const handleUpdateBucketConfig = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/update-bucket-config')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar configurações do bucket')
      }
      
      toast.success('Configurações do bucket atualizadas com sucesso')
    } catch (error) {
      console.error('Erro:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar configurações do bucket')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Painel de Administração</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Gerenciar Anexos</h2>
            <p className="text-sm text-gray-500">
              Atualize as configurações do bucket para permitir novos tipos de arquivos
            </p>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">
              Clique no botão abaixo para atualizar as configurações do bucket e permitir o upload de arquivos de áudio (MP3, WAV, OGG).
            </p>
          </div>
          <div className="p-4 bg-gray-50">
            <button 
              onClick={handleUpdateBucketConfig} 
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Atualizar Configurações do Bucket'
              )}
            </button>
          </div>
        </div>
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold">Corrigir Anexos</h2>
            <p className="text-sm text-gray-500">
              Verificar e corrigir URLs de anexos existentes
            </p>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-500 mb-4">
              Se você estiver enfrentando problemas com anexos existentes, clique no botão abaixo para verificar e corrigir as URLs.
            </p>
          </div>
          <div className="p-4 bg-gray-50">
            <a 
              href="/api/fix-attachments"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 inline-block"
            >
              Verificar e Corrigir Anexos
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 