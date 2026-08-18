// api/wix.js - DISPARO DIRETO PV ONE v3.0

// =========================================================================
// 1. COLE SUAS CHAVES DENTRO DAS ASPAS ABAIXO:
// =========================================================================
const WIX_API_KEY_VAL = 'IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjJlYjI5MmIyLWU2NGUtNGQ3Yy1hYzMwLTQyMzVhMDYzMWNiNFwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcImJmY2M1NzBmLTQ3MDUtNDI0MC1iOTliLTQ2Njg3NjQ3MGRlNVwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3NDcxM2E2ZS1lMDA3LTRkZjktOGNjNC1hMTA1OGM1NWQwNWRcIn19IiwiaWF0IjoxNzg3MDkyMzQ1fQ.MPXDGKra6zYTBVTzNWqSWvOxGMdLFAzoaBf9d5jOLNw5bi-pjo4JUOqIKcC0Rs2B1pN7WIdbVgeRXZTDtvejRQZ_L2qwcclVj2pXjXFUOWYOybBHEjC3WwqjwYoISaCkgdoHlhczRMrEmM8I7xYk8z00NgqKcul4_re2sDZdBkc9MHsv83Hy7aEEzx7D_ELDbS1jPYxPcD3Hv6ph1arfsUBJWNL_-2r8lkFmFyJfM8ckhnWUd4uwOoOrQ_9Q7V7Xe7RsYoTCTETy7nvXMGqZfT1dncMiWhdEb2vURgftrXXK9lJuqrsVNwOmuCekja0AjAHeC68inNcH1PdRgyxd4Q';
const WIX_SITE_ID_VAL = '50bca98c-31f2-4172-a19d-c3abf3dd9dd7';
const WIX_ACCOUNT_ID_VAL = '74713a6e-e007-4df9-8cc4-a1058c55d05d';
// =========================================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
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

    if (!headline || !lead || !editorialBody) {
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios ausentes: headline, lead ou editorialBody.'
      });
    }

    const nodes = [];

    // Lide
    nodes.push({
      type: 'PARAGRAPH',
      id: 'node-lead',
      nodes: [
        {
          type: 'TEXT',
          id: 'text-lead',
          textData: { text: lead, decorations: [{ type: 'BOLD' }] }
        }
      ]
    });

    // Intertítulo
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

    const paragraphs = editorialBody.split('\n\n').map(p => p.trim()).filter(p => p.length > 0);
    const midIndex = Math.ceil(paragraphs.length / 2);

    // Parágrafos 1ª Parte
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

    // Imagem do Meio
    if (middleImageUrl) {
      nodes.push({
        type: 'IMAGE',
        id: 'node-mid-img',
        imageData: {
          image: { src: { url: middleImageUrl } },
          altText: headline,
          containerData: { alignment: 'CENTER', width: { size: 'ORIGINAL' } }
        }
      });
    }

    // Publicidade Inovimpress
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

    // Parágrafos 2ª Parte
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

    // Imagem do Fim
    if (endImageUrl) {
      nodes.push({
        type: 'IMAGE',
        id: 'node-end-img',
        imageData: {
          image: { src: { url: endImageUrl } },
          altText: `${headline} - Final`,
          containerData: { alignment: 'CENTER', width: { size: 'ORIGINAL' } }
        }
      });
    }

    // Rodapé de Créditos
    const rodapeTexto = `Créditos Fotográficos: ${photoCredits || 'Divulgação'} | Fonte: ${sourceCredits || 'Assessoria de Imprensa'} | Redação Portal Pista Verde`;
    nodes.push({
      type: 'PARAGRAPH',
      id: 'node-footer',
      nodes: [
        {
          type: 'TEXT',
          id: 'text-footer',
          textData: { text: rodapeTexto, decorations: [{ type: 'ITALIC' }] }
        }
      ]
    });

    // Montagem Payload Wix
    const draftPayload = {
      draftPost: {
        title: headline,
        excerpt: subtitle || lead.substring(0, 160),
        richContent: { nodes: nodes },
        categoryIds: categoryId ? [categoryId] : [],
        seoData: {
          tags: [
            { type: 'title', children: seoData?.title || `${headline} | Portal Pista Verde` },
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

    if (coverImageUrl) {
      draftPayload.draftPost.media = {
        displayed: true,
        custom: true,
        mainMedia: { image: { url: coverImageUrl } }
      };
    }

    // Requisição com headers obrigatórios
    const wixResponse = await fetch('https://www.wixapis.com/blog/v3/draft-posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': WIX_API_KEY_VAL,
        'wix-site-id': WIX_SITE_ID_VAL,
        'wix-account-id': WIX_ACCOUNT_ID_VAL
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
