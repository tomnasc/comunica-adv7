import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configuração correta para Next.js App Router
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Máximo permitido para o plano hobby do Vercel

// Tamanho máximo do arquivo final (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

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

// Armazenamento temporário em memória para os chunks
// Chave: fileId, Valor: Map de chunkIndex para Buffer
const tempStorage = new Map<string, Map<number, Buffer>>();

export async function POST(request: NextRequest) {
  try {
    console.log('Iniciando processamento de chunk upload')
    
    // Processar o formulário multipart primeiro para obter os dados do arquivo
    const formData = await request.formData()
    
    const chunkIndex = formData.get('chunkIndex')
    const totalChunks = formData.get('totalChunks')
    const fileName = formData.get('fileName')
    const fileType = formData.get('fileType')
    const fileId = formData.get('fileId')
    const chunk = formData.get('chunk') as File
    
    if (!chunkIndex || !totalChunks || !fileName || !fileId || !chunk) {
      console.log('Parâmetros incompletos')
      return NextResponse.json(
        { error: 'Parâmetros incompletos' },
        { status: 400 }
      )
    }

    const chunkIndexNum = Number(chunkIndex);
    const totalChunksNum = Number(totalChunks);

    console.log(`Recebido chunk ${chunkIndexNum} de ${totalChunksNum} para o arquivo ${fileName}`)
    
    // Armazenar o chunk na memória
    if (!tempStorage.has(fileId.toString())) {
      tempStorage.set(fileId.toString(), new Map<number, Buffer>());
    }
    
    const fileChunks = tempStorage.get(fileId.toString())!;
    const buffer = Buffer.from(await chunk.arrayBuffer());
    fileChunks.set(chunkIndexNum, buffer);
    
    // Se for o último chunk, combinar todos os chunks e fazer upload para o Supabase
    if (chunkIndexNum === totalChunksNum - 1) {
      console.log(`Recebido último chunk para ${fileName}, combinando...`)
      
      // Verificar se temos todos os chunks
      if (fileChunks.size !== totalChunksNum) {
        console.error(`Faltam chunks: recebidos ${fileChunks.size} de ${totalChunksNum}`);
        return NextResponse.json(
          { error: `Faltam chunks: recebidos ${fileChunks.size} de ${totalChunksNum}` },
          { status: 400 }
        );
      }
      
      // Combinar todos os chunks
      const chunks = [];
      let totalSize = 0;
      
      for (let i = 0; i < totalChunksNum; i++) {
        const chunkData = fileChunks.get(i);
        if (!chunkData) {
          console.error(`Chunk ${i} não encontrado`);
          return NextResponse.json(
            { error: `Chunk ${i} não encontrado` },
            { status: 400 }
          );
        }
        totalSize += chunkData.length;
        chunks.push(chunkData);
      }
      
      // Verificar se o tamanho total não excede o limite
      if (totalSize > MAX_FILE_SIZE) {
        console.error(`Arquivo muito grande: ${totalSize} bytes (limite: ${MAX_FILE_SIZE} bytes)`)
        
        // Limpar os chunks da memória
        tempStorage.delete(fileId.toString());
        
        return NextResponse.json(
          { error: `O arquivo é muito grande. O tamanho máximo permitido é ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
          { status: 413 }
        )
      }
      
      const completeFileBuffer = Buffer.concat(chunks);
      console.log(`Arquivo combinado: ${fileName}, tamanho: ${completeFileBuffer.length} bytes`);
      
      // Gerar um nome único para o arquivo
      const fileExt = fileName.toString().split('.').pop();
      const uniqueFileName = `large-files/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      
      // Fazer upload para o Supabase Storage usando o cliente Admin
      console.log('Iniciando upload para o Supabase Storage usando a chave de serviço...');
      const { data, error } = await supabaseAdmin.storage
        .from('attachments')
        .upload(uniqueFileName, completeFileBuffer, {
          contentType: fileType?.toString() || 'application/octet-stream',
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Erro ao fazer upload para o Supabase Storage:', error);
        return NextResponse.json(
          { error: `Erro ao fazer upload: ${error.message}` },
          { status: 500 }
        );
      }
      
      // Gerar URL pública para o arquivo
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('attachments')
        .getPublicUrl(uniqueFileName);
      
      console.log('Upload para o Supabase Storage concluído com sucesso:', publicUrl);
      
      // Limpar os chunks da memória
      tempStorage.delete(fileId.toString());
      
      return NextResponse.json({
        success: true,
        fileUrl: publicUrl,
        fileName: fileName,
        fileSize: completeFileBuffer.length,
        isComplete: true
      });
    }
    
    // Se não for o último chunk, retornar sucesso parcial
    return NextResponse.json({
      success: true,
      chunkIndex,
      totalChunks,
      isComplete: false
    });
    
  } catch (error) {
    console.error('Erro ao processar chunk upload:', error);
    
    // Melhorar a mensagem de erro
    let errorMessage = 'Erro interno do servidor';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      try {
        errorMessage = JSON.stringify(error);
      } catch (e) {
        errorMessage = 'Erro não serializável';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 