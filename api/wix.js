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

  // ============================================================
  // COLE SUA CHAVE WIX SOMENTE AQUI
  // ============================================================

  const apiKeyRaw = "COLE_SUA_CHAVE_WIX_AQUI";

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
    cleanApiKey === "COLE_SUA_CHAVE_WIX_AQUI"
  ) {
    return res.status(500).json({
      error:
        "A chave da API Wix ainda não foi configurada."
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
          .map(item =>
            String(item || "").trim()
          )
          .filter(Boolean)
      )
    ];
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
      await memberResponse
        .json()
        .catch(() => ({}));

    if (
      memberResponse.ok &&
      Array.isArray(memberData.members) &&
      memberData.members.length > 0
    ) {
      memberId =
        memberData.members[0].id;
    }

  } catch (error) {
    console.error(
      "Erro procurando autor:",
      error
    );
  }

  // SEGUNDA TENTATIVA
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
        await memberResponse
          .json()
          .catch(() => ({}));

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
              ).toLowerCase();

            return (
              loginEmail ===
              authorEmail.toLowerCase()
            );
          });

        if (foundMember) {
          memberId =
            foundMember.id;
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
        .map(item =>
          normalizeText(item)
        )
        .filter(Boolean);

  } else if (normalizedEditorialBody) {

    rawParagraphs =
      normalizedEditorialBody
        .split(/\n+/)
        .map(item =>
          item.trim()
        )
        .filter(Boolean);
  }

  // ============================================================
  // 7. LINKS INTERNOS
  // ============================================================

  const cleanInternalLinks =
    Array.isArray(internalLinks)
      ? internalLinks
          .filter(link =>
            link &&
            link.url &&
            link.text
          )
          .slice(0, 3)
      : [];

  // ============================================================
  // 8. RICH CONTENT NATIVO
  // ============================================================

  let nodeCounter = 0;

  function newNodeId(prefix = "node") {
    nodeCounter += 1;

    return (
      prefix +
      "_" +
      Date.now() +
      "_" +
      nodeCounter
    );
  }

  function textNode(
    text,
    decorations = []
  ) {

    return {
      type: "TEXT",
      id: newNodeId("txt"),
      nodes: [],
      textData: {
        text:
          String(text || ""),
        decorations
      }
    };
  }

  function paragraphNode(
    text,
    options = {}
  ) {

    const decorations = [];

    if (options.bold) {
      decorations.push({
        type: "BOLD",
        boldData: {}
      });
    }

    if (options.italic) {
      decorations.push({
        type: "ITALIC",
        italicData: {}
      });
    }

    return {
      type: "PARAGRAPH",
      id: newNodeId("p"),

      nodes: [
        textNode(
          text,
          decorations
        )
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

  // ============================================================
  // SUBTÍTULO
  // ============================================================

  if (cleanSubtitle) {

    richNodes.push(
      paragraphNode(
        cleanSubtitle,
        {
          italic: true
        }
      )
    );
  }

  // ============================================================
  // PARÁGRAFOS
  // ============================================================

  rawParagraphs.forEach(
    (paragraph, index) => {

      const text =
        String(
          paragraph || ""
        ).trim();

      if (!text) {
        return;
      }

      // H2 NO FORMATO ## TÍTULO
      if (
        /^##\s+/.test(text)
      ) {

        const heading =
          text
            .replace(
              /^##\s+/,
              ""
            )
            .trim();

        if (heading) {
          richNodes.push(
            headingNode(
              heading
            )
          );
        }

        return;
      }

      // H2 NO FORMATO H2: TÍTULO
      if (
        /^H2:\s*/i.test(text)
      ) {

        const heading =
          text
            .replace(
              /^H2:\s*/i,
              ""
            )
            .trim();

        if (heading) {
          richNodes.push(
            headingNode(
              heading
            )
          );
        }

        return;
      }

      richNodes.push(
        paragraphNode(
          text,
          {
            bold:
              index === 0
          }
        )
      );
    }
  );

  // ============================================================
  // CRÉDITO FINAL
  // ============================================================

  richNodes.push(
    paragraphNode(
      `Texto/Fonte: ${sourceText} | Fotos: ${photographerText} | Redação: José Carlos Grites — Jornalista | Portal Pista Verde`,
      {
        italic: true
      }
    )
  );

  const richContent = {
    nodes: richNodes,

    metadata: {
      version: 1,
      id:
        newNodeId(
          "document"
        )
    },

    documentStyle: {}
  };

  // ============================================================
  // 9. SEO
  // ============================================================

  const seoTitle =
    String(
      seo.title ||
      `${cleanHeadline} | Portal Pista Verde`
    )
      .trim()
      .substring(
        0,
        70
      );

  const seoDescription =
    String(
      seo.description ||
      cleanSubtitle ||
      rawParagraphs[0] ||
      ""
    )
      .trim()
      .substring(
        0,
        160
      );

  const seoSlug =
    slugify(
      seo.slug ||
      cleanHeadline
    );

  const focusKeyword =
    String(
      seo.focusKeyword ||
      ""
    ).trim();

  const excerpt =
    String(
      seo.excerpt ||
      cleanSubtitle ||
      rawParagraphs[0] ||
      ""
    )
      .trim()
      .substring(
        0,
        500
      );

  // ============================================================
  // 10. SEO DATA
  // ============================================================

  const seoTags = [

    {
      type: "title",
      children:
        seoTitle
    },

    {
      type: "meta",
      props: {
        name:
          "description",
        content:
          seoDescription
      }
    },

    {
      type: "meta",
      props: {
        property:
          "og:title",
        content:
          seoTitle
      }
    },

    {
      type: "meta",
      props: {
        property:
          "og:description",
        content:
          seoDescription
      }
    },

    {
      type: "meta",
      props: {
        name:
          "twitter:title",
        content:
          seoTitle
      }
    },

    {
      type: "meta",
      props: {
        name:
          "twitter:description",
        content:
          seoDescription
      }
    }
  ];

  // ============================================================
  // 11. CATEGORIA
  // ============================================================

  let resolvedCategoryIds =
    uniqueStrings(
      categoryIds
    );

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
            headers:
              authHeaders
          }
        );

      const categoryData =
        await categoryResponse
          .json()
          .catch(
            () => ({})
          );

      if (
        categoryResponse.ok &&
        Array.isArray(
          categoryData.categories
        )
      ) {

        const wanted =
          cleanCategory
            .toLowerCase();

        const found =
          categoryData
            .categories
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

              return (
                label ===
                wanted
              );
            });

        if (found?.id) {
          resolvedCategoryIds =
            [found.id];
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
    resolvedCategoryIds
      .slice(
        0,
        10
      );

  // ============================================================
  // 12. TAGS
  // ============================================================

  let resolvedTagIds =
    uniqueStrings(
      tagIds
    );

  const requestedTagNames =
    uniqueStrings(
      Array.isArray(
        seo.tags
      )
        ? seo.tags
        : []
    )
      .slice(
        0,
        30
      );

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
            headers:
              authHeaders
          }
        );

      const tagsData =
        await tagsResponse
          .json()
          .catch(
            () => ({})
          );

      const existingTags =
        tagsResponse.ok &&
        Array.isArray(
          tagsData.tags
        )
          ? tagsData.tags
          : [];

      const tagMap =
        new Map();

      existingTags
        .forEach(tag => {

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
        });

      for (
        const requestedName
        of requestedTagNames
      ) {

        const normalizedName =
          requestedName
            .toLowerCase();

        if (
          tagMap.has(
            normalizedName
          )
        ) {

          resolvedTagIds.push(
            tagMap.get(
              normalizedName
            )
          );

          continue;
        }

        // ========================================================
        // CRIAR TAG CASO NÃO EXISTA
        // ========================================================

        try {

          const createTagResponse =
            await fetch(
              "https://www.wixapis.com/blog/v3/tags",
              {
                method:
                  "POST",

                headers:
                  authHeaders,

                body:
                  JSON.stringify({
                    tag: {
                      label:
                        requestedName
                    }
                  })
              }
            );

          const createTagData =
            await createTagResponse
              .json()
              .catch(
                () => ({})
              );

          const createdTag =
            createTagData.tag;

          if (
            createTagResponse.ok &&
            createdTag?.id
          ) {

            resolvedTagIds.push(
              createdTag.id
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
    )
      .slice(
        0,
        30
      );

  // ============================================================
  // 13. DADOS ESTRUTURADOS
  // ============================================================

  let structuredDataMarkup =
    null;

  if (
    structuredData &&
    typeof structuredData ===
      "object"
  ) {

    structuredDataMarkup =
      structuredData;

  } else {

    structuredDataMarkup = {

      "@context":
        "https://schema.org",

      "@type":
        "NewsArticle",

      "headline":
        cleanHeadline,

      "description":
        seoDescription,

      "author": {
        "@type":
          "Person",

        "name":
          "José Carlos Grites"
      },

      "publisher": {
        "@type":
          "Organization",

        "name":
          "Portal Pista Verde",

        "url":
          "https://www.pistaverde.com.br/"
      }
    };
  }

  seoTags.push({

    type:
      "script",

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

  if (
    resolvedTagIds.length
  ) {

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
          method:
            "POST",

          headers:
            authHeaders,

          body:
            JSON.stringify({
              draftPost:
                draftPostObj
            })
        }
      );

    const data =
      await wixResponse
        .json()
        .catch(
          () => ({})
        );

    if (
      !wixResponse.ok
    ) {

      console.error(
        "Erro Wix:",
        data
      );

      return res
        .status(
          wixResponse.status
        )
        .json({

          error:
            data.message ||
            "Erro retornado pela API do Wix.",

          details:
            data
        });
    }

    // ==========================================================
    // SUCESSO
    // ==========================================================

    return res
      .status(200)
      .json({

        success:
          true,

        message:
          "Rascunho criado com sucesso no Wix.",

        post:
          data.draftPost ||
          data,

        seo: {

          focusKeyword,

          title:
            seoTitle,

          description:
            seoDescription,

          slug:
            seoSlug
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

    return res
      .status(500)
      .json({

        error:
          "Falha de conexão com a API Wix.",

        details:
          error.message
      });
  }
}
