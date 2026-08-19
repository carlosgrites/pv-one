export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { headline, subtitle, editorialBody, paragraphs, photographer, source } = req.body;

  // 1. CHAVES DIRETAS NO CÓDIGO (NÃO DEPENDE DE NADA DA VERCEL)
  const apiKeyRaw = "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjJlYjI5MmIyLWU2NGUtNGQ3Yy1hYzMwLTQyMzVhMDYzMWNiNFwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcImJmY2M1NzBmLTQ3MDUtNDI0MC1iOTliLTQ2Njg3NjQ3MGRlNVwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3NDcxM2E2ZS1lMDA3LTRkZjktOGNjNC1hMTA1OGM1NWQwNWRcIn19IiwiaWF0IjoxNzg3MDkyMzQ1fQ.MPXDGKra6zYTBVTzNWqSWvOxGMdLFAzoaBf9d5jOLNw5bi-pjo4JUOqIKcC0Rs2B1pN7WIdbVgeRXZTDtvejRQZ_L2qwcclVj2pXjXFUOWYOybBHEjC3WwqjwYoISaCkgdoHlhczRMrEmM8I7xYk8z00NgqKcul4_re2sDZdBkc9MHsv83Hy7aEEzx7D_ELDbS1jPYxPcD3Hv6ph1arfsUBJWNL_-2r8lkFmFyJfM8ckhnWUd4uwOoOrQ_9Q7V7Xe7RsYoTCTETy7nvXMGqZfT1dncMiWhdEb2vURgftrXXK9lJuqrsVNwOmuCekja0AjAHeC68inNcH1PdRgyxd4Q";
  const siteIdRaw = "901207ba-a8ff-4df3-8260-72fee498ef22";

  const cleanApiKey = apiKeyRaw.replace(/^Bearer\s+/i, '').trim();
  const cleanSiteId = siteIdRaw.trim();

  // 2. TRATAMENTO DE PARÁGRAFOS E NÓS INDEPENDENTES DO WIX
  const rawParagraphs = paragraphs || (editorialBody ? editorialBody.split('\n').map(p => p.trim()).filter(p => p.length > 0) : []);
  const nodes = [];

  // Linha Fina / Subtítulo no topo em itálico
  if (subtitle) {
    nodes.push({
      type: "PARAGRAPH",
      nodes: [{ type: "TEXT", textData: { text: subtitle, decorations: [{ type: "ITALIC" }] } }]
    });
  }

  // Distribuição dos parágrafos com Lide em negrito e Intertítulo H2 no meio
  rawParagraphs.forEach((p, idx) => {
    nodes.push({
      type: "PARAGRAPH",
      nodes: [{ type: "TEXT", textData: { text: p, decorations: idx === 0 ? [{ type: "BOLD" }] : [] } }]
    });

    if (idx === Math.floor(rawParagraphs.length / 2)) {
      nodes.push({
        type: "HEADING",
        headingData: { level: 2 },
        nodes: [{ type: "TEXT", textData: { text: "Disputas e Preparação na Pista", decorations: [] } }]
      });

      nodes.push({
        type: "PARAGRAPH",
        nodes: [{ type: "TEXT", textData: { text: "[ --- INSERIR AQUI O IFRAME DA PUBLICIDADE --- ]", decorations: [{ type: "BOLD" }] } }]
      });
    }
  });

  // Marcador dos Apoiadores
  nodes.push({
    type: "PARAGRAPH",
    nodes: [{ type: "TEXT", textData: { text: "[ --- INSERIR AQUI O IFRAME DOS APOIADORES DO KARTISMO --- ]", decorations: [{ type: "BOLD" }] } }]
  });

  // Créditos Finais
  nodes.push({
    type: "PARAGRAPH",
    nodes: [{ type: "TEXT", textData: { text: `Fotos: ${photographer || 'Divulgação'} | Fonte: ${source || 'Redação'} | Redação Portal Pista Verde`, decorations: [{ type: "ITALIC" }] } }]
  });

  const payload = {
    draftPost: {
      title: headline || "Sem título",
      excerpt: subtitle ? (subtitle.length > 150 ? subtitle.substring(0, 147) + "..." : subtitle) : "",
      richContent: {
        nodes: nodes
      }
    }
  };

  // 3. ENVIO COM OS CABEÇALHOS OFICIAIS DO WIX BLOG V3
  try {
    const wixResponse = await fetch("https://www.wixapis.com/blog/v3/draft-posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": cleanApiKey,
        "wix-site-id": cleanSiteId
      },
      body: JSON.stringify(payload)
    });

    const data = await wixResponse.json();

    if (!wixResponse.ok) {
      return res.status(wixResponse.status).json({
        error: data.message || "Erro retornado pela API do Wix.",
        details: data
      });
    }

    return res.status(200).json({ success: true, post: data.draftPost });
  } catch (error) {
    return res.status(500).json({ error: "Falha de conexão com a API Wix.", details: error.message });
  }
}
