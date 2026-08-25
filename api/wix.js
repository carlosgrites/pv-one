


// ============================================================
// PORTAL PISTA VERDE — PV ONE
// api/wix.js
// Integração Wix Blog V3
// ============================================================

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Método não permitido."
      });
    }

    // ==========================================================
    // CONFIGURAÇÃO
    // ==========================================================

    const apiKey = String(
      process.env.WIX_API_KEY || ""
    )
      .replace(/^Bearer\s+/i, "")
      .trim();

    const siteId =
      "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";

    const authorEmail =
      "portalpistaverde@gmail.com";

    if (!apiKey) {
      return forwardToConfiguredBackend(req, res);
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: apiKey,
      "wix-site-id": siteId
    };

    // ==========================================================
    // DADOS RECEBIDOS
    // ==========================================================

    const body = req.body || {};

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

    let memberId = null;

    const membersResponse =
      await fetch(
        "https://www.wixapis.com/members/v1/members/query",
        {
          method: "POST",
          headers,
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
            "Não foi possível consultar o autor no Wix.",

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

    if (!memberId) {
      return res.status(400).json({
        error:
          `Não foi possível localizar no Wix o autor ${authorEmail}.`
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

    const draftPost = {
      title: headline,
      excerpt,
      memberId,
      richContent,
      seoSlug,

      seoData: {
        tags: [
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
              content: seoTitle
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
          }
        ]
      }
    };

    if (
      Array.isArray(
        body.categoryIds
      ) &&
      body.categoryIds.length
    ) {
      draftPost.categoryIds =
        [
          ...new Set(
            body.categoryIds
              .map(item =>
                String(item || "").trim()
              )
              .filter(Boolean)
          )
        ].slice(0, 10);
    }

    if (
      Array.isArray(
        body.tagIds
      ) &&
      body.tagIds.length
    ) {
      draftPost.tagIds =
        [
          ...new Set(
            body.tagIds
              .map(item =>
                String(item || "").trim()
              )
              .filter(Boolean)
          )
        ].slice(0, 30);
    }

    // ==========================================================
    // ENVIO AO WIX
    // ==========================================================

    const wixResponse =
      await fetch(
        "https://www.wixapis.com/blog/v3/draft-posts",
        {
          method: "POST",
          headers,

          body:
            JSON.stringify({
              draftPost,

              fieldsets: [
                "URL",
                "RICH_CONTENT"
              ],

              publish: false
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
        slug: seoSlug
      },

      internalLinks:
        internalLinks.length
    });
  } catch (error) {
    console.error(
      "ERRO GERAL API/WIX:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Erro interno na integração com o Wix."
    });
  }
}

async function forwardToConfiguredBackend(req, res) {
  const targetUrl = "https://pv-one-app.vercel.app/api/wix";
  const currentHost = String(
    req.headers?.["x-forwarded-host"] || req.headers?.host || ""
  ).toLowerCase();

  if (currentHost.includes("pv-one-app.vercel.app")) {
    return res.status(500).json({
      error: "A variável WIX_API_KEY não está disponível no backend principal."
    });
  }

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-pv-one-forwarded": "1"
      },
      body: JSON.stringify(req.body || {})
    });

    const responseText = await response.text().catch(() => "");
    res.status(response.status);
    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "application/json; charset=utf-8"
    );

    return res.send(responseText || "{}");
  } catch (error) {
    console.error("PV_ONE_FORWARD_ERROR", error);
    return res.status(502).json({
      error: "Não foi possível acessar o backend principal do PV ONE."
    });
  }
}
