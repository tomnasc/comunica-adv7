/**
 * Serviço para interagir com o Google Drive usando fetch em vez da biblioteca googleapis
 */

/**
 * Faz upload de um arquivo para o Google Drive
 * @param file Buffer do arquivo
 * @param fileName Nome do arquivo
 * @param mimeType Tipo MIME do arquivo
 * @param folderId ID da pasta no Google Drive (opcional)
 * @returns URL pública do arquivo
 */
export async function uploadToDrive(
  file: Buffer,
  fileName: string,
  mimeType: string,
  folderId?: string
): Promise<string> {
  try {
    // Obter token de acesso usando o refresh token
    const accessToken = await getAccessToken();
    
    // Configurar os metadados do arquivo
    const metadata: any = {
      name: fileName,
    };

    // Se um ID de pasta for fornecido, adicionar aos metadados
    if (folderId) {
      metadata.parents = [folderId];
    }

    // Criar um FormData para o upload
    const formData = new FormData();
    
    // Adicionar os metadados como parte do formulário
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    
    // Adicionar o arquivo como parte do formulário
    formData.append('file', new Blob([file], { type: mimeType }));

    // Fazer upload do arquivo usando a API do Google Drive
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao fazer upload para o Google Drive: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    // Tornar o arquivo público
    await makeFilePublic(data.id, accessToken);
    
    // Retornar o link para visualização
    return `https://drive.google.com/file/d/${data.id}/view`;
  } catch (error) {
    console.error('Erro ao fazer upload para o Google Drive:', error);
    throw new Error(`Erro ao fazer upload para o Google Drive: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Torna um arquivo público no Google Drive
 * @param fileId ID do arquivo no Google Drive
 * @param accessToken Token de acesso
 */
async function makeFilePublic(fileId: string, accessToken: string): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Erro ao tornar o arquivo público: ${JSON.stringify(errorData)}`);
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
    const errorData = await response.json();
    throw new Error(`Erro ao obter token de acesso: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Converte um arquivo File para Buffer
 * @param file Arquivo do tipo File
 * @returns Buffer do arquivo
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
} 