/**
 * Utilitário para upload de arquivos para o Google Drive
 */

/**
 * Faz upload de um arquivo para o Google Drive
 * @param file Arquivo a ser enviado
 * @param contentId ID do conteúdo associado ao arquivo
 * @param onProgress Callback para acompanhar o progresso do upload
 * @returns URL do arquivo no Google Drive
 */
export async function uploadToDrive(
  file: File,
  contentId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    // Criar FormData para o arquivo
    const formData = new FormData();
    formData.append('file', file);
    formData.append('contentId', contentId);
    
    console.log(`Iniciando upload para o Google Drive: ${file.name}, tamanho: ${file.size} bytes`);
    
    // Enviar o arquivo para a API
    const response = await fetch('/api/drive-upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro ao fazer upload para o Google Drive`);
    }
    
    const result = await response.json();
    
    // Atualizar o progresso
    if (onProgress) {
      onProgress(100);
    }
    
    console.log('Upload para o Google Drive concluído com sucesso:', result.fileUrl);
    return result.fileUrl;
  } catch (error) {
    console.error('Erro ao fazer upload para o Google Drive:', error);
    throw error;
  }
} 