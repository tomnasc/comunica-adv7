'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'react-hot-toast'
import { supabase } from '@/lib/supabaseClient'
import type { ServiceSchedule, User } from '@/types'

const contentSchema = z.object({
  content: z.string().min(1, 'O conteúdo é obrigatório'),
  service_id: z.string().min(1, 'Selecione um culto'),
  files: z.array(z.object({
    file: z.instanceof(File),
    description: z.string().min(1, 'A descrição é obrigatória')
  })).optional()
})

type ContentForm = z.infer<typeof contentSchema>

export default function NewContentPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [services, setServices] = useState<ServiceSchedule[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [files, setFiles] = useState<{ file: File; description: string }[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<ContentForm>({
    resolver: zodResolver(contentSchema)
  })

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
      }
    }

    const getServices = async () => {
      const { data, error } = await supabase
        .from('service_schedules')
        .select('*')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })

      if (error) {
        toast.error('Erro ao carregar cultos')
        return
      }

      setServices(data)
    }

    getUser()
    getServices()
  }, [])

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (fileList && fileList.length > 0) {
      const newFile = fileList[0]
      setFiles([...files, { file: newFile, description: '' }])
    }
  }

  const handleFileDescriptionChange = (index: number, description: string) => {
    const newFiles = [...files]
    newFiles[index].description = description
    setFiles(newFiles)
    setValue('files', newFiles)
  }

  const handleFileRemove = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    setValue('files', newFiles)
  }

  const onSubmit = async (data: ContentForm) => {
    try {
      setIsLoading(true)

      // Verificar se o prazo do culto já passou
      const service = services.find(s => s.id === data.service_id)
      if (!service) {
        toast.error('Culto não encontrado')
        return
      }

      const deadline = new Date(service.deadline)
      if (deadline < new Date()) {
        toast.error('O prazo para envio de conteúdo para este culto já passou')
        return
      }

      // Criar o conteúdo
      const { data: content, error: contentError } = await supabase
        .from('department_contents')
        .insert({
          service_id: data.service_id,
          department_id: user?.id,
          content: data.content
        })
        .select()
        .single()

      if (contentError) throw contentError

      // Upload dos arquivos
      if (files.length > 0) {
        for (const fileData of files) {
          const fileExt = fileData.file.name.split('.').pop()
          const fileName = `${content.id}/${Math.random()}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .upload(fileName, fileData.file)

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('attachments')
            .getPublicUrl(fileName)

          const { error: attachmentError } = await supabase
            .from('file_attachments')
            .insert({
              content_id: content.id,
              file_url: publicUrl,
              description: fileData.description,
              filename: fileData.file.name
            })

          if (attachmentError) throw attachmentError
        }
      }

      toast.success('Conteúdo adicionado com sucesso!')
      router.push('/dashboard/content')
    } catch (error: any) {
      console.error('Erro ao adicionar conteúdo:', error)
      toast.error(error.message || 'Erro ao adicionar conteúdo')
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white mx-8 md:mx-0 shadow rounded-3xl sm:p-10">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">
                  Adicionar Conteúdo
                </h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Selecione o Culto
                    </label>
                    <select
                      {...register('service_id')}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="">Selecione...</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {new Date(service.date).toLocaleDateString('pt-BR')} - {service.time.split(':').slice(0, 2).join(':')} ({service.type})
                        </option>
                      ))}
                    </select>
                    {errors.service_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.service_id.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Conteúdo
                    </label>
                    <textarea
                      {...register('content')}
                      rows={4}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Digite o conteúdo aqui..."
                    />
                    {errors.content && (
                      <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Anexos
                    </label>
                    <input
                      type="file"
                      onChange={handleFileAdd}
                      className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-indigo-50 file:text-indigo-700
                        hover:file:bg-indigo-100"
                    />
                  </div>

                  {files.map((file, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <span className="text-sm text-gray-500">{file.file.name}</span>
                      <input
                        type="text"
                        placeholder="Descrição do arquivo"
                        value={file.description}
                        onChange={(e) => handleFileDescriptionChange(index, e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleFileRemove(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remover
                      </button>
                    </div>
                  ))}

                  <div className="pt-5">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => router.back()}
                        className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        {isLoading ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 