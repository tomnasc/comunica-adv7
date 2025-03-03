export const getWelcomeEmailTemplate = (name: string, email: string, password: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Bem-vindo ao Sistema</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #4F46E5;">Bem-vindo(a) ao Sistema!</h2>
    
    <p>Olá ${name},</p>
    
    <p>Sua conta foi criada com sucesso. Abaixo estão suas credenciais de acesso:</p>
    
    <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Senha temporária:</strong> ${password}</p>
    </div>
    
    <p>Por razões de segurança, recomendamos que você altere sua senha após o primeiro acesso.</p>
    
    <p>Para acessar o sistema, clique no botão abaixo:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${baseUrl}/login" 
         style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Acessar o Sistema
      </a>
    </div>
    
    <p>Se você tiver alguma dúvida, entre em contato com o administrador do sistema.</p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
    
    <p style="color: #6B7280; font-size: 14px;">
      Este é um email automático. Por favor, não responda.
    </p>
  </div>
</body>
</html>
`} 