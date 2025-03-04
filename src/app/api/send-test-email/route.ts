import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

console.log('Usando cliente Supabase Admin centralizado')

export async function POST() {
  try {
    console.log('Iniciando tentativa de envio de e-mail...')

    const { data, error } = await supabaseAdmin.auth.resetPasswordForEmail('tomnasc@icloud.com')

    if (error) {
      console.error('Erro ao enviar e-mail:', {
        message: error.message,
        status: error.status
      })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('E-mail enviado com sucesso:', data)
    return NextResponse.json({ message: 'E-mail enviado com sucesso!', data })
  } catch (error: any) {
    console.error('Erro não tratado ao enviar e-mail:', {
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
} 