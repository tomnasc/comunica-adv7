import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { uploadToMega } from '@/lib/megaService'

// Configuração correta para Next.js App Router
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Máximo permitido para o plano hobby do Vercel

export async function POST(request: NextRequest) {
  try {
    console.log('Iniciando processamento de upload para o Mega.io')
    
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Verificar se o usuário está autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('Usuário não autenticado')
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    console.log('Usuário autenticado:', user.email)

    // Processar o formulário multipart
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      console.log('Nenhum arquivo enviado')
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    console.log(`Arquivo recebido: ${file.name}, tamanho: ${file.size} bytes, tipo: ${file.type}`)

    // Verificar o tamanho do arquivo (limite de 500MB)
    if (file.size > 500 * 1024 * 1024) {
      console.log('Arquivo excede o limite de tamanho')
      return NextResponse.json(
        { error: 'O arquivo excede o limite de 500MB' },
        { status: 400 }
      )
    }

    // Converter o arquivo para buffer
    console.log('Convertendo arquivo para buffer...')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log(`Buffer criado com sucesso: ${buffer.length} bytes`)

    // Fazer upload para o Mega.io
    console.log('Iniciando upload para o Mega.io...')
    const megaLink = await uploadToMega(buffer, file.name)
    console.log('Upload para o Mega.io concluído com sucesso:', megaLink)

    return NextResponse.json({
      success: true,
      megaLink,
      fileName: file.name,
      fileSize: file.size
    })
  } catch (error) {
    console.error('Erro ao processar upload para o Mega.io:', error)
    
    // Melhorar a mensagem de erro
    let errorMessage = 'Erro interno do servidor'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object') {
      try {
        errorMessage = JSON.stringify(error)
      } catch (e) {
        errorMessage = 'Erro não serializável'
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
} 