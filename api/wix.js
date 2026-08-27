// ============================================================
// PORTAL PISTA VERDE — PV ONE
// api/wix.js
// Integração Wix Blog V3
// ============================================================

export const config = {
  maxDuration: 60
};

export default async function handler(req, res) {
  try {
    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    if (req.method === "OPTIONS") {
      res.setHeader(
        "Access-Control-Allow-Methods",
        "POST, OPTIONS"
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type"
      );
      return res.status(204).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Método não permitido."
      });
    }

    // ==========================================================
    // CONFIGURAÇÃO
    // ==========================================================

    const apiKey = String(
      process.env.WIX_API_TOKEN ||
      process.env.WIX_API_KEY ||
      ""
    )
      .replace(/^Bearer\s+/i, "")
      .trim();

    const siteId = String(
      process.env.WIX_SITE_ID ||
      "50bca98c-31f2-4172-a19d-c3abf3dd9dd7"
    ).trim();

    const configuredMemberId =
      String(
        process.env.WIX_MEMBER_ID ||
        ""
      ).trim();

    const authorEmail =
      String(
        process.env.WIX_AUTHOR_EMAIL ||
        "portalpistaverde@gmail.com"
      ).trim();

    if (!apiKey) {
      return res.status(500).json({
        error:
          "Configuração ausente: cadastre WIX_API_TOKEN ou WIX_API_KEY na Vercel."
      });
    }

    if (!siteId) {
      return res.status(500).json({
        error:
          "Configuração ausente: WIX_SITE_ID não foi definido."
      });
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: apiKey,
      "wix-site-id": siteId
    };

    async function wixFetch(
      url,
      options = {},
      timeoutMs = 20000
    ) {
      const controller =
        new AbortController();

      const timeout = setTimeout(
        () => controller.abort(),
        timeoutMs
      );

      try {
        return await fetch(
          url,
          {
            ...options,
            headers: {
              ...headers,
              ...(options.headers || {})
            },
            signal: controller.signal
          }
        );
      } catch (error) {
        if (
          error?.name ===
          "AbortError"
        ) {
          throw new Error(
            "A API do Wix demorou além do limite de segurança. Tente novamente."
          );
        }

        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }

    // ==========================================================
    // DADOS RECEBIDOS
    // ==========================================================

    let body = req.body || {};

    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (_) {
        return res.status(400).json({
          error:
            "O corpo enviado ao backend não contém JSON válido."
        });
      }
    }

    const headline =
      String(
        body.headline || "Sem título"
      ).trim();

    const subtitle =
      String(
        body.subtitle || ""
      ).trim();

    const editorialBody =
      String(
        body.editorialBody || ""
      )
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim();

    const editorialBlocks =
      Array.isArray(body.editorialBlocks)
        ? body.editorialBlocks
            .map(item => ({
              type:
                String(item?.type || "paragraph")
                  .trim()
                  .toLowerCase(),
              text:
                String(item?.text || "")
                  .replace(/\r\n?/g, "\n")
                  .replace(/\n+/g, " ")
                  .trim()
            }))
            .filter(item => item.text)
        : [];

    const photographer =
      String(
        body.photographer || "Divulgação"
      ).trim();

    const source =
      String(
        body.source || "Redação"
      ).trim();

    const seo =
      body.seo &&
      typeof body.seo === "object"
        ? body.seo
        : {};

    const internalLinks =
      Array.isArray(body.internalLinks)
        ? body.internalLinks
            .filter(item =>
              item &&
              item.text &&
              item.url
            )
            .slice(0, 3)
        : [];

    if (!headline) {
      return res.status(400).json({
        error:
          "O título da matéria está vazio."
      });
    }

    if (!editorialBody) {
      return res.status(400).json({
        error:
          "O corpo da matéria está vazio."
      });
    }

    // ==========================================================
    // FUNÇÕES AUXILIARES
    // ==========================================================

    async function readResponse(response) {
      const text =
        await response
          .text()
          .catch(() => "");

      if (!text) {
        return {};
      }

      try {
        return JSON.parse(text);
      } catch (_) {
        return {
          message: text
        };
      }
    }

    function slugify(value) {
      return String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .replace(
          /[^a-z0-9\s-]/g,
          ""
        )
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 100);
    }

    function normalizeLabel(value) {
      return String(value || "")
        .normalize("NFD")
        .replace(
          /[\u0300-\u036f]/g,
          ""
        )
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    }

    async function resolveCategoryId(
      categoryLabel
    ) {
      const label =
        String(
          categoryLabel || ""
        ).trim();

      if (!label) {
        return null;
      }

      const response =
        await wixFetch(
          "https://www.wixapis.com/blog/v3/categories?paging.limit=100&paging.offset=0",
          {
            method: "GET"
          }
        );

      const data =
        await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Não foi possível consultar as categorias do Wix."
        );
      }

      const categories =
        Array.isArray(data.categories)
          ? data.categories
          : [];

      const found =
        categories.find(
          category =>
            normalizeLabel(
              category.label ||
              category.title
            ) ===
            normalizeLabel(label)
        );

      if (!found?.id) {
        throw new Error(
          `A categoria oficial "${label}" não foi localizada no Wix.`
        );
      }

      return found.id;
    }

    async function queryExistingTags() {
      const tags = [];

      for (let offset = 0; offset < 500; offset += 100) {
        const response =
          await wixFetch(
            "https://www.wixapis.com/v3/tags/query",
            {
              method: "POST",
              body: JSON.stringify({
                query: {
                  paging: {
                    limit: 100,
                    offset
                  }
                }
              })
            }
          );

        const data =
          await readResponse(response);

        if (!response.ok) {
          throw new Error(
            data.message ||
            "Não foi possível consultar as tags do Wix."
          );
        }

        const page =
          Array.isArray(data.tags)
            ? data.tags
            : [];

        tags.push(...page);

        if (page.length < 100) {
          break;
        }
      }

      return tags;
    }

    async function createTag(label) {
      const safeLabel =
        String(label || "")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 100);

      if (!safeLabel) {
        throw new Error(
          "Uma das tags ficou vazia e o envio foi interrompido antes de chegar ao Wix."
        );
      }

      const response =
        await wixFetch(
          "https://www.wixapis.com/v3/tags",
          {
            method: "POST",
            body: JSON.stringify({
              label: safeLabel
            })
          }
        );

      const data =
        await readResponse(response);

      if (!response.ok) {
        throw new Error(
          data.message ||
          `Não foi possível criar a tag "${safeLabel}" no Wix.`
        );
      }

      const tag =
        data.tag || data;

      if (!tag?.id) {
        throw new Error(
          `O Wix não devolveu o ID da tag "${safeLabel}".`
        );
      }

      return tag;
    }

    async function resolveTagIds(
      labels
    ) {
      const uniqueLabels = [];
      const used = new Set();

      for (
        const item of labels || []
      ) {
        const label =
          String(item || "")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 100);

        const key =
          normalizeLabel(label);

        if (
          label &&
          !used.has(key) &&
          uniqueLabels.length < 28
        ) {
          used.add(key);
          uniqueLabels.push(label);
        }
      }

      if (!uniqueLabels.length) {
        return [];
      }

      const existingTags =
        await queryExistingTags();

      const byLabel = new Map(
        existingTags
          .filter(tag => tag?.id)
          .map(tag => [
            normalizeLabel(tag.label),
            tag
          ])
      );

      const missingLabels =
        uniqueLabels.filter(
          label =>
            !byLabel.has(
              normalizeLabel(label)
            )
        );

      const createdTags = [];

      for (const label of missingLabels) {
        createdTags.push(
          await createTag(label)
        );
      }

      createdTags.forEach(
        tag => {
          byLabel.set(
            normalizeLabel(tag.label),
            tag
          );
        }
      );

      return uniqueLabels
        .map(
          label =>
            byLabel.get(
              normalizeLabel(label)
            )?.id
        )
        .filter(Boolean)
        .slice(0, 28);
    }

    let nodeCounter = 0;

    function nodeId(prefix) {
      nodeCounter += 1;

      return (
        `${prefix}_` +
        `${Date.now()}_` +
        `${nodeCounter}`
      );
    }

    function textNode(
      text,
      decorations = []
    ) {
      const value =
        String(text || "").trim();

      if (!value) {
        throw new Error(
          "Foi encontrado um texto vazio."
        );
      }

      return {
        type: "TEXT",
        id: nodeId("text"),
        nodes: [],
        textData: {
          text: value,
          decorations
        }
      };
    }

    function paragraphNode(
      text,
      decorations = []
    ) {
      return {
        type: "PARAGRAPH",
        id: nodeId("paragraph"),
        nodes: [
          textNode(
            text,
            decorations
          )
        ],
        paragraphData: {
          textStyle: {
            textAlignment: "AUTO"
          },
          indentation: 0
        }
      };
    }

    function headingNode(
      text,
      level = 2
    ) {
      return {
        type: "HEADING",
        id: nodeId(`heading${level}`),
        nodes: [
          textNode(text, [
            {
              type: "BOLD",
              fontWeightValue: 700
            }
          ])
        ],
        headingData: {
          level,
          textStyle: {
            textAlignment: "AUTO"
          },
          indentation: 0
        }
      };
    }

    function linkedParagraph(
      text,
      url
    ) {
      return paragraphNode(
        text,
        [
          {
            type: "LINK",
            linkData: {
              link: {
                url:
                  String(url || "").trim(),
                target: "BLANK"
              }
            }
          }
        ]
      );
    }

    // ==========================================================
    // LOCALIZA O AUTOR
    // ==========================================================

    let memberId =
      configuredMemberId || null;

    if (!memberId) {
      const membersResponse =
        await wixFetch(
          "https://www.wixapis.com/members/v1/members/query",
          {
            method: "POST",
            body: JSON.stringify({
              query: {
                filter: {
                  loginEmail: {
                    $eq: authorEmail
                  }
                },
                paging: {
                  limit: 100,
                  offset: 0
                }
              },
              fieldsets: ["FULL"]
            })
          }
        );

      const membersData =
        await readResponse(
          membersResponse
        );

      if (!membersResponse.ok) {
        return res
          .status(membersResponse.status)
          .json({
            error:
              membersData.message ||
              "Não foi possível consultar o autor no Wix. Cadastre WIX_MEMBER_ID na Vercel.",

            details:
              membersData
          });
      }

      const members =
        Array.isArray(
          membersData.members
        )
          ? membersData.members
          : [];

      const author =
        members.find(member => {
          const email =
            String(
              member.loginEmail ||
              member.contact
                ?.emails?.[0]?.email ||
              ""
            )
              .trim()
              .toLowerCase();

          return (
            email ===
            authorEmail.toLowerCase()
          );
        }) || members[0] || null;

      if (author?.id) {
        memberId = author.id;
      }
    }

    if (!memberId) {
      return res.status(400).json({
        error:
          `Não foi possível localizar no Wix o autor ${authorEmail}. Cadastre WIX_MEMBER_ID na Vercel.`
      });
    }

    // ==========================================================
    // CONVERSÃO PARA RICH CONTENT NATIVO
    // ==========================================================

    const sourceParagraphs =
      editorialBlocks.length
        ? editorialBlocks.map(item => {
            if (item.type === "h2") {
              return `H2: ${item.text}`;
            }

            if (item.type === "h3") {
              return `H3: ${item.text}`;
            }

            return item.text;
          })
        : editorialBody
            .split(/\n+/)
            .map(item => item.trim())
            .filter(Boolean);

    const editorialParagraphs =
      sourceParagraphs.filter(item =>
        !/^##\s+/.test(item) &&
        !/^###\s+/.test(item) &&
        !/^H2:\s*/i.test(item) &&
        !/^H3:\s*/i.test(item)
      );

    const adPosition =
      Math.max(
        2,
        Math.ceil(
          editorialParagraphs.length / 2
        )
      );

    const richNodes = [];

    if (subtitle) {
      richNodes.push(
        paragraphNode(
          subtitle,
          [
            {
              type: "ITALIC",
              italicData: true
            }
          ]
        )
      );
    }

    let paragraphCount = 0;
    let adInserted = false;

    for (
      const item
      of sourceParagraphs
    ) {
      if (
        /^##\s+/.test(item) ||
        /^H2:\s*/i.test(item)
      ) {
        const heading =
          item
            .replace(/^##\s+/, "")
            .replace(/^H2:\s*/i, "")
            .trim();

        if (heading) {
          richNodes.push(
            headingNode(
              heading,
              2
            )
          );
        }

        continue;
      }

      if (
        /^###\s+/.test(item) ||
        /^H3:\s*/i.test(item)
      ) {
        const heading =
          item
            .replace(/^###\s+/, "")
            .replace(/^H3:\s*/i, "")
            .trim();

        if (heading) {
          richNodes.push(
            headingNode(
              heading,
              3
            )
          );
        }

        continue;
      }

      paragraphCount += 1;

      const decorations =
        paragraphCount === 1
          ? [
              {
                type: "BOLD",
                fontWeightValue: 600
              }
            ]
          : [];

      richNodes.push(
        paragraphNode(
          item,
          decorations
        )
      );

      if (
        !adInserted &&
        paragraphCount >= adPosition
      ) {
        richNodes.push(
          headingNode(
            "Parceiro do Kartismo",
            3
          )
        );

        richNodes.push(
          paragraphNode(
            "Inovimpress",
            [
              {
                type: "BOLD",
                fontWeightValue: 700
              }
            ]
          )
        );

        richNodes.push(
          paragraphNode(
            "Comunicação visual e soluções para quem vive a velocidade."
          )
        );

        richNodes.push(
          linkedParagraph(
            "Conheça a Inovimpress",
            "https://www.instagram.com/inovimpress/"
          )
        );

        adInserted = true;
      }
    }

    if (
      !adInserted &&
      paragraphCount > 0
    ) {
      richNodes.push(
        headingNode(
          "Parceiro do Kartismo",
          3
        )
      );

      richNodes.push(
        paragraphNode(
          "Inovimpress",
          [
            {
              type: "BOLD",
              fontWeightValue: 700
            }
          ]
        )
      );

      richNodes.push(
        paragraphNode(
          "Comunicação visual e soluções para quem vive a velocidade."
        )
      );

      richNodes.push(
        linkedParagraph(
          "Conheça a Inovimpress",
          "https://www.instagram.com/inovimpress/"
        )
      );
    }

    // ==========================================================
    // LINKS INTERNOS
    // ==========================================================

    if (internalLinks.length) {
      richNodes.push(
        headingNode(
          "Leia também",
          2
        )
      );

      for (
        const link
        of internalLinks
      ) {
        richNodes.push(
          linkedParagraph(
            String(
              link.text || ""
            ).trim(),

            String(
              link.url || ""
            ).trim()
          )
        );
      }
    }

    // ==========================================================
    // CRÉDITOS
    // ==========================================================

    richNodes.push(
      paragraphNode(
        `Texto/Fonte: ${source} | Fotos: ${photographer}`
      )
    );

    richNodes.push(
      paragraphNode(
        "Reportagem/Texto: José Carlos Grites – jornalista profissional (Registro MTE nº 0007501/SC)"
      )
    );

    // ==========================================================
    // INSTITUCIONAL
    // ==========================================================

    richNodes.push(
      headingNode(
        "Portal Pista Verde",
        2
      )
    );

    richNodes.push(
      paragraphNode(
        "Portal Pista Verde é uma startup nacional dedicada exclusivamente ao ecossistema do kartismo e do automobilismo. Atua com o Programa ESG/ODS Pista Verde para kartódromos e autódromos, com base em referências internacionais traduzidas e adaptadas ao Brasil."
      )
    );

    richNodes.push(
      linkedParagraph(
        "Conheça o Programa ESG/ODS Pista Verde",
        "https://www.pistaverde.com.br/programa-esg-automobilismo"
      )
    );

    // ==========================================================
    // EMPRESAS APOIADORAS
    // ==========================================================

    richNodes.push(
      headingNode(
        "Empresas que apoiam o kartismo",
        2
      )
    );

    richNodes.push(
      paragraphNode(
        "Mega Kart — Empresa parceira e apoiadora do kartismo brasileiro."
      )
    );

    richNodes.push(
      paragraphNode(
        "Paralego — Empresa parceira e apoiadora do esporte a motor."
      )
    );

    const richContent = {
      nodes: richNodes,

      metadata: {
        version: 1
      },

      documentStyle: {}
    };

    // ==========================================================
    // VALIDAÇÃO DO RICH CONTENT
    // ==========================================================

    if (
      !Array.isArray(
        richContent.nodes
      ) ||
      !richContent.nodes.length
    ) {
      return res.status(500).json({
        error:
          "O Rich Content ficou vazio."
      });
    }

    const usedIds = new Set();

    for (
      const node
      of richContent.nodes
    ) {
      if (
        !node ||
        !node.id ||
        !node.type
      ) {
        return res.status(500).json({
          error:
            "Foi criado um nó Rich Content inválido."
        });
      }

      if (usedIds.has(node.id)) {
        return res.status(500).json({
          error:
            `ID Rich Content duplicado: ${node.id}`
        });
      }

      usedIds.add(node.id);

      for (
        const child
        of node.nodes || []
      ) {
        if (
          !child.id ||
          !child.textData?.text
        ) {
          return res.status(500).json({
            error:
              "Foi criado um texto Rich Content inválido."
          });
        }

        if (
          usedIds.has(child.id)
        ) {
          return res.status(500).json({
            error:
              `ID Rich Content duplicado: ${child.id}`
          });
        }

        usedIds.add(child.id);
      }
    }

    // ==========================================================
    // DADOS DO RASCUNHO
    // ==========================================================

    const seoTitle =
      String(
        seo.title ||
        `${headline} | Portal Pista Verde`
      )
        .trim()
        .substring(0, 70);

    const seoDescription =
      String(
        seo.description ||
        subtitle ||
        editorialParagraphs[0] ||
        ""
      )
        .trim()
        .substring(0, 160);

    const ogTitle =
      String(
        seo.ogTitle ||
        seoTitle
      )
        .trim()
        .substring(0, 100);

    const ogDescription =
      String(
        seo.ogDescription ||
        seoDescription
      )
        .trim()
        .substring(0, 220);

    const altText =
      String(
        seo.altText || ""
      )
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 250);

    const seoSlug =
      slugify(
        seo.slug ||
        headline
      );

    const excerpt =
      String(
        seo.excerpt ||
        subtitle ||
        editorialParagraphs[0] ||
        ""
      )
        .trim()
        .substring(0, 500);

    const tagLabels = [];
    const normalizedTagLabels =
      new Set();

    if (Array.isArray(seo.tagLabels)) {
      for (const item of seo.tagLabels) {
        const label =
          String(item || "")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 100);

        const normalized =
          normalizeLabel(label);

        if (
          label &&
          !normalizedTagLabels.has(normalized) &&
          tagLabels.length < 28
        ) {
          normalizedTagLabels.add(normalized);
          tagLabels.push(label);
        }
      }
    }

    if (tagLabels.length !== 28) {
      return res.status(400).json({
        error:
          `O SEO precisa enviar exatamente 28 tags. Foram recebidas ${tagLabels.length}.`
      });
    }

    if (
      !seo.structuredData ||
      typeof seo.structuredData !==
        "object" ||
      Array.isArray(seo.structuredData)
    ) {
      return res.status(400).json({
        error:
          "Os dados estruturados NewsArticle estão ausentes ou inválidos."
      });
    }

    const structuredData =
      JSON.parse(
        JSON.stringify(
          seo.structuredData
        )
      );

    const canonicalUrl =
      `https://www.pistaverde.com.br/post/${seoSlug}`;

    structuredData["@context"] =
      "https://schema.org";
    structuredData["@type"] =
      structuredData["@type"] ||
      "NewsArticle";
    structuredData.headline = headline;
    structuredData.description =
      seoDescription;
    structuredData.articleSection =
      String(
        body.category ||
        seo.category ||
        ""
      ).trim();
    structuredData.keywords =
      tagLabels.join(", ");
    structuredData.mainEntityOfPage = {
      "@type": "WebPage",
      "@id": canonicalUrl
    };
    structuredData.datePublished =
      structuredData.datePublished ||
      new Date().toISOString();
    structuredData.dateModified =
      new Date().toISOString();

    const categoryId =
      await resolveCategoryId(
        body.category ||
        seo.category
      );

    const resolvedTagIds =
      await resolveTagIds(
        tagLabels
      );

    if (resolvedTagIds.length !== 28) {
      return res.status(502).json({
        error:
          `O Wix devolveu ${resolvedTagIds.length} IDs para as 28 tags. O rascunho não foi enviado incompleto.`
      });
    }

    const seoTags = [
      {
        type: "title",
        children: seoTitle
      },
      {
        type: "meta",
        props: {
          name: "description",
          content:
            seoDescription
        }
      },
      {
        type: "meta",
        props: {
          property: "og:title",
          content: ogTitle
        }
      },
      {
        type: "meta",
        props: {
          property:
            "og:description",
          content:
            ogDescription
        }
      },
      {
        type: "link",
        props: {
          rel: "canonical",
          href: canonicalUrl
        }
      },
      {
        type: "script",
        props: {
          type:
            "application/ld+json"
        },
        children:
          JSON.stringify(
            structuredData
          )
      }
    ];

    if (altText) {
      seoTags.push({
        type: "meta",
        props: {
          property:
            "og:image:alt",
          content: altText
        }
      });
    }

    const draftPost = {
      title: headline,
      excerpt,
      memberId,
      richContent,
      seoSlug,

      categoryIds:
        categoryId
          ? [categoryId]
          : [],

      tagIds:
        resolvedTagIds,

      seoData: {
        tags: seoTags
      }
    };

    // ==========================================================
    // ENVIO AO WIX
    // ==========================================================

    const wixResponse =
      await wixFetch(
        "https://www.wixapis.com/blog/v3/draft-posts",
        {
          method: "POST",
          body:
            JSON.stringify({
              draftPost
            })
        }
      );

    const wixData =
      await readResponse(
        wixResponse
      );

    if (!wixResponse.ok) {
      return res
        .status(wixResponse.status)
        .json({
          error:
            wixData.message ||
            wixData.error ||
            "Erro retornado pela API do Wix.",

          details:
            wixData
        });
    }

    return res.status(200).json({
      success: true,

      message:
        "Rascunho criado com sucesso no Wix.",

      post:
        wixData.draftPost ||
        wixData,

      seo: {
        title: seoTitle,
        description:
          seoDescription,
        slug: seoSlug,
        ogTitle,
        ogDescription,
        structuredData: true,
        categoryApplied:
          Boolean(categoryId),
        tagsApplied:
          resolvedTagIds.length
      },

      internalLinks:
        internalLinks.length
    });
  } catch (error) {
    console.error(
      "ERRO GERAL API/WIX:",
      error
    );

    const isTimeout =
      /tempo limite|demorou demais/i.test(
        String(error?.message || "")
      );

    return res.status(
      isTimeout ? 504 : 500
    ).json({
      error:
        error?.message ||
        "Erro interno na integração com o Wix.",
      code:
        isTimeout
          ? "WIX_TIMEOUT"
          : "PV_ONE_WIX_ERROR"
    });
  }
}
