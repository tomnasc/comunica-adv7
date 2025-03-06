import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getWelcomeEmailTemplate } from './email-template'
import nodemailer from 'nodemailer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 10 // 10 segundos é suficiente para esta operação

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

// Função para criar o transporter do nodemailer com configurações robustas
const createTransporter = () => {
  // Imprimir todas as variáveis de ambiente relacionadas ao SMTP para debug
  console.log('Variáveis de ambiente SMTP:')
  console.log('SMTP_HOST:', process.env.SMTP_HOST || 'não definido')
  console.log('SMTP_PORT:', process.env.SMTP_PORT || 'não definido')
  console.log('SMTP_USER:', process.env.SMTP_USER || 'não definido')
  console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? '[definido]' : 'não definido')
  console.log('SMTP_SECURE:', process.env.SMTP_SECURE || 'não definido')
  console.log('FROM_EMAIL:', process.env.FROM_EMAIL || 'não definido')
  
  const secure = process.env.SMTP_SECURE === 'true'
  const port = Number(process.env.SMTP_PORT || 587)
  
  console.log(`Configurando SMTP: ${process.env.SMTP_HOST}:${port} (secure: ${secure})`)
  
  // Verificar se as variáveis essenciais estão definidas
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('Configurações SMTP incompletas. Verifique as variáveis de ambiente.')
    throw new Error('Configurações SMTP incompletas')
  }
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: port,
    secure: secure, // true para 465, false para outras portas
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      // Não falhar em certificados inválidos
      rejectUnauthorized: false
    },
    // Aumentar timeout para evitar erros de conexão
    connectionTimeout: 10000,
    // Aumentar timeout para comandos
    greetingTimeout: 10000,
    socketTimeout: 10000,
  })
}

export async function POST(request: Request) {
  try {
    const { email, password, name, isNewUser = false } = await request.json()
    
    console.log(`Enviando email com os dados: email: '${email}', password: '${password}', name: '${name}' ${isNewUser ? '(novo usuário)' : '(usuário existente)'}`)

    // Se for um novo usuário, criar no Auth
    if (isNewUser) {
      try {
        // Verificar se o usuário já existe
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(user => 
          user.email?.toLowerCase() === email.toLowerCase()
        )
        
        if (existingUser) {
          console.log(`Usuário ${email} já existe no Auth, não será criado novamente`)
        } else {
          // Criar novo usuário apenas se não existir
          const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name }
          })

          if (createError) {
            console.error('Erro ao criar usuário:', createError)
            // Não lançar erro se o usuário já existir
            if (!createError.message.includes('already been registered')) {
              throw createError
            } else {
              console.log(`Usuário ${email} já existe, continuando com o envio do email`)
            }
          }
        }
      } catch (error: any) {
        // Ignorar erro de usuário já existente
        if (error.message && !error.message.includes('already been registered')) {
          throw error
        } else {
          console.log(`Erro ignorado: ${error.message}`)
        }
      }
    }

    // Gera o HTML do email usando o template
    const emailHtml = getWelcomeEmailTemplate(name, email, password)

    // Tenta enviar o email, mas retorna a senha mesmo se falhar
    let emailEnviado = false
    let emailErro = null
    
    try {
      // Cria o transporter para envio de email
      const transporter = createTransporter()
      
      // Testa a conexão antes de enviar
      try {
        await transporter.verify()
        console.log('Conexão SMTP verificada com sucesso')
      } catch (verifyError) {
        console.error('Erro ao verificar conexão SMTP:', verifyError)
        // Continua mesmo com erro na verificação
      }

      // Envia o email
      const mailOptions = {
        from: process.env.FROM_EMAIL,
        to: email,
        subject: isNewUser ? 'Bem-vindo ao Sistema de Comunicação ADV7' : 'Nova senha para o Sistema de Comunicação ADV7',
        html: emailHtml
      }

      console.log('Enviando email para:', email)
      const result = await transporter.sendMail(mailOptions)
      console.log('Email enviado com sucesso:', result)
      emailEnviado = true
    } catch (emailError: any) {
      console.error('Erro ao enviar email:', emailError)
      emailErro = emailError.message || 'Erro desconhecido ao enviar email'
    }

    // Retorna sucesso mesmo se o email falhar, mas inclui informações sobre o status do email
    return NextResponse.json({ 
      success: true,
      emailEnviado,
      emailErro,
      // Inclui a senha na resposta para que o frontend possa mostrar ao usuário
      // caso o email não tenha sido enviado
      senhaTemporaria: emailEnviado ? undefined : password
    })
  } catch (error: any) {
    console.error('Erro ao processar requisição:', error)
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar email' },
      { status: 500 }
    )
  }
} 