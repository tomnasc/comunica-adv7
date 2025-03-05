import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    // Inicializar o cliente Supabase com a chave de serviço para ter acesso total
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Verificar autenticação
    const { data: { user } } = await supabaseAdmin.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se o usuário é administrador
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar se o bucket existe
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()
    
    if (bucketsError) {
      return NextResponse.json({ error: `Erro ao listar buckets: ${bucketsError.message}` }, { status: 500 })
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === 'attachments')
    
    if (!bucketExists) {
      try {
        // Usar SQL direto para criar o bucket, evitando problemas de RLS
        const { error: sqlError } = await supabaseAdmin.rpc('create_storage_bucket', {
          bucket_name: 'attachments',
          is_public: true
        })
        
        if (sqlError) {
          return NextResponse.json({ error: `Erro ao criar bucket via RPC: ${sqlError.message}` }, { status: 500 })
        }
      } catch (createError: any) {
        return NextResponse.json({ error: `Erro ao criar bucket: ${createError.message}` }, { status: 500 })
      }
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

    // Processar cada anexo
    for (const attachment of attachments) {
      try {
        // Extrair o caminho do arquivo do URL atual
        let filePath = ''
        
        if (attachment.file_url) {
          // Extrair o caminho do arquivo do URL atual
          const urlParts = attachment.file_url.split('/')
          const bucketIndex = urlParts.findIndex((part: string) => part === 'attachments')
          
          if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
            filePath = urlParts.slice(bucketIndex + 1).join('/')
          } else {
            // Se não conseguir extrair o caminho, usar o nome do arquivo
            filePath = attachment.file_name
          }
        } else {
          // Se não houver URL, usar o nome do arquivo
          filePath = attachment.file_name
        }

        // Verificar se o arquivo existe no bucket
        const { data: fileExists, error: fileExistsError } = await supabaseAdmin.storage
          .from('attachments')
          .list('', {
            search: filePath
          })

        if (fileExistsError) {
          results.errors++
          results.details.push({
            id: attachment.id,
            status: 'error',
            message: `Erro ao verificar arquivo: ${fileExistsError.message}`,
            file_name: attachment.file_name
          })
          continue
        }

        // Se o arquivo não existir no bucket, pular
        if (!fileExists || fileExists.length === 0) {
          results.skipped++
          results.details.push({
            id: attachment.id,
            status: 'skipped',
            message: 'Arquivo não encontrado no bucket',
            file_name: attachment.file_name
          })
          continue
        }

        // Gerar URL público
        const { data: publicUrl } = supabaseAdmin.storage
          .from('attachments')
          .getPublicUrl(filePath)

        // Atualizar o registro com o novo URL
        const { error: updateError } = await supabaseAdmin
          .from('file_attachments')
          .update({ file_url: publicUrl.publicUrl })
          .eq('id', attachment.id)

        if (updateError) {
          results.errors++
          results.details.push({
            id: attachment.id,
            status: 'error',
            message: `Erro ao atualizar URL: ${updateError.message}`,
            file_name: attachment.file_name
          })
        } else {
          results.updated++
          results.details.push({
            id: attachment.id,
            status: 'updated',
            message: 'URL atualizado com sucesso',
            file_name: attachment.file_name,
            old_url: attachment.file_url,
            new_url: publicUrl.publicUrl
          })
        }
      } catch (error: any) {
        results.errors++
        results.details.push({
          id: attachment.id,
          status: 'error',
          message: `Erro inesperado: ${error.message}`,
          file_name: attachment.file_name
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