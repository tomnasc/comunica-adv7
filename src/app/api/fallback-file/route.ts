import { NextResponse } from 'next/server'

export async function GET() {
  // Criar um PDF simples com uma mensagem de erro
  const pdfContent = `
%PDF-1.4
1 0 obj
<< /Type /Catalog
   /Pages 2 0 R
>>
endobj
2 0 obj
<< /Type /Pages
   /Kids [3 0 R]
   /Count 1
>>
endobj
3 0 obj
<< /Type /Page
   /Parent 2 0 R
   /Resources << /Font << /F1 4 0 R >> >>
   /MediaBox [0 0 612 792]
   /Contents 5 0 R
>>
endobj
4 0 obj
<< /Type /Font
   /Subtype /Type1
   /BaseFont /Helvetica
>>
endobj
5 0 obj
<< /Length 128 >>
stream
BT
/F1 24 Tf
100 700 Td
(Arquivo não encontrado) Tj
/F1 14 Tf
0 -40 Td
(O anexo solicitado não está mais disponível.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000010 00000 n
0000000063 00000 n
0000000122 00000 n
0000000251 00000 n
0000000328 00000 n
trailer
<< /Size 6
   /Root 1 0 R
>>
startxref
507
%%EOF
  `.trim()

  // Retornar o PDF como resposta
  return new NextResponse(pdfContent, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="arquivo-nao-encontrado.pdf"'
    }
  })
} 