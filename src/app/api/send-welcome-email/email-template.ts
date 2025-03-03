export const getWelcomeEmailTemplate = (name: string, email: string, password: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bem-vindo ao Sistema da Igreja Adventista do 7º Dia</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="text-align: center; margin-bottom: 30px;">
      <h2 style="color: #4F46E5;">Bem-vindo(a) ao Sistema da Igreja Adventista do 7º Dia</h2>
    </div>
    
    <p>Olá ${name},</p>
    
    <p>Sua conta foi criada com sucesso no sistema de gerenciamento da igreja. Para acessar o sistema, siga as instruções abaixo:</p>
    
    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #4F46E5; margin-top: 0;">Instruções de Acesso:</h3>
      
      <p><strong>1. Acesse o sistema:</strong></p>
      <p style="margin-left: 20px;">
        • Clique no botão "Acessar o Sistema" abaixo<br>
        • Ou acesse diretamente: <a href="${baseUrl}/login" style="color: #4F46E5;">${baseUrl}/login</a>
      </p>
      
      <p><strong>2. Faça login com suas credenciais:</strong></p>
      <p style="margin-left: 20px;">
        • Email: <strong>${email}</strong><br>
        • Senha inicial: <strong>${password}</strong>
      </p>
      
      <p><strong>3. Altere sua senha:</strong></p>
      <p style="margin-left: 20px;">
        • Após o primeiro acesso, clique no seu nome no canto superior direito<br>
        • Selecione "Alterar Senha"<br>
        • Digite uma nova senha de sua preferência
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${baseUrl}/login" 
         style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
        Acessar o Sistema
      </a>
    </div>
    
    <div style="background-color: #fff8dc; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #856404;"><strong>Importante:</strong> Por questões de segurança, altere sua senha no primeiro acesso.</p>
    </div>
    
    <p>Se você tiver alguma dúvida ou precisar de ajuda, entre em contato com o administrador do sistema.</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    
    <p style="color: #6B7280; font-size: 14px; text-align: center;">
      Este é um email automático. Por favor, não responda.<br>
      Igreja Adventista do 7º Dia
    </p>
  </div>
</body>
</html>
`} 