export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const { headline, subtitle, editorialBody, paragraphs, photographer, source, category } = req.body;

  const apiKey = process.env.WIX_API_KEY;
  const siteId = process.env.WIX_SITE_ID;

  const rawParagraphs = paragraphs || (editorialBody ? editorialBody.split('\n').map(p => p.trim()).filter(p => p.length > 0) : []);
  const nodes = [];

  if (subtitle) {
    nodes.push({
      type: "PARAGRAPH",
      nodes: [{ type: "TEXT", textData: { text: subtitle, decorations: [{ type: "ITALIC" }] } }]
    });
  }

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

  nodes.push({
    type: "PARAGRAPH",
    nodes: [{ type: "TEXT", textData: { text: "[ --- INSERIR AQUI O IFRAME DOS APOIADORES DO KARTISMO --- ]", decorations: [{ type: "BOLD" }] } }]
  });

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

  try {
    const wixResponse = await fetch("https://www.wixapis.com/blog/v3/draft-posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": apiKey,
        "wix-site-id": siteId
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
