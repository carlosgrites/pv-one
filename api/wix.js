// ============================================================
// PORTAL PISTA VERDE — PV ONE
// api/wix.js
// Integração Wix Blog V3
// ============================================================

export default async function handler(req, res) {

  // ============================================================
  // 1. MÉTODO
  // ============================================================

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  // ============================================================
  // 2. CONFIGURAÇÃO WIX
  // ============================================================

  const apiKeyRaw = "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImQ2MWZhMTE0LWY2YWItNDBiYy1hNzdjLTVjODUzNGNiNWJmOVwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcImEyNTM5M2Q0LTgxOTQtNDdkZi04ZDBlLTMzY2FhN2ExYzkxOFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3NDcxM2E2ZS1lMDA3LTRkZjktOGNjNC1hMTA1OGM1NWQwNWRcIn19IiwiaWF0IjoxNzg3MjY1NTg4fQ.ZmRwqkfXkdY2z-PTbNpjzQWZXAVBdMj3_SCJ6cgvcfgaS2KWG31MLgjwM4kKv0bY8uT5lCZ93cx13dWqPdYel4vDZL8kCVwqFV5a9A7oftLBV6IO7kvuwW6hLaR4YbXch4LPSSELUhWVsXzrbzCZJXk-pmFnLUs58TUydiRxgZDZXmZmyoRhPC8KiSMiMRMr71mjzFs2gB8ifHDG6TZOsQeEPR3HsGZ_f_trXqaV0iuXXnLp07PkxYfem6ZyMhlJF9nKvnJnrGc70sS1ZJeBTiDyLxJsY_xgWSsvuQ3YkqATKYQn6YSUasncCQN7a3yU-BB4ojOgr6twqhKojw7VOQ";

  const siteIdRaw = "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";

  const authorEmail = "portalpistaverde@gmail.com";

  // ID do autor padrão (Carlos Grites)
  const defaultMemberId = "76233c36-475b-4ea3-9317-363ee57c8de2";

  const cleanApiKey = String(apiKeyRaw || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  const cleanSiteId = String(siteIdRaw || "").trim();

  if (!cleanApiKey) {
    return res.status(500).json({
      error: "A chave da API Wix ainda não foi configurada."
    });
  }

  const authHeaders = {
    "Content-Type": "application/json",
    "Authorization": cleanApiKey,
    "wix-site-id": cleanSiteId
  };

  // ============================================================
  // 3. DADOS RECEBIDOS DO PV ONE
  // ============================================================

  const {
    headline,
    subtitle,
    editorialBody,
    paragraphs,
    photographer,
    source,
    category,
    categoryIds,
    tagIds,
    coverImageAlt,
    seo = {},
    internalLinks = [],
    structuredData = null
  } = req.body || {};

  const cleanHeadline = String(headline || "Sem título").trim();
  const cleanSubtitle = String(subtitle || "").trim();
  const photographerText = String(photographer || "Divulgação").trim();
  const sourceText = String(source || "Redação").trim();
  const cleanCategory = String(category || "").trim();

  // ============================================================
  // 4. FUNÇÕES AUXILIARES
  // ============================================================

  function normalizeText(value) {
    return String(value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 100);
  }

  function uniqueStrings(values) {
    return [
      ...new Set(
        (Array.isArray(values) ? values : [])
          .map(item => String(item || "").trim())
          .filter(Boolean)
      )
    ];
  }

  // ============================================================
  // 5. AUTOR (MEMBER ID)
  // ============================================================

  let memberId = defaultMemberId;

  // ============================================================
  // 6. CORPO EDITORIAL
  // ============================================================

  const normalizedEditorialBody = normalizeText(editorialBody);
  let rawParagraphs = [];

  if (Array.isArray(paragraphs) && paragraphs.length) {
    rawParagraphs = paragraphs
      .map(item => normalizeText(item))
      .filter(Boolean);
  } else if (normalizedEditorialBody) {
    rawParagraphs = normalizedEditorialBody
      .split(/\n+/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  // ============================================================
  // 7. LINKS INTERNOS
  // ============================================================

  const cleanInternalLinks = Array.isArray(internalLinks)
    ? internalLinks
        .filter(link => link && link.url && link.text)
        .slice(0, 3)
    : [];

  // ============================================================
  // 8. RICH CONTENT NATIVO
  // ============================================================

  let nodeCounter = 0;

  function newNodeId(prefix = "node") {
    nodeCounter += 1;
    return prefix + "_" + Date.now() + "_" + nodeCounter;
  }

  function textNode(text, decorations = []) {
    return {
      type: "TEXT",
      id: newNodeId("txt"),
      nodes: [],
      textData: {
        text: String(text || ""),
        decorations
      }
    };
  }

  function paragraphNode(text, options = {}) {
    const decorations = [];

    if (options.bold) {
      decorations.push({
        type: "BOLD",
        fontWeightValue: 700
      });
    }

    if (options.italic) {
      decorations.push({
        type: "ITALIC",
        italicData: true
      });
    }

    return {
      type: "PARAGRAPH",
      id: newNodeId("p"),
      nodes: [
        textNode(text, decorations)
      ],
      paragraphData: {}
    };
  }

  function headingNode(text) {
    return {
      type: "HEADING",
      id: newNodeId("h2"),
      nodes: [
        textNode(text)
      ],
      headingData: {
        level: 2
      }
    };
  }

  const richNodes = [];

  // Subtítulo
  if (cleanSubtitle) {
    richNodes.push(
      paragraphNode(cleanSubtitle, { italic: true })
    );
  }

  // Parágrafos da matéria
  rawParagraphs.forEach((paragraph, index) => {
    const text = String(paragraph || "").trim();
    if (!text) return;

    // H2 no formato ## TÍTULO
    if (/^##\s+/.test(text)) {
      const heading = text.replace(/^##\s+/, "").trim();
      if (heading) richNodes.push(headingNode(heading));
      return;
    }

    // H2 no formato H2: TÍTULO
    if (/^H2:\s*/i.test(text)) {
      const heading = text.replace(/^H2:\s*/i, "").trim();
      if (heading) richNodes.push(headingNode(heading));
      return;
    }

    richNodes.push(
      paragraphNode(text, { bold: index === 0 })
    );
  });

  // Crédito final
  richNodes.push(
    paragraphNode(
      `Texto/Fonte: ${sourceText} | Fotos: ${photographerText} | Redação: José Carlos Grites — Jornalista | Portal Pista Verde`,
      { italic: true }
    )
  );

  const richContent = {
    nodes: richNodes,
    metadata: {
      version: 1,
      id: newNodeId("document")
    }
  };

  // ============================================================
  // 9. SEO & METADADOS
  // ============================================================

  const seoTitle = String(
    seo.title || `${cleanHeadline} | Portal Pista Verde`
  ).trim().substring(0, 70);

  const seoDescription = String(
    seo.description || cleanSubtitle || rawParagraphs[0] || ""
  ).trim().substring(0, 160);

  const seoSlug = slugify(seo.slug || cleanHeadline);
  const focusKeyword = String(seo.focusKeyword || "").trim();

  const excerpt = String(
    seo.excerpt || cleanSubtitle || rawParagraphs[0] || ""
  ).trim().substring(0, 500);

  // ============================================================
  // 10. CATEGORIAS & TAGS
  // ============================================================

  let resolvedCategoryIds = uniqueStrings(categoryIds).slice(0, 10);
  let resolvedTagIds = uniqueStrings(tagIds).slice(0, 30);

  // ============================================================
  // 11. OBJETO FINAL DO DRAFT POST
  // ============================================================

  const draftPostObj = {
    title: cleanHeadline,
    excerpt,
    memberId,
    richContent,
    seoSlug
  };

  if (resolvedCategoryIds.length) {
    draftPostObj.categoryIds = resolvedCategoryIds;
  }

  if (resolvedTagIds.length) {
    draftPostObj.tagIds = resolvedTagIds;
  }

  // ============================================================
  // 12. ENVIO PARA O WIX BLOG API
  // ============================================================

  try {
    const wixResponse = await fetch(
      "https://www.wixapis.com/blog/v3/draft-posts",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          draftPost: draftPostObj
        })
      }
    );

    const data = await wixResponse.json().catch(() => ({}));

    if (!wixResponse.ok) {
      console.error("Erro Wix:", data);
      return res.status(wixResponse.status).json({
        error: data.message || "Erro retornado pela API do Wix.",
        details: data
      });
    }

    return res.status(200).json({
      success: true,
      message: "Rascunho criado com sucesso no Wix.",
      post: data.draftPost || data,
      seo: {
        focusKeyword,
        title: seoTitle,
        description: seoDescription,
        slug: seoSlug
      }
    });

  } catch (error) {
    console.error("Falha de conexão Wix:", error);
    return res.status(500).json({
      error: "Falha de conexão com a API Wix.",
      details: error.message
    });
  }
}
