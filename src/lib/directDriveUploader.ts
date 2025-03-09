/**
 * Utilitário para upload direto para o Google Drive a partir do frontend
 */

// Tamanho máximo de cada chunk em bytes (5MB)
const CHUNK_SIZE = 5 * 1024 * 1024;

/**
 * Faz upload de um arquivo diretamente para o Google Drive
 * @param file Arquivo a ser enviado
 * @param contentId ID do conteúdo associado ao arquivo
 * @param onProgress Callback para acompanhar o progresso do upload
 * @returns URL pública do arquivo no Google Drive
 */
export async function uploadDirectToDrive(
  file: File,
  contentId: string,
  onProgress?: (progress: number) => void
): Promise<string> {
  try {
    console.log(`Iniciando upload direto para o Google Drive: ${file.name}, tamanho: ${file.size} bytes`);
    
    // Obter token de acesso e ID da pasta do servidor
    console.log('Solicitando token de acesso...');
    const tokenResponse = await fetch('/api/drive-token');
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || `Erro ao obter token de acesso: ${tokenResponse.status} ${tokenResponse.statusText}`);
      } catch (e) {
        throw new Error(`Erro ao obter token de acesso: ${tokenResponse.status} ${tokenResponse.statusText} - ${errorText.substring(0, 100)}...`);
      }
    }
    
    const tokenData = await tokenResponse.json();
    const { accessToken, folderId } = tokenData;
    
    if (!accessToken) {
      throw new Error('Token de acesso não encontrado na resposta');
    }
    
    console.log('Token de acesso obtido com sucesso');
    
    // Configurar os metadados do arquivo
    const metadata = {
      name: file.name,
      parents: folderId ? [folderId] : undefined
    };
    
    // Para arquivos grandes (mais de 5MB), usar upload resumable
    if (file.size > CHUNK_SIZE) {
      console.log(`Arquivo grande detectado (${file.size} bytes), usando upload resumable`);
      const fileId = await uploadLargeFile(file, accessToken, metadata, onProgress);
      
      // Tornar o arquivo público
      console.log(`Tornando o arquivo ${fileId} público...`);
      await makeFilePublic(fileId, accessToken);
      
      // Retornar o link para visualização
      const fileUrl = `https://drive.google.com/file/d/${fileId}/view`;
      console.log(`Upload concluído com sucesso: ${fileUrl}`);
      return fileUrl;
    }
    
    // Para arquivos pequenos, usar upload simples
    console.log(`Arquivo pequeno (${file.size} bytes), usando upload simples`);
    
    // Criar um FormData para o upload
    const formData = new FormData();
    
    // Adicionar os metadados como parte do formulário
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    
    // Adicionar o arquivo como parte do formulário
    formData.append('file', file);
    
    // Fazer upload do arquivo usando a API do Google Drive
    console.log('Enviando arquivo para o Google Drive...');
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      let errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(`Erro ao fazer upload para o Google Drive: ${JSON.stringify(errorData)}`);
      } catch (e) {
        throw new Error(`Erro ao fazer upload para o Google Drive: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}...`);
      }
    }
    
    const data = await response.json();
    console.log(`Arquivo enviado com sucesso, ID: ${data.id}`);
    
    // Tornar o arquivo público
    console.log(`Tornando o arquivo ${data.id} público...`);
    await makeFilePublic(data.id, accessToken);
    
    // Retornar o link para visualização
    const fileUrl = `https://drive.google.com/file/d/${data.id}/view`;
    console.log(`Upload concluído com sucesso: ${fileUrl}`);
    return fileUrl;
  } catch (error) {
    console.error('Erro ao fazer upload para o Google Drive:', error);
    throw error;
  }
}

/**
 * Faz upload de um arquivo grande para o Google Drive usando o método resumable
 * @param file Arquivo a ser enviado
 * @param accessToken Token de acesso
 * @param metadata Metadados do arquivo
 * @param onProgress Callback para acompanhar o progresso do upload
 * @returns ID do arquivo no Google Drive
 */
