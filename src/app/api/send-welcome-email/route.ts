import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getWelcomeEmailTemplate } from './email-template'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    // Gerar o HTML do email usando o template
    const emailHtml = getWelcomeEmailTemplate(name, email, password)

    // Enviar email usando a função de email do Supabase
    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        name: name,
        temp_password: password,
        email_template: emailHtml,
        redirect_to: `${process.env.NEXT_PUBLIC_APP_URL}/login`
      }
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao enviar email:', error)
    return NextResponse.json(
      { error: 'Erro ao enviar email' },
      { status: 500 }
    )
  }
} 