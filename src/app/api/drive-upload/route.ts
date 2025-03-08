import { NextRequest, NextResponse } from 'next/server'
import { uploadToDrive } from '@/lib/googleDriveService'

// Configuração correta para Next.js App Router
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Máximo permitido para o plano hobby do Vercel

// ID da pasta no Google Drive onde os arquivos serão armazenados
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

export async function POST(request: NextRequest) {
  try {
    console.log('Iniciando upload para o Google Drive');
    
    // Processar o formulário multipart para obter os dados do arquivo
    const formData = await request.formData();
    
    const file = formData.get('file') as File;
    const contentId = formData.get('contentId') as string;
    
    if (!file || !contentId) {
      console.log('Parâmetros incompletos');
      return NextResponse.json(
        { error: 'Parâmetros incompletos' },
        { status: 400 }
      );
    }

    console.log(`Recebido arquivo ${file.name} para o conteúdo ${contentId}`);
    
    // Converter o arquivo para buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Fazer upload para o Google Drive
    const fileUrl = await uploadToDrive(
      buffer,
      file.name,
      file.type,
      DRIVE_FOLDER_ID
    );
    
    console.log('Upload para o Google Drive concluído com sucesso:', fileUrl);
    
    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: file.size
    });
    
  } catch (error) {
    console.error('Erro ao processar upload para o Google Drive:', error);
    
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