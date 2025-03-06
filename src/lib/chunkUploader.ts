/**
 * Utilitário para upload de arquivos em chunks
 */

// Tamanho de cada chunk em bytes (1MB)
const CHUNK_SIZE = 1 * 1024 * 1024;

// Tamanho máximo do arquivo final (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Faz upload de um arquivo em chunks para evitar limites de tamanho
 * @param file Arquivo a ser enviado
 * @param onProgress Callback para acompanhar o progresso do upload
 * @returns URL do arquivo no Supabase Storage ou array de URLs se o arquivo for dividido
 */
export async function uploadFileInChunks(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string | string[]> {
  // Se o arquivo for menor que o limite, fazer upload normalmente
  if (file.size <= MAX_FILE_SIZE) {
    return uploadSingleFile(file, onProgress);
  }
  
  // Para arquivos maiores que o limite, dividir em partes
  console.log(`Arquivo muito grande (${file.size} bytes), dividindo em múltiplas partes...`);
  
  // Calcular quantas partes serão necessárias
  const numParts = Math.ceil(file.size / MAX_FILE_SIZE);
  console.log(`Dividindo em ${numParts} partes de até 50MB cada`);
  
  const fileUrls: string[] = [];
  
  // Fazer upload de cada parte
  for (let i = 0; i < numParts; i++) {
    const start = i * MAX_FILE_SIZE;
    const end = Math.min(file.size, start + MAX_FILE_SIZE);
    
    // Criar um novo arquivo para esta parte
    const partBlob = file.slice(start, end);
    const partName = `${file.name}.parte${i+1}de${numParts}`;
    const partFile = new File([partBlob], partName, { type: file.type });
    
    console.log(`Enviando parte ${i+1}/${numParts}: ${partName} (${partFile.size} bytes)`);
    
    // Fazer upload desta parte
    const partUrl = await uploadSingleFile(
      partFile,
      progress => {
        if (onProgress) {
          // Calcular o progresso total considerando todas as partes
          const partProgress = (i + progress / 100) / numParts;
          onProgress(partProgress * 100);
        }
      }
    );
    
    fileUrls.push(partUrl);
    console.log(`Parte ${i+1}/${numParts} enviada com sucesso: ${partUrl}`);
  }
  
  console.log(`Todas as ${numParts} partes enviadas com sucesso`);
  return fileUrls;
}

/**
 * Faz upload de um único arquivo em chunks
 * @param file Arquivo a ser enviado
 * @param onProgress Callback para acompanhar o progresso do upload
 * @returns URL do arquivo no Supabase Storage
 */
async function uploadSingleFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Gerar um ID único para este arquivo
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
    
    // Enviar o chunk para a API com credentials incluídas
    const response = await fetch('/api/chunk-upload', {
      method: 'POST',
      body: formData,
      credentials: 'include' // Incluir cookies de autenticação
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