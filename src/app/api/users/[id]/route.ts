import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verificar se o usuário atual é admin
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (userError || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Primeiro, verificar se o usuário existe e não é o próprio admin
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('*')
      .eq('id', params.id)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    if (targetUser.id === authUser.id) {
      return NextResponse.json(
        { error: 'Não é possível excluir seu próprio usuário' },
        { status: 400 }
      )
    }

    // Deletar usuário da tabela users usando o cliente admin
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', params.id)

    if (dbError) throw dbError

    // Deletar usuário do Auth usando o cliente admin
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(params.id)

    if (authError) {
      console.error('Erro ao deletar usuário do Auth:', authError)
      // Continuar mesmo se falhar a deleção do Auth
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir usuário' },
      { status: 500 }
    )
  }
} 