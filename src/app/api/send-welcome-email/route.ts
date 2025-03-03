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
    
    // Gera o HTML do email usando o template
    const emailHtml = getWelcomeEmailTemplate(name, email, password)

    // Envia o email usando o Supabase
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        name,
        password,
        email_template: emailHtml
      },
      redirectTo: `${process.env.NEXT_PUBLIC_VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL}/login`
    })

    if (error) {
      console.error('Erro ao enviar email:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar email' },
      { status: 500 }
    )
  }
} 