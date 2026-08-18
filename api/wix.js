// api/wix.js (Código Completo - PV ONE v3.0)

export default async function handler(req, res) {
  // 1. Bloqueia métodos diferentes de POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido. Utilize POST.' 
    });
  }

  try {
    const {
      headline,
      subtitle,
      lead,
      sectionHeading,
      editorialBody,
      coverImageUrl,
      middleImageUrl,
      endImageUrl,
      photoCredits,
      sourceCredits,
      categoryId,
      seoData
    } = req.body || {};

    // 2. Leitura com fallback de todas as variações de nomes de variáveis
    const WIX_API_KEY = process.env.WIX_API_KEY || process.env.NEXT_PUBLIC_WIX_API_KEY;
    const WIX_SITE_ID = process.env.WIX_SITE_ID || process.env.NEXT_PUBLIC_WIX_SITE_ID;
    const WIX_ACCOUNT_ID = process.env.WIX_ACCOUNT_ID || process.env.NEXT_PUBLIC_WIX_ACCOUNT_ID;

    // Diagnóstico claro se ainda faltar alguma chave
    const faltantes = [];
    if (!WIX_API_KEY) faltantes.push('WIX_API_KEY');
    if (!WIX_SITE_ID) faltantes.push('WIX_SITE_ID');
    if (!WIX_ACCOUNT_ID) faltantes.push('WIX_ACCOUNT_ID');

    if (faltantes.length > 0) {
      return res.status(500).json({
        success: false,
        error: `Faltam as seguintes variáveis na Vercel: ${faltantes.join(', ')}`,
        chavesDetectadas: Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY'))
      });
    }

    // 3. Validação dos campos obrigatórios do texto
    if (!headline || !lead || !editorialBody) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios ausentes: Título (headline), Lide (lead) ou Corpo da matéria (editorialBody).'
      });
    }

    // 4. Montagem da árvore do Wix RichContent v3
    const nodes = [];

    // Lide Editorial em Destaque (Negrito)
    nodes.push({
      type: 'PARAGRAPH',
      id: 'node-lead',
      nodes: [
        {
          type: 'TEXT',
          id: 'text-lead',
          textData: {
            text: lead,
            decorations: [{ type: 'BOLD' }]
          }
        }
      ]
    });

    // Intertítulo (H2) se existir
    if (sectionHeading) {
      nodes.push({
        type: 'HEADING',
        id: 'node-heading',
        headingData: { level: 2 },
        nodes: [
          {
            type: 'TEXT',
            id: 'text-heading',
            textData: { text: sectionHeading, decorations: [] }
          }
        ]
      });
    }

    // Divisão do corpo do texto em parágrafos
    const paragraphs = editorialBody
      .split('\n\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const midIndex = Math.ceil(paragraphs.length / 2);

    // Primeira metade do texto editorial
    paragraphs.slice(0, midIndex).forEach((paragraph, idx) => {
      nodes.push({
        type: 'PARAGRAPH',
        id: `node-p1-${idx}`,
        nodes: [
          {
            type: 'TEXT',
            id: `text-p1-${idx}`,
            textData: { text: paragraph, decorations: [] }
          }
        ]
      });
    });

    // Imagem do Meio (se houver)
    if (middleImageUrl) {
      nodes.push({
        type: 'IMAGE',
        id: 'node-mid-img',
        imageData: {
          image: {
            src: { url: middleImageUrl }
          },
          altText: headline,
          containerData: {
            alignment: 'CENTER',
            width: { size: 'ORIGINAL' }
          }
        }
      });
    }

    // BLOCO DE PUBLICIDADE INOVIMPRESS (Isolado no meio)
    nodes.push({
      type: 'PARAGRAPH',
      id: 'node-inovimpress',
      nodes: [
        {
          type: 'TEXT',
          id: 'text-inovimpress',
          textData: {
            text: '— Publicidade —\nInovimpress: Soluções completas em comunicação visual e materiais gráficos para o automobilismo.',
            decorations: [{ type: 'ITALIC' }]
          }
        }
      ]
    });

    // Segunda metade do texto editorial
    paragraphs.slice(midIndex).forEach((paragraph, idx) => {
      nodes.push({
        type: 'PARAGRAPH',
        id: `node-p2-${idx}`,
        nodes: [
          {
            type: 'TEXT',
            id: `text-p2-${idx}`,
            textData: { text: paragraph, decorations: [] }
          }
        ]
      });
    });

    // Imagem do Fim (se houver)
    if (endImageUrl) {
      nodes.push({
        type: 'IMAGE',
        id: 'node-end-img',
        imageData: {
          image: {
            src: { url: endImageUrl }
          },
          altText: `${headline} - Final`,
          containerData: {
            alignment: 'CENTER',
            width: { size: 'ORIGINAL' }
          }
        }
      });
    }

    // Bloco Final de Créditos e Apoio
    const rodapeTexto = `Créditos Fotográficos: ${photoCredits || 'Divulgação'} | Fonte: ${sourceCredits || 'Assessoria de Imprensa'} | Redação Portal Pista Verde`;
    nodes.push({
      type: 'PARAGRAPH',
      id: 'node-footer',
      nodes: [
        {
          type: 'TEXT',
          id: 'text-footer',
          textData: {
            text: rodapeTexto,
            decorations: [{ type: 'ITALIC' }]
          }
        }
      ]
    });

    // 5. Montagem do Payload para o Wix Draft API
    const draftPayload = {
      draftPost: {
        title: headline,
        excerpt: subtitle || lead.substring(0, 160),
        richContent: {
          nodes: nodes
        },
        categoryIds: categoryId ? [categoryId] : [],
        seoData: {
          tags: [
            {
              type: 'title',
              children: seoData?.title || `${headline} | Portal Pista Verde`
            },
            {
              type: 'meta',
              props: {
                name: 'description',
                content: seoData?.description || subtitle || lead.substring(0, 160)
              }
            }
          ]
        }
      }
    };

    // Capa Principal (se houver)
    if (coverImageUrl) {
      draftPayload.draftPost.media = {
        displayed: true,
        custom: true,
        mainMedia: {
          image: {
            url: coverImageUrl
          }
        }
      };
    }

    // 6. Envio com os headers exigidos pelo Wix
    const wixResponse = await fetch('https://www.wixapis.com/blog/v3/draft-posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': WIX_API_KEY,
        'wix-site-id': WIX_SITE_ID,
        'wix-account-id': WIX_ACCOUNT_ID
      },
      body: JSON.stringify(draftPayload)
    });

    const dataRetorno = await wixResponse.json();

    if (!wixResponse.ok) {
      return res.status(wixResponse.status).json({
        success: false,
        error: dataRetorno.message || `Erro Wix (${wixResponse.status})`,
        detalhes: dataRetorno
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Rascunho criado com sucesso no Wix Blog!',
      draftPostId: dataRetorno.draftPost?.id,
      data: dataRetorno
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor ao processar o rascunho.',
      detalhes: error.message
    });
  }
}
