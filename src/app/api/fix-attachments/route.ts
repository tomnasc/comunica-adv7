import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

interface AttachmentResult {
  id: string | number;
  status: string;
  message: string;
  file_name: string;
  old_url?: string;
  new_url?: string;
}

interface ProcessResults {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
  details: AttachmentResult[];
}

export async function GET() {
  try {
    // Obter cookies para autenticação
    const cookieStore = cookies()
    
    // Inicializar o cliente Supabase com a chave de serviço para ter acesso total
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: {
          persistSession: false
        }
      }
    )
    
    // Inicializar cliente Supabase com cookies para autenticação do usuário
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        auth: {
          persistSession: true,
          detectSessionInUrl: false,
          autoRefreshToken: true,
          storageKey: 'supabase-auth-token'
        },
        global: {
          headers: {
            cookie: cookieStore.toString()
          }
        }
      }
    )

    // Verificar autenticação usando o cliente com cookies
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se o usuário é administrador
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Obter todos os anexos
    const { data: attachments, error: attachmentsError } = await supabaseAdmin
      .from('file_attachments')
      .select('*')

    if (attachmentsError) {
      return NextResponse.json({ error: `Erro ao obter anexos: ${attachmentsError.message}` }, { status: 500 })
    }

    const results: ProcessResults = {
      total: attachments.length,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: []
    }

    // Verificar se o bucket existe e criar se necessário
    try {
      // Verificar se o bucket existe
      const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()
      
      if (bucketsError) {
        return NextResponse.json({ error: `Erro ao listar buckets: ${bucketsError.message}` }, { status: 500 })
      }
      
      const bucketExists = buckets.some(bucket => bucket.name === 'attachments')
      
      if (!bucketExists) {
        // Criar o bucket diretamente no banco de dados
        const { error: createError } = await supabaseAdmin.rpc('admin_create_bucket', {
          bucket_name: 'attachments',
          is_public: true
        })
        
        if (createError) {
          return NextResponse.json({ 
            error: `Erro ao criar bucket: ${createError.message}`,
            details: 'Execute o script SQL verificar_e_criar_bucket.sql no SQL Editor do Supabase'
          }, { status: 500 })
        }
      }
    } catch (error: any) {
      console.error('Erro ao verificar/criar bucket:', error)
      // Continuar mesmo com erro para tentar corrigir os anexos existentes
    }

    // Processar cada anexo
    for (const attachment of attachments) {
      try {
        // Verificar se o URL já é válido
        let isUrlValid = false
        
        try {
          const response = await fetch(attachment.file_url, { method: 'HEAD' })
          isUrlValid = response.ok
        } catch (e) {
          isUrlValid = false
        }
        
        if (isUrlValid) {
          results.skipped++
          results.details.push({
            id: attachment.id,
            status: 'skipped',
            message: 'URL já é válido',
            file_name: attachment.filename || 'desconhecido'
          })
          continue
        }
        
        // Atualizar o registro com um URL de fallback
        const fallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://comunica-adv7.vercel.app'}/api/fallback-file`
        
        const { error: updateError } = await supabaseAdmin
          .from('file_attachments')
          .update({ 
            file_url: fallbackUrl,
            status: 'missing'
          })
          .eq('id', attachment.id)

        if (updateError) {
          results.errors++
          results.details.push({
            id: attachment.id,
            status: 'error',
            message: `Erro ao atualizar URL: ${updateError.message}`,
            file_name: attachment.filename || 'desconhecido'
          })
        } else {
          results.updated++
          results.details.push({
            id: attachment.id,
            status: 'updated',
            message: 'URL atualizado para fallback',
            file_name: attachment.filename || 'desconhecido',
            old_url: attachment.file_url,
            new_url: fallbackUrl
          })
        }
      } catch (error: any) {
        results.errors++
        results.details.push({
          id: attachment.id,
          status: 'error',
          message: `Erro inesperado: ${error.message}`,
          file_name: attachment.filename || 'desconhecido'
        })
      }
    }

    return NextResponse.json({
      message: `Processo concluído. ${results.updated} anexos atualizados, ${results.skipped} ignorados, ${results.errors} erros.`,
      results
    })
  } catch (error: any) {
    console.error('Erro ao corrigir anexos:', error)
    return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 })
  }
} 