/**
 * Utilitário para upload de arquivos em chunks
 */

// Tamanho de cada chunk em bytes (2MB)
const CHUNK_SIZE = 2 * 1024 * 1024;

/**
 * Faz upload de um arquivo em chunks para evitar limites de tamanho
 * @param file Arquivo a ser enviado
 * @param onProgress Callback para acompanhar o progresso do upload
 * @returns URL do arquivo no Supabase Storage
 */
export async function uploadFileInChunks(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Gerar um ID único para o arquivo
  const fileId = Date.now().toString() + Math.random().toString(36).substring(2, 15);
  
  // Calcular o número total de chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  console.log(`Iniciando upload em chunks: ${file.name}, tamanho: ${file.size} bytes, total de chunks: ${totalChunks}`);
  
  // Enviar cada chunk
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);
    
    // Criar FormData para o chunk
    const formData = new FormData();
    formData.append('chunkIndex', i.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('fileName', file.name);
    formData.append('fileType', file.type);
    formData.append('fileId', fileId);
    formData.append('chunk', chunk);
    
    console.log(`Enviando chunk ${i + 1}/${totalChunks} (${chunk.size} bytes)`);
    
    // Enviar o chunk para a API
    const response = await fetch('/api/chunk-upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Erro ao enviar chunk ${i + 1}/${totalChunks}`);
    }
    
    const result = await response.json();
    
    // Atualizar o progresso
    if (onProgress) {
      onProgress(((i + 1) / totalChunks) * 100);
    }
    
    // Se for o último chunk, retornar a URL do arquivo
    if (result.isComplete) {
      console.log('Upload concluído com sucesso:', result.fileUrl);
      return result.fileUrl;
    }
  }
  
  throw new Error('Erro inesperado: o upload foi concluído, mas a URL do arquivo não foi retornada');
} 