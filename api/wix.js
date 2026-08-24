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

  const apiKeyRaw =
    "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImQ2MWZhMTE0LWY2YWItNDBiYy1hNzdjLTVjODUzNGNiNWJmOVwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcImEyNTM5M2Q0LTgxOTQtNDdkZi04ZDBlLTMzY2FhN2ExYzkxOFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3NDcxM2E2ZS1lMDA3LTRkZjktOGNjNC1hMTA1OGM1NWQwNWRcIn19IiwiaWF0IjoxNzg3MjY1NTg4fQ.ZmRwqkfXkdY2z-PTbNpjzQWZXAVBdMj3_SCJ6cgvcfgaS2KWG31MLgjwM4kKv0bY8uT5lCZ93cx13dWqPdYel4vDZL8kCVwqFV5a9A7oftLBV6IO7kvuwW6hLaR4YbXch4LPSSELUhWVsXzrbzCZJXk-pmFnLUs58TUydiRxgZDZXmZmyoRhPC8KiSMiMRMr71mjzFs2gB8ifHDG6TZOsQeEPR3HsGZ_f_trXqaV0iuXXnLp07PkxYfem6ZyMhlJF9nKvnJnrGc70sS1ZJeBTiDyLxJsY_xgWSsvuQ3YkqATKYQn6YSUasncCQN7a3yU-BB4ojOgr6twqhKojw7VOQ";

  const siteIdRaw =
    "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";

  const authorEmail =
    "portalpistaverde@gmail.com";

  const cleanApiKey =
    String(apiKeyRaw || "")
      .replace(/^Bearer\s+/i, "")
      .trim();

  const cleanSiteId =
    String(siteIdRaw || "").trim();

  if (
    !cleanApiKey ||
    cleanApiKey ===
      "COLE_AQUI_A_MESMA_CHAVE_WIX_QUE_JA_ESTA_NO_SEU_ARQUIVO"
  ) {
    return res.status(500).json({
      error: "A chave da API Wix ainda não foi configurada."
    });
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: cleanApiKey,
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
    seo = {},
    internalLinks = [],
    structuredData = null
  } = req.body || {};

  const cleanHeadline =
    String(headline || "Sem título").trim();

  const cleanSubtitle =
    String(subtitle || "").trim();

  const photographerText =
    String(photographer || "Divulgação").trim();

  const sourceText =
    String(source || "Redação").trim();

  const cleanCategory =
    String(category || "").trim();

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

  async function readJson(response) {
    const responseText =
      await response.text().catch(() => "");

    if (!responseText) {
      return {};
    }

    try {
      return JSON.parse(responseText);
    } catch (_) {
      return {
        message: responseText
      };
    }
  }

  // ============================================================
  // 5. BUSCA DO AUTOR
  // ============================================================

  let memberId = null;

  try {
    const encodedEmail =
      encodeURIComponent(authorEmail);

    const memberUrl =
      `https://www.wixapis.com/members/v1/members` +
      `?fieldsets=FULL&query.fieldName=loginEmail` +
      `&query.eq=${encodedEmail}`;

    const memberResponse =
      await fetch(memberUrl, {
        method: "GET",
        headers: authHeaders
      });

    const memberData =
      await readJson(memberResponse);

    if (
      memberResponse.ok &&
      Array.isArray(memberData.members) &&
      memberData.members.length > 0
    ) {
      memberId =
        memberData.members[0].id || null;
    }
  } catch (error) {
    console.error(
      "Erro procurando autor:",
      error
    );
  }

  if (!memberId) {
    try {
      const memberResponse =
        await fetch(
          "https://www.wixapis.com/members/v1/members?paging.limit=100",
          {
            method: "GET",
            headers: authHeaders
          }
        );

      const memberData =
        await readJson(memberResponse);

      if (
        memberResponse.ok &&
        Array.isArray(memberData.members)
      ) {
        const foundMember =
          memberData.members.find(member => {
            const loginEmail =
              String(
                member.loginEmail ||
                member.contact?.emails?.[0]?.email ||
                ""
              )
                .trim()
                .toLowerCase();

            return (
              loginEmail ===
              authorEmail.toLowerCase()
            );
          });

        if (foundMember?.id) {
          memberId = foundMember.id;
        }
      }
    } catch (error) {
      console.error(
        "Erro na segunda busca do autor:",
        error
      );
    }
  }

  if (!memberId) {
    return res.status(400).json({
      error:
        `Não foi possível localizar no Wix o autor ${authorEmail}.`
    });
  }

  // ============================================================
  // 6. CORPO EDITORIAL
  // ============================================================

  const normalizedEditorialBody =
    normalizeText(editorialBody);

  let rawParagraphs = [];

  if (
    Array.isArray(paragraphs) &&
    paragraphs.length
  ) {
    rawParagraphs =
      paragraphs
        .map(item => normalizeText(item))
        .filter(Boolean);
  } else if (normalizedEditorialBody) {
    rawParagraphs =
      normalizedEditorialBody
        .split(/\n+/)
        .map(item => item.trim())
        .filter(Boolean);
  }

  if (!rawParagraphs.length) {
    return res.status(400).json({
      error:
        "O corpo editorial está vazio. Não foi possível montar o Rich Content."
    });
  }

  // ============================================================
  // 7. LINKS INTERNOS
  // ============================================================

  const cleanInternalLinks =
    Array.isArray(internalLinks)
      ? internalLinks
          .filter(link =>
            link &&
            String(link.url || "").trim() &&
            String(link.text || "").trim()
          )
          .slice(0, 3)
      : [];

  // ============================================================
  // 8. RICH CONTENT NATIVO WIX / RICOS
  // ============================================================

  let nodeCounter = 0;

  function newNodeId(prefix = "node") {
    nodeCounter += 1;

    return (
      `${prefix}_` +
      `${Date.now()}_` +
      `${nodeCounter}`
    );
  }

  function boldDecoration(weight = 700) {
    return {
      type: "BOLD",
      fontWeightValue: weight
    };
  }

  function italicDecoration() {
    return {
      type: "ITALIC",
      italicData: true
    };
  }

  function underlineDecoration() {
    return {
      type: "UNDERLINE",
      underlineData: true
    };
  }

  function colorDecoration(color) {
    return {
      type: "COLOR",
      colorData: {
        foreground: color
      }
    };
  }

  function fontSizeDecoration(size) {
    return {
      type: "FONT_SIZE",
      fontSizeData: {
        value: size,
        unit: "PX"
      }
    };
  }

  function linkDecoration(url) {
    return {
      type: "LINK",
      linkData: {
        link: {
          url: String(url || "").trim(),
          target: "BLANK",
          rel: {
            noreferrer: true
          }
        }
      }
    };
  }

  function textNode(text, options = {}) {
    const cleanText =
      String(text || "").trim();

    if (!cleanText) {
      throw new Error(
        "Foi encontrado um nó de texto vazio durante a criação do Rich Content."
      );
    }

    const decorations = [];

    if (options.bold) {
      decorations.push(
        boldDecoration(
          options.fontWeight || 700
        )
      );
    }

    if (options.italic) {
      decorations.push(
        italicDecoration()
      );
    }

    if (options.underline) {
      decorations.push(
        underlineDecoration()
      );
    }

    if (options.color) {
      decorations.push(
        colorDecoration(options.color)
      );
    }

    if (options.fontSize) {
      decorations.push(
        fontSizeDecoration(options.fontSize)
      );
    }

    if (options.linkUrl) {
      decorations.push(
        linkDecoration(options.linkUrl)
      );
    }

    return {
      type: "TEXT",
      id: newNodeId("txt"),
      nodes: [],
      textData: {
        text: cleanText,
        decorations
      }
    };
  }

  function paragraphNode(
    text,
    options = {}
  ) {
    const node = {
      type: "PARAGRAPH",
      id: newNodeId("p"),
      nodes: [
        textNode(text, {
          bold: Boolean(options.bold),
          italic: Boolean(options.italic),
          underline:
            Boolean(options.underline),
          color:
            options.color || "#333333",
          fontSize:
            options.fontSize || 18,
          fontWeight:
            options.fontWeight || 700,
          linkUrl:
            options.linkUrl || ""
        })
      ],
      paragraphData: {
        textStyle: {
          textAlignment:
            options.textAlignment || "AUTO",
          lineHeight:
            options.lineHeight || "1.78"
        },
        indentation: 0
      }
    };

    if (
      options.paddingTop ||
      options.paddingBottom
    ) {
      node.style = {
        paddingTop:
          options.paddingTop || "0px",
        paddingBottom:
          options.paddingBottom || "25px"
      };
    }

    return node;
  }

  function headingNode(
    text,
    level = 2
  ) {
    const isH2 = level === 2;

    return {
      type: "HEADING",
      id: newNodeId(`h${level}`),
      nodes: [
        textNode(text, {
          bold: true,
          fontWeight:
            isH2 ? 900 : 800,
          color:
            isH2
              ? "#00AE35"
              : "#21300C",
          fontSize:
            isH2 ? 32 : 22
        })
      ],
      style: {
        paddingTop:
          isH2 ? "23px" : "12px",
        paddingBottom:
          isH2 ? "18px" : "10px"
      },
      headingData: {
        level,
        textStyle: {
          textAlignment: "AUTO",
          lineHeight:
            isH2 ? "1.25" : "1.35"
        },
        indentation: 0
      }
    };
  }

  function publicidadeNodes() {
    return [
      headingNode(
        "Parceiro do Kartismo",
        3
      ),

      paragraphNode(
        "Inovimpress",
        {
          bold: true,
          fontWeight: 800,
          color: "#21300C",
          fontSize: 20,
          paddingBottom: "8px"
        }
      ),

      paragraphNode(
        "Comunicação visual e soluções para quem vive a velocidade.",
        {
          color: "#333333",
          fontSize: 16,
          lineHeight: "1.6",
          paddingBottom: "8px"
        }
      ),

      paragraphNode(
        "Conheça",
        {
          bold: true,
          fontWeight: 800,
          color: "#00AE35",
          fontSize: 16,
          underline: true,
          linkUrl:
            "https://www.instagram.com/inovimpress/",
          paddingBottom: "26px"
        }
      )
    ];
  }

  function finalMateriaNodes() {
    return [
      headingNode(
        "Empresas que apoiam o kartismo",
        2
      ),

      paragraphNode(
        "Marcas que ajudam a manter o esporte em movimento.",
        {
          italic: true,
          color: "#626B5D",
          fontSize: 15,
          lineHeight: "1.6",
          paddingBottom: "18px"
        }
      ),

      headingNode(
        "Mega Kart",
        3
      ),

      paragraphNode(
        "Empresa parceira e apoiadora do kartismo brasileiro.",
        {
          color: "#333333",
          fontSize: 16,
          lineHeight: "1.6",
          paddingBottom: "16px"
        }
      ),

      headingNode(
        "Paralego",
        3
      ),

      paragraphNode(
        "Empresa parceira e apoiadora do esporte a motor.",
        {
          color: "#333333",
          fontSize: 16,
          lineHeight: "1.6",
          paddingBottom: "28px"
        }
      ),

      headingNode(
        "Portal Pista Verde",
        2
      ),

      paragraphNode(
        "Grid aquecido com responsabilidade",
        {
          bold: true,
          fontWeight: 800,
          color: "#00AE35",
          fontSize: 16,
          lineHeight: "1.5",
          paddingBottom: "12px"
        }
      ),

      paragraphNode(
        "O Portal Pista Verde é uma startup brasileira especializada no ecossistema do kartismo e automobilismo e desenvolve o Programa ESG/ODS Pista Verde para kartódromos e autódromos, com referências internacionais adaptadas à realidade brasileira.",
        {
          color: "#333333",
          fontSize: 16,
          lineHeight: "1.7",
          paddingBottom: "12px"
        }
      ),

      paragraphNode(
        "Conheça o Programa ESG/ODS",
        {
          bold: true,
          fontWeight: 800,
          color: "#00AE35",
          fontSize: 16,
          underline: true,
          linkUrl:
            "https://www.pistaverde.com.br/programa-esg-automobilismo",
          paddingBottom: "20px"
        }
      )
    ];
  }

  const richNodes = [];

  // ============================================================
  // SUBTÍTULO
  // ============================================================

  if (cleanSubtitle) {
    richNodes.push(
      paragraphNode(
        cleanSubtitle,
        {
          italic: true,
          color: "#333333",
          fontSize: 18,
          lineHeight: "1.65",
          paddingBottom: "26px"
        }
      )
    );
  }

  // ============================================================
  // LOCALIZA O MEIO DO CORPO PARA PUBLICIDADE
  // ============================================================

  const editorialCount =
    rawParagraphs
      .filter(item => {
        const text =
          String(item || "").trim();

        return (
          text &&
          !/^##\s+/.test(text) &&
          !/^H2:\s*/i.test(text) &&
          !/^###\s+/.test(text) &&
          !/^H3:\s*/i.test(text)
        );
      })
      .length;

  const adAfterParagraph =
    Math.max(
      2,
      Math.ceil(editorialCount / 2)
    );

  let editorialParagraphIndex = 0;
  let adInserted = false;

  // ============================================================
  // CORPO DA MATÉRIA
  // ============================================================

  for (
    const paragraph
    of rawParagraphs
  ) {
    const text =
      String(paragraph || "").trim();

    if (!text) {
      continue;
    }

    // H2

    if (
      /^##\s+/.test(text) ||
      /^H2:\s*/i.test(text)
    ) {
      const heading =
        text
          .replace(/^##\s+/, "")
          .replace(/^H2:\s*/i, "")
          .trim();

      if (heading) {
        richNodes.push(
          headingNode(heading, 2)
        );
      }

      continue;
    }

    // H3

    if (
      /^###\s+/.test(text) ||
      /^H3:\s*/i.test(text)
    ) {
      const heading =
        text
          .replace(/^###\s+/, "")
          .replace(/^H3:\s*/i, "")
          .trim();

      if (heading) {
        richNodes.push(
          headingNode(heading, 3)
        );
      }

      continue;
    }

    editorialParagraphIndex += 1;

    const isLead =
      editorialParagraphIndex === 1;

    richNodes.push(
      paragraphNode(
        text,
        {
          bold: isLead,
          fontWeight:
            isLead ? 600 : 400,
          color:
            isLead
              ? "#21300C"
              : "#333333",
          fontSize:
            isLead ? 21 : 18,
          lineHeight:
            isLead ? "1.62" : "1.78",
          paddingBottom:
            isLead ? "30px" : "25px"
        }
      )
    );

    // PUBLICIDADE NO MEIO

    if (
      !adInserted &&
      editorialParagraphIndex >=
        adAfterParagraph
    ) {
      richNodes.push(
        ...publicidadeNodes()
      );

      adInserted = true;
    }
  }

  // MATÉRIA CURTA

  if (
    !adInserted &&
    editorialParagraphIndex > 0
  ) {
    richNodes.push(
      ...publicidadeNodes()
    );
  }

  // ============================================================
  // LINKS INTERNOS
  // ============================================================

  if (cleanInternalLinks.length) {
    richNodes.push(
      headingNode(
        "Leia também",
        2
      )
    );

    for (
      const link
      of cleanInternalLinks
    ) {
      richNodes.push(
        paragraphNode(
          String(link.text || "").trim(),
          {
            color: "#00AE35",
            fontSize: 18,
            lineHeight: "1.6",
            paddingBottom: "12px",
            underline: true,
            linkUrl:
              String(link.url || "").trim()
          }
        )
      );
    }
  }

  // ============================================================
  // CRÉDITO FINAL
  // ============================================================

  richNodes.push(
    paragraphNode(
      `Texto/Fonte: ${sourceText} | Fotos: ${photographerText} | Redação: José Carlos Grites — Jornalista | Portal Pista Verde`,
      {
        italic: true,
        color: "#626B5D",
        fontSize: 13,
        lineHeight: "1.7",
        paddingTop: "18px",
        paddingBottom: "20px"
      }
    )
  );

  // ============================================================
  // FINAL DA MATÉRIA NATIVO
  // ============================================================

  richNodes.push(
    ...finalMateriaNodes()
  );

  // ============================================================
  // DOCUMENTO RICOS
  // ============================================================

  const richContent = {
    nodes: richNodes,

    metadata: {
      version: 1
    },

    documentStyle: {
      paragraph: {
        decorations: [
          colorDecoration("#333333"),
          fontSizeDecoration(18)
        ],

        nodeStyle: {
          paddingTop: "0px",
          paddingBottom: "25px"
        },

        lineHeight: "1.78"
      },

      headerTwo: {
        decorations: [
          boldDecoration(900),
          colorDecoration("#00AE35"),
          fontSizeDecoration(32)
        ],

        nodeStyle: {
          paddingTop: "23px",
          paddingBottom: "18px"
        },

        lineHeight: "1.25"
      },

      headerThree: {
        decorations: [
          boldDecoration(800),
          colorDecoration("#21300C"),
          fontSizeDecoration(22)
        ],

        nodeStyle: {
          paddingTop: "12px",
          paddingBottom: "10px"
        },

        lineHeight: "1.35"
      }
    }
  };

  // ============================================================
  // VALIDAÇÃO LOCAL DO RICH CONTENT
  // ============================================================

  function validateRichContent(document) {
    if (
      !document ||
      !Array.isArray(document.nodes) ||
      document.nodes.length === 0
    ) {
      throw new Error(
        "O documento Rich Content não possui nós."
      );
    }

    const usedIds = new Set();

    function validateNode(node) {
      if (
        !node ||
        typeof node !== "object"
      ) {
        throw new Error(
          "Foi encontrado um nó Rich Content inválido."
        );
      }

      if (!node.type) {
        throw new Error(
          "Foi encontrado um nó Rich Content sem tipo."
        );
      }

      if (!node.id) {
        throw new Error(
          `O nó ${node.type} não possui ID.`
        );
      }

      if (
        !/^[A-Za-z][A-Za-z0-9_-]*$/.test(
          node.id
        )
      ) {
        throw new Error(
          `O nó ${node.type} possui ID inválido: ${node.id}`
        );
      }

      if (usedIds.has(node.id)) {
        throw new Error(
          `ID duplicado no Rich Content: ${node.id}`
        );
      }

      usedIds.add(node.id);

      if (node.type === "TEXT") {
        if (
          !node.textData ||
          typeof node.textData.text !==
            "string" ||
          !node.textData.text.trim()
        ) {
          throw new Error(
            `O nó de texto ${node.id} está vazio.`
          );
        }

        if (
          !Array.isArray(
            node.textData.decorations
          )
        ) {
          throw new Error(
            `As decorações do nó ${node.id} são inválidas.`
          );
        }
      }

      if (
        node.type === "PARAGRAPH" ||
        node.type === "HEADING"
      ) {
        if (
          !Array.isArray(node.nodes) ||
          node.nodes.length === 0
        ) {
          throw new Error(
            `O nó ${node.type} ${node.id} não possui conteúdo.`
          );
        }

        for (
          const child
          of node.nodes
        ) {
          if (child.type !== "TEXT") {
            throw new Error(
              `O nó ${node.type} ${node.id} possui um filho inválido.`
            );
          }
        }
      }

      if (Array.isArray(node.nodes)) {
        for (
          const child
          of node.nodes
        ) {
          validateNode(child);
        }
      }
    }

    for (
      const node
      of document.nodes
    ) {
      validateNode(node);
    }

    return true;
  }

  try {
    validateRichContent(richContent);
  } catch (error) {
    console.error(
      "Falha na validação Rich Content:",
      error
    );

    return res.status(500).json({
      error:
        "Não foi possível montar o formato nativo do Wix.",
      details:
        error.message
    });
  }

  // ============================================================
  // 9. SEO
  // ============================================================

  const seoTitle =
    String(
      seo.title ||
      `${cleanHeadline} | Portal Pista Verde`
    )
      .trim()
      .substring(0, 70);

  const seoDescription =
    String(
      seo.description ||
      cleanSubtitle ||
      rawParagraphs[0] ||
      ""
    )
      .trim()
      .substring(0, 160);

  const seoSlug =
    slugify(
      seo.slug ||
      cleanHeadline
    );

  const focusKeyword =
    String(
      seo.focusKeyword || ""
    ).trim();

  const excerpt =
    String(
      seo.excerpt ||
      cleanSubtitle ||
      rawParagraphs[0] ||
      ""
    )
      .trim()
      .substring(0, 500);

  // ============================================================
  // 10. SEO DATA
  // ============================================================

  const seoTags = [
    {
      type: "title",
      children: seoTitle
    },

    {
      type: "meta",
      props: {
        name: "description",
        content: seoDescription
      }
    },

    {
      type: "meta",
      props: {
        property: "og:title",
        content: seoTitle
      }
    },

    {
      type: "meta",
      props: {
        property: "og:description",
        content: seoDescription
      }
    },

    {
      type: "meta",
      props: {
        name: "twitter:title",
        content: seoTitle
      }
    },

    {
      type: "meta",
      props: {
        name: "twitter:description",
        content: seoDescription
      }
    }
  ];

  // ============================================================
  // 11. CATEGORIA
  // ============================================================

  let resolvedCategoryIds =
    uniqueStrings(categoryIds);

  if (
    resolvedCategoryIds.length === 0 &&
    cleanCategory
  ) {
    try {
      const categoryResponse =
        await fetch(
          "https://www.wixapis.com/blog/v3/categories?paging.limit=100",
          {
            method: "GET",
            headers: authHeaders
          }
        );

      const categoryData =
        await readJson(categoryResponse);

      if (
        categoryResponse.ok &&
        Array.isArray(
          categoryData.categories
        )
      ) {
        const wanted =
          cleanCategory.toLowerCase();

        const found =
          categoryData.categories
            .find(cat => {
              const label =
                String(
                  cat.label ||
                  cat.name ||
                  cat.title ||
                  ""
                )
                  .trim()
                  .toLowerCase();

              return label === wanted;
            });

        if (found?.id) {
          resolvedCategoryIds = [
            found.id
          ];
        }
      }
    } catch (error) {
      console.error(
        "Erro resolvendo categoria:",
        error
      );
    }
  }

  resolvedCategoryIds =
    uniqueStrings(
      resolvedCategoryIds
    ).slice(0, 10);

  // ============================================================
  // 12. TAGS
  // ============================================================

  let resolvedTagIds =
    uniqueStrings(tagIds);

  const requestedTagNames =
    uniqueStrings(
      Array.isArray(seo.tags)
        ? seo.tags
        : []
    ).slice(0, 30);

  if (
    resolvedTagIds.length === 0 &&
    requestedTagNames.length > 0
  ) {
    try {
      const tagsResponse =
        await fetch(
          "https://www.wixapis.com/blog/v3/tags?paging.limit=100",
          {
            method: "GET",
            headers: authHeaders
          }
        );

      const tagsData =
        await readJson(tagsResponse);

      const existingTags =
        tagsResponse.ok &&
        Array.isArray(tagsData.tags)
          ? tagsData.tags
          : [];

      const tagMap = new Map();

      for (
        const tag
        of existingTags
      ) {
        const label =
          String(
            tag.label ||
            tag.name ||
            ""
          )
            .trim()
            .toLowerCase();

        if (
          label &&
          tag.id
        ) {
          tagMap.set(
            label,
            tag.id
          );
        }
      }

      for (
        const requestedName
        of requestedTagNames
      ) {
        const normalizedName =
          requestedName.toLowerCase();

        if (
          tagMap.has(normalizedName)
        ) {
          resolvedTagIds.push(
            tagMap.get(normalizedName)
          );

          continue;
        }

        try {
          const createTagResponse =
            await fetch(
              "https://www.wixapis.com/blog/v3/tags",
              {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify({
                  tag: {
                    label:
                      requestedName
                  }
                })
              }
            );

          const createTagData =
            await readJson(
              createTagResponse
            );

          if (
            createTagResponse.ok &&
            createTagData.tag?.id
          ) {
            resolvedTagIds.push(
              createTagData.tag.id
            );
          } else {
            console.error(
              `Erro criando tag ${requestedName}:`,
              createTagData
            );
          }
        } catch (error) {
          console.error(
            `Erro criando tag ${requestedName}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error(
        "Erro resolvendo tags:",
        error
      );
    }
  }

  resolvedTagIds =
    uniqueStrings(
      resolvedTagIds
    ).slice(0, 30);

  // ============================================================
  // 13. DADOS ESTRUTURADOS
  // ============================================================

  let structuredDataMarkup = null;

  if (
    structuredData &&
    typeof structuredData ===
      "object"
  ) {
    structuredDataMarkup =
      structuredData;
  } else if (
    seo.structuredData &&
    typeof seo.structuredData ===
      "object"
  ) {
    structuredDataMarkup =
      seo.structuredData;
  } else {
    structuredDataMarkup = {
      "@context":
        "https://schema.org",

      "@type":
        "NewsArticle",

      headline:
        cleanHeadline,

      description:
        seoDescription,

      author: {
        "@type": "Person",
        name:
          "José Carlos Grites"
      },

      publisher: {
        "@type":
          "Organization",

        name:
          "Portal Pista Verde",

        url:
          "https://www.pistaverde.com.br/"
      }
    };
  }

  seoTags.push({
    type: "script",

    props: {
      type:
        "application/ld+json"
    },

    children:
      JSON.stringify(
        structuredDataMarkup
      )
  });

  // ============================================================
  // 14. OBJETO FINAL DO RASCUNHO
  // ============================================================

  const draftPostObj = {
    title:
      cleanHeadline,

    excerpt,

    memberId,

    richContent,

    seoSlug,

    seoData: {
      settings: {
        keywords:
          focusKeyword
            ? [focusKeyword]
            : [],

        preventAutoRedirect:
  false
      },

      tags:
        seoTags
    }
  };

  if (
    resolvedCategoryIds.length
  ) {
    draftPostObj.categoryIds =
      resolvedCategoryIds;
  }

  if (resolvedTagIds.length) {
    draftPostObj.tagIds =
      resolvedTagIds;
  }

  // ============================================================
  // 15. CRIAÇÃO DO RASCUNHO NO WIX
  // ============================================================

  try {
    const wixResponse =
      await fetch(
        "https://www.wixapis.com/blog/v3/draft-posts",
        {
          method: "POST",

          headers:
            authHeaders,

          body:
            JSON.stringify({
              draftPost:
                draftPostObj,

              fieldsets: [
                "URL",
                "RICH_CONTENT"
              ]
            })
        }
      );

    const data =
      await readJson(wixResponse);

    if (!wixResponse.ok) {
      console.error(
        "Erro Wix:",
        JSON.stringify(
          data,
          null,
          2
        )
      );

      return res
        .status(wixResponse.status)
        .json({
          error:
            data.message ||
            data.error ||
            "Erro retornado pela API do Wix.",

          details:
            data
        });
    }

    return res.status(200).json({
      success: true,

      message:
        "Rascunho criado com sucesso no Wix.",

      post:
        data.draftPost ||
        data,

      seo: {
        focusKeyword,
        title: seoTitle,
        description:
          seoDescription,
        slug: seoSlug
      },

      categoryIds:
        resolvedCategoryIds,

      tagIds:
        resolvedTagIds,

      internalLinks:
        cleanInternalLinks.length
    });
  } catch (error) {
    console.error(
      "Falha de conexão Wix:",
      error
    );

    return res.status(500).json({
      error:
        "Falha de conexão com a API Wix.",

      details:
        error.message
    });
  }
}
