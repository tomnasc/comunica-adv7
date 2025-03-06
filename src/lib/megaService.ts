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

    // Criar uma instância do Storage do Mega.io
    const storage = await new Storage({
      email: MEGA_EMAIL,
      password: MEGA_PASSWORD
    }).ready

    // Fazer upload do arquivo
    const uploadedFile = await storage.upload(fileName, fileBuffer).complete
    console.log('Arquivo enviado para o Mega.io:', uploadedFile.name)

    // Gerar link de compartilhamento
    const link = await uploadedFile.link({
      noKey: false // Incluir a chave de descriptografia no link
    })

    return link
  } catch (error) {
    console.error('Erro ao fazer upload para o Mega.io:', error)
    throw new Error(`Erro ao fazer upload para o Mega.io: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
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