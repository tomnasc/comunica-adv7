import { NextRequest, NextResponse } from 'next/server'

// Configuração correta para Next.js App Router
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Obter token de acesso usando o refresh token
    const accessToken = await getAccessToken();
    
    // Retornar o token de acesso e o ID da pasta
    return NextResponse.json({
      accessToken,
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
      expiresIn: 3600 // 1 hora
    });
    
  } catch (error) {
    console.error('Erro ao obter token de acesso:', error);
    
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

/**
 * Obtém um token de acesso usando o refresh token
 * @returns Token de acesso
 */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Credenciais do Google Drive não configuradas');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    let errorText = await response.text();
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(`Erro ao obter token de acesso: ${JSON.stringify(errorData)}`);
    } catch (e) {
      throw new Error(`Erro ao obter token de acesso: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}...`);
    }
  }

  const data = await response.json();
  return data.access_token;
} 