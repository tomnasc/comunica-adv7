import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { uploadToMega } from '@/lib/megaService'

export const config = {
  api: {
    bodyParser: false,
  },
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Verificar se o usuário está autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Processar o formulário multipart
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      )
    }

    // Verificar o tamanho do arquivo (limite de 500MB)
    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'O arquivo excede o limite de 500MB' },
        { status: 400 }
      )
    }

    // Converter o arquivo para buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Fazer upload para o Mega.io
    const megaLink = await uploadToMega(buffer, file.name)

    return NextResponse.json({
      success: true,
      megaLink,
      fileName: file.name,
      fileSize: file.size
    })
  } catch (error) {
    console.error('Erro ao processar upload para o Mega.io:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 