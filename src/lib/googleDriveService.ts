import { google } from 'googleapis';
import { Readable } from 'stream';

// Configuração do cliente OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Definir as credenciais usando o token de atualização
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// Criar cliente do Google Drive
const drive = google.drive({
  version: 'v3',
  auth: oauth2Client
});

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
    // Criar um stream legível a partir do buffer
    const fileStream = new Readable();
    fileStream.push(file);
    fileStream.push(null); // Indica o fim do stream

    // Configurar os metadados do arquivo
    const fileMetadata: any = {
      name: fileName,
    };

    // Se um ID de pasta for fornecido, adicionar aos metadados
    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    // Configurar os parâmetros da requisição
    const media = {
      mimeType,
      body: fileStream
    };

    // Fazer upload do arquivo
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id,webViewLink'
    });

    // Tornar o arquivo público
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    // Retornar o link para visualização
    return response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`;
  } catch (error) {
    console.error('Erro ao fazer upload para o Google Drive:', error);
    throw new Error(`Erro ao fazer upload para o Google Drive: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
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