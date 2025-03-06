import { Storage, File as MegaFile } from 'megajs'

// Credenciais do Mega.io
const MEGA_EMAIL = process.env.MEGA_EMAIL || ''
const MEGA_PASSWORD = process.env.MEGA_PASSWORD || ''

/**
 * Faz upload de um arquivo para o Mega.io e retorna o link de compartilhamento
 * @param fileBuffer Buffer do arquivo a ser enviado
 * @param fileName Nome do arquivo
 * @returns Link de compartilhamento do arquivo
 */
export async function uploadToMega(fileBuffer: Buffer, fileName: string): Promise<string> {
  try {
    // Verificar se as credenciais estão configuradas
    if (!MEGA_EMAIL || !MEGA_PASSWORD) {
      throw new Error('Credenciais do Mega.io não configuradas')
    }

    console.log(`Iniciando upload para o Mega.io: ${fileName} (${fileBuffer.length} bytes)`)
    
    // Criar uma instância do Storage do Mega.io com tratamento de erro melhorado
    console.log('Autenticando no Mega.io...')
    
    // Criar a instância do Storage
    const storage = new Storage({
      email: MEGA_EMAIL,
      password: MEGA_PASSWORD,
      autologin: false, // Desabilitar autologin para evitar problemas
      keepalive: false // Desabilitar keepalive para evitar problemas
    })
    
    // Aguardar a autenticação
    try {
      await storage.ready
      console.log('Autenticação bem-sucedida no Mega.io')
    } catch (authError) {
      console.error('Erro na autenticação do Mega.io:', authError)
      throw new Error(`Falha na autenticação do Mega.io: ${authError instanceof Error ? authError.message : 'Erro desconhecido'}`)
    }

    console.log('Iniciando upload do arquivo...')
    
    // Fazer upload do arquivo com tratamento de erro melhorado
    let uploadedFile
    try {
      uploadedFile = await storage.upload(fileName, fileBuffer).complete
      console.log('Arquivo enviado para o Mega.io:', uploadedFile.name)
    } catch (uploadError) {
      console.error('Erro no upload para o Mega.io:', uploadError)
      throw new Error(`Falha no upload para o Mega.io: ${uploadError instanceof Error ? uploadError.message : 'Erro desconhecido'}`)
    }

    // Gerar link de compartilhamento com tratamento de erro melhorado
    console.log('Gerando link de compartilhamento...')
    let link
    try {
      link = await uploadedFile.link({
        noKey: false // Incluir a chave de descriptografia no link
      })
      console.log('Link gerado com sucesso:', link)
    } catch (linkError) {
      console.error('Erro ao gerar link de compartilhamento:', linkError)
      throw new Error(`Falha ao gerar link de compartilhamento: ${linkError instanceof Error ? linkError.message : 'Erro desconhecido'}`)
    }
    
    return link
  } catch (error) {
    console.error('Erro ao fazer upload para o Mega.io:', error)
    
    // Melhorar a mensagem de erro para incluir mais detalhes
    let errorMessage = 'Erro desconhecido'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error)
    }
    
    throw new Error(`Erro ao fazer upload para o Mega.io: ${errorMessage}`)
  }
}

/**
 * Verifica se um link do Mega.io é válido
 * @param megaLink Link do Mega.io a ser verificado
 * @returns true se o link for válido, false caso contrário
 */
export async function verifyMegaLink(megaLink: string): Promise<boolean> {
  try {
    const file = MegaFile.fromURL(megaLink)
    await file.loadAttributes()
    return true
  } catch (error) {
    console.error('Erro ao verificar link do Mega.io:', error)
    return false
  }
} 