async function uploadLargeFile(
  file: File,
  accessToken: string,
  metadata: any,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Iniciar sessão de upload resumable
  const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': file.type,
      'X-Upload-Content-Length': file.size.toString(),
    },
    body: JSON.stringify(metadata),
  });
  
  if (!initResponse.ok) {
    let errorText = await initResponse.text();
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(`Erro ao iniciar upload resumable: ${JSON.stringify(errorData)}`);
    } catch (e) {
      throw new Error(`Erro ao iniciar upload resumable: ${initResponse.status} ${initResponse.statusText} - ${errorText.substring(0, 100)}...`);
    }
  }
  
  // Obter a URL de upload da sessão
  const uploadUrl = initResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('URL de upload não encontrada na resposta');
  }
  
  // Calcular o número total de chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  console.log(`Dividindo arquivo em ${totalChunks} chunks de ${CHUNK_SIZE} bytes cada`);
  
  // Fazer upload de cada chunk
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunkSize = end - start;
    const chunk = file.slice(start, end);
    
    console.log(`Enviando chunk ${i + 1}/${totalChunks} (${start}-${end - 1}/${file.size})`);
    
    const contentRange = `bytes ${start}-${end - 1}/${file.size}`;
    
    const chunkResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Range': contentRange,
        'Content-Length': chunkSize.toString(),
      },
      body: chunk,
    });
    
    // Atualizar o progresso
    if (onProgress) {
      onProgress(((i + 1) / totalChunks) * 100);
    }
    
    // Se for o último chunk, a resposta conterá os dados do arquivo
    if (i === totalChunks - 1) {
      if (!chunkResponse.ok) {
        let errorText = await chunkResponse.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(`Erro ao enviar último chunk: ${JSON.stringify(errorData)}`);
        } catch (e) {
          throw new Error(`Erro ao enviar último chunk: ${chunkResponse.status} ${chunkResponse.statusText} - ${errorText.substring(0, 100)}...`);
        }
      }
      
      const data = await chunkResponse.json();
      console.log(`Upload resumable concluído com sucesso: ${data.id}`);
      return data.id;
    }
    
    // Para chunks intermediários, verificar se houve erro
    // O código 308 (Resume Incomplete) é esperado para chunks intermediários
    if (!chunkResponse.ok && chunkResponse.status !== 308) {
      let errorText = await chunkResponse.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(`Erro ao enviar chunk ${i + 1}/${totalChunks}: ${JSON.stringify(errorData)}`);
      } catch (e) {
        throw new Error(`Erro ao enviar chunk ${i + 1}/${totalChunks}: ${chunkResponse.status} ${chunkResponse.statusText} - ${errorText.substring(0, 100)}...`);
      }
    } else if (chunkResponse.status === 308) {
      console.log(`Chunk ${i + 1}/${totalChunks} enviado com sucesso, continuando upload...`);
      
      // Verificar se o servidor está indicando um intervalo diferente para continuar
      const range = chunkResponse.headers.get('Range');
      if (range) {
        const match = range.match(/bytes=0-(\d+)/);
        if (match) {
          const bytesReceived = parseInt(match[1]) + 1;
          console.log(`Servidor recebeu ${bytesReceived} bytes até agora`);
          
          // Se o servidor já recebeu mais bytes do que esperávamos enviar neste chunk,
          // ajustar o índice para continuar do ponto correto
          if (bytesReceived > end) {
            const newChunkIndex = Math.floor(bytesReceived / CHUNK_SIZE);
            if (newChunkIndex > i) {
              console.log(`Ajustando índice do chunk de ${i} para ${newChunkIndex}`);
              i = newChunkIndex - 1; // -1 porque o loop incrementará i
            }
          }
        }
      }
    }
  }
  
  throw new Error('Erro inesperado: o upload foi concluído, mas o ID do arquivo não foi retornado');
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
    let errorText = await response.text();
    try {
      const errorData = JSON.parse(errorText);
      throw new Error(`Erro ao tornar o arquivo público: ${JSON.stringify(errorData)}`);
    } catch (e) {
      throw new Error(`Erro ao tornar o arquivo público: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}...`);
    }
  }
} 