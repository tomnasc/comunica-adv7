import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getWelcomeEmailTemplate } from './email-template'
import nodemailer from 'nodemailer'

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

// Configuração do transporte de email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function POST(request: Request) {
  try {
    const { email, password, name, isNewUser = false } = await request.json()
    
    console.log(`Enviando email com os dados: email: '${email}', password: '${password}', name: '${name}' ${isNewUser ? '(novo usuário)' : '(usuário existente)'}`)

    // Se for um novo usuário, criar no Auth
    if (isNewUser) {
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
    }

    // Gera o HTML do email usando o template
    const emailHtml = getWelcomeEmailTemplate(name, email, password)

    // Envia o email usando Nodemailer em vez do Supabase
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to: email,
      subject: isNewUser ? 'Bem-vindo ao Sistema de Comunicação ADV7' : 'Nova senha para o Sistema de Comunicação ADV7',
      html: emailHtml
    }

    const result = await transporter.sendMail(mailOptions)
    console.log('Email enviado com sucesso:', result)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar email' },
      { status: 500 }
    )
  }
} 