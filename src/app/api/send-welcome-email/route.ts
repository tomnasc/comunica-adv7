import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getWelcomeEmailTemplate } from './email-template'

// Inicializa o cliente Supabase com a chave de serviço
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

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()
    
    // Cria o usuário com a senha fornecida
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    })

    if (createError) {
      console.error('Erro ao criar usuário:', createError)
      throw createError
    }

    // Gera o HTML do email usando o template
    const emailHtml = getWelcomeEmailTemplate(name, email, password)

    // Envia o email usando o serviço de email do Supabase
    const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        name,
        password,
        email_template: emailHtml
      },
      redirectTo: `${process.env.NEXT_PUBLIC_VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL}/login`
    })

    if (emailError) {
      console.error('Erro ao enviar email:', emailError)
      // Se falhar o envio do email, remove o usuário criado
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      throw emailError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao criar usuário e enviar email' },
      { status: 500 }
    )
  }
} 