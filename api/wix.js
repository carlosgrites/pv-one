// api/wix.js (Vercel Serverless Function)

export default async function handler(req, res) {
  // Garantir apenas método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Utilize POST.' });
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
    } = req.body;

    // 1. Validação de credenciais de ambiente
    const { WIX_API_KEY, WIX_SITE_ID, WIX_ACCOUNT_ID } = process.env;

    if (!WIX_API_KEY || !WIX_SITE_ID || !WIX_ACCOUNT_ID) {
      return res.status(500).json({
        success: false,
        error: 'Configuração incompleta: WIX_API_KEY, WIX_SITE_ID ou WIX_ACCOUNT_ID não definidos na Vercel.'
      });
    }

    // 2. Validação dos campos essenciais do release
    if (!headline || !lead || !editorialBody) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios ausentes: headline, lead ou editorialBody.'
      });
    }

    // 3. Montagem dos Nós do RichContent (Wix Blog v3 Schema)
    // O anúncio da Inovimpress é injetado estritamente aqui, sem contaminar os campos originais.
    const nodes = [];

    // Lide editorial (Destaque)
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

    // Intertítulo / Section Heading (se houver)
    if (sectionHeading) {
      nodes.push({
        type: 'HEADING',
        id: 'node-section-heading',
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

    // Primeira parte do corpo editorial
    const paragraphs = editorialBody.split('\n\n').filter(p => p.trim() !== '');
    const midIndex = Math.ceil(paragraphs.length / 2);

    paragraphs.slice(0, midIndex).forEach((paragraph, idx) => {
      nodes.push({
        type: 'PARAGRAPH',
        id: `node-editorial-p1-${idx}`,
        nodes: [
          {
            type: 'TEXT',
            id: `text-p1-${idx}`,
            textData: { text: paragraph, decorations: [] }
          }
        ]
      });
    });

    // Imagem do Meio (se enviada)
    if (middleImageUrl) {
      nodes.push({
        type: 'IMAGE',
        id: 'node-middle-image',
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

    // BLOCO COMERCIAL ISOLADO: Inovimpress (Renderizado uma única vez)
    nodes.push({
      type: 'PARAGRAPH',
      id: 'node-inovimpress-ad',
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

    // Segunda parte do corpo editorial
    paragraphs.slice(midIndex).forEach((paragraph, idx) => {
      nodes.push({
        type: 'PARAGRAPH',
        id: `node-editorial-p2-${idx}`,
        nodes: [
          {
            type: 'TEXT',
            id: `text-p2-${idx}`,
            textData: { text: paragraph, decorations: [] }
          }
        ]
      });
    });

    // Imagem de Fim (se enviada)
    if (endImageUrl) {
      nodes.push({
        type: 'IMAGE',
        id: 'node-end-image',
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

    // Bloco de Rodapé: Créditos e Fonte
    const footerText = `Créditos Fotográficos: ${photoCredits || 'Divulgação'} | Fonte: ${sourceCredits || 'Assessoria de Imprensa'} | Redação Portal Pista Verde`;
    nodes.push({
      type: 'PARAGRAPH',
      id: 'node-footer-credits',
      nodes: [
        {
          type: 'TEXT',
          id: 'text-footer',
          textData: {
            text: footerText,
            decorations: [{ type: 'ITALIC' }]
          }
        }
      ]
    });

    // 4. Estruturação do Payload para a Wix Blog v3 API
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

    // Imagem de Capa principal (se disponível)
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

    // 5. Disparo para o endpoint da Wix com todos os Headers Obrigatórios
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

    const responseData = await wixResponse.json();

    if (!wixResponse.ok) {
      console.error('Erro Wix API:', responseData);
      return res.status(wixResponse.status).json({
        success: false,
        error: responseData.message || `Erro Wix (${wixResponse.status})`,
        details: responseData
      });
    }

    // 6. Retorno com sucesso
    return res.status(200).json({
      success: true,
      message: 'Rascunho criado com sucesso no Wix Blog!',
      draftPostId: responseData.draftPost?.id,
      data: responseData
    });

  } catch (error) {
    console.error('Erro interno na rota Wix:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor ao processar rascunho.',
      details: error.message
    });
  }
}
