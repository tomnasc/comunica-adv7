import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configuração correta para Next.js App Router
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Máximo permitido para o plano hobby do Vercel

// Inicializa o cliente Supabase Admin com a chave de serviço
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    console.log('Iniciando processamento de upload para arquivos grandes')
    
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

    // Gerar um nome único para o arquivo
    const fileExt = file.name.split('.').pop()
    const fileName = `large-files/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`

    // Converter o arquivo para buffer
    console.log('Convertendo arquivo para buffer...')
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    console.log(`Buffer criado com sucesso: ${buffer.length} bytes`)

    // Fazer upload para o Supabase Storage
    console.log('Iniciando upload para o Supabase Storage...')
    const { data, error } = await supabaseAdmin.storage
      .from('attachments')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Erro ao fazer upload para o Supabase Storage:', error)
      return NextResponse.json(
        { error: `Erro ao fazer upload: ${error.message}` },
        { status: 500 }
      )
    }

    // Gerar URL pública para o arquivo
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('attachments')
      .getPublicUrl(fileName)

    console.log('Upload para o Supabase Storage concluído com sucesso:', publicUrl)

    return NextResponse.json({
      success: true,
      fileUrl: publicUrl,
      fileName: file.name,
      fileSize: file.size
    })
  } catch (error) {
    console.error('Erro ao processar upload para o Supabase Storage:', error)
    
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