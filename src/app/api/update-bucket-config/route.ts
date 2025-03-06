import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 10 // 10 segundos é suficiente para esta operação

export async function GET() {
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

    // Verificar se o usuário é admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas administradores podem atualizar configurações.' },
        { status: 403 }
      )
    }

    // Executar a função SQL para atualizar as configurações do bucket
    const { data, error } = await supabase.rpc('admin_update_bucket_mime_types')

    if (error) {
      console.error('Erro ao atualizar configurações do bucket:', error)
      return NextResponse.json(
        { error: `Erro ao atualizar configurações do bucket: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações do bucket atualizadas com sucesso',
      data
    })
  } catch (error) {
    console.error('Erro ao processar a solicitação:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
} 