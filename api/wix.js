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
      memberId = memberData.members[0].id;
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
  // 8. RICH CONTENT NATIVO WIX / RICOS
  // PADRÃO OFICIAL PORTAL PISTA VERDE
  // ============================================================

  let nodeCounter = 0;

  function newNodeId(prefix = "node") {
    nodeCounter += 1;
    return `${prefix}_${Date.now()}_${nodeCounter}`;
  }

  function decorationFontSize(size) {
    return {
      type: "FONT_SIZE",
      fontSizeData: {
        unit: "PX",
        value: size
      }
    };
  }

  function decorationColor(color) {
    return {
      type: "COLOR",
      colorData: {
        foreground: color
      }
    };
  }

  function textNode(text, options = {}) {

    const decorations = [];

    if (options.bold) {
      decorations.push({
        type: "BOLD",
        fontWeightValue:
          options.fontWeight || 700
      });
    }

    if (options.italic) {
      decorations.push({
        type: "ITALIC",
        italicData: true
      });
    }

    if (options.underline) {
      decorations.push({
        type: "UNDERLINE",
        underlineData: true
      });
    }

    if (options.color) {
      decorations.push(
        decorationColor(
          options.color
        )
      );
    }

    if (options.fontSize) {
      decorations.push(
        decorationFontSize(
          options.fontSize
        )
      );
    }

    if (options.linkUrl) {
      decorations.push({
        type: "LINK",
        linkData: {
          link: {
            url:
              String(
                options.linkUrl
              ).trim(),
            target:
              "BLANK",
            rel: {
              noreferrer:
                true
            }
          }
        }
      });
    }

    return {
      type:
        "TEXT",

      id:
        newNodeId(
          "txt"
        ),

      nodes:
        [],

      textData: {
        text:
          String(
            text || ""
          ),

        decorations
      }
    };
  }

  function paragraphNode(
    text,
    options = {}
  ) {

    return {
      type:
        "PARAGRAPH",

      id:
        newNodeId(
          "p"
        ),

      nodes: [
        textNode(
          text,
          {
            bold:
              !!options.bold,

            italic:
              !!options.italic,

            underline:
              !!options.underline,

            color:
              options.color ||
              "#333333",

            fontSize:
              options.fontSize ||
              18,

            fontWeight:
              options.fontWeight ||
              700,

            linkUrl:
              options.linkUrl ||
              ""
          }
        )
      ],

      style: {
        paddingTop:
          options.paddingTop ||
          "0px",

        paddingBottom:
          options.paddingBottom ||
          "25px"
      },

      paragraphData: {
        textStyle: {
          textAlignment:
            options.textAlignment ||
            "AUTO",

          lineHeight:
            options.lineHeight ||
            "1.78"
        },

        indentation:
          0
      }
    };
  }

  function headingNode(
    text,
    level = 2
  ) {

    const isH2 =
      level === 2;

    return {
      type:
        "HEADING",

      id:
        newNodeId(
          `h${level}`
        ),

      nodes: [
        textNode(
          text,
          {
            bold:
              true,

            fontWeight:
              900,

            color:
              isH2
                ? "#00AE35"
                : "#21300C",

            fontSize:
              isH2
                ? 32
                : 22
          }
        )
      ],

      style: {
        paddingTop:
          isH2
            ? "23px"
            : "12px",

        paddingBottom:
          isH2
            ? "18px"
            : "10px"
      },

      headingData: {
        level,

        textStyle: {
          textAlignment:
            "AUTO",

          lineHeight:
            isH2
              ? "1.25"
              : "1.35"
        },

        indentation:
          0
      }
    };
  }

  function htmlNode(
    html,
    height = "280",
    width = "860"
  ) {

    return {
      type:
        "HTML",

      id:
        newNodeId(
          "html"
        ),

      nodes:
        [],

      htmlData: {
        containerData: {
          textWrap:
            false,

          height: {
            custom:
              String(
                height
              )
          },

          alignment:
            "CENTER",

          width: {
            custom:
              String(
                width
              )
          }
        },

        source:
          "HTML",

        html:
          String(
            html || ""
          )
      }
    };
  }

  // ============================================================
  // PUBLICIDADE — BLOCO HTML / IFRAME
  // ============================================================

  const publicidadeHtml = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{
  box-sizing:border-box
}

html,
body{
  margin:0;
  padding:0;
  background:#fff;
  font-family:Poppins,Inter,Arial,sans-serif;
  color:#fff
}

.ppv-ad{
  width:100%;
  margin:0;
  padding:0;
  border:1px solid rgba(0,174,53,.40);
  border-top:5px solid #00AE35;
  border-radius:16px;
  background:#101510;
  overflow:hidden
}

.ppv-ad-inner{
  display:grid;
  grid-template-columns:150px minmax(0,1fr);
  gap:20px;
  align-items:center;
  padding:20px
}

.ppv-ad img{
  display:block;
  width:100%;
  height:85px;
  border-radius:10px;
  background:#fff;
  object-fit:contain;
  padding:4px
}

.ppv-ad-tag{
  display:inline-block;
  margin-bottom:6px;
  padding:4px 10px;
  border-radius:999px;
  background:#00AE35;
  color:#fff;
  font-size:11px;
  font-weight:900;
  text-transform:uppercase
}

.ppv-ad h3{
  margin:0 0 6px;
  color:#fff;
  font-size:20px;
  line-height:1.2;
  font-weight:900
}

.ppv-ad p{
  margin:0 0 14px;
  color:#dfe7dc;
  font-size:14px;
  line-height:1.5
}

.ppv-ad a{
  display:inline-block;
  padding:10px 20px;
  border-radius:999px;
  background:#00AE35;
  color:#fff;
  text-decoration:none;
  font-size:12px;
  font-weight:900;
  text-transform:uppercase
}

@media(max-width:600px){
  .ppv-ad-inner{
    grid-template-columns:1fr
  }

  .ppv-ad img{
    max-width:180px
  }

  .ppv-ad h3{
    font-size:19px
  }
}
</style>
</head>

<body>

<div class="ppv-ad">

  <div class="ppv-ad-inner">

    <div>
      <img
        src="https://static.wixstatic.com/media/74713a_047159b52f354bf58867c3b705e82fa8~mv2.png"
        alt="Inovimpress"
      >
    </div>

    <div>

      <span class="ppv-ad-tag">
        Parceiro do Kartismo
      </span>

      <h3>
        Inovimpress
      </h3>

      <p>
        Comunicação visual e soluções para quem vive a velocidade.
      </p>

      <a
        href="https://www.instagram.com/inovimpress/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Conheça
      </a>

    </div>

  </div>

</div>

</body>
</html>`;

  // ============================================================
  // FINAL DA MATÉRIA
  // APOIADORES + INSTITUCIONAL
  // ============================================================

  const finalMateriaHtml = `<!doctype html>
<html lang="pt-BR">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<style>

*{
  box-sizing:border-box
}

html,
body{
  margin:0;
  padding:0;
  background:#fff;
  font-family:Poppins,Inter,Arial,sans-serif;
  color:#21300C
}

.ppv-wrap{
  width:100%;
  margin:0;
  padding:0
}

.ppv-apoio{
  padding:26px;
  border:1px solid #d1dbcd;
  border-radius:18px;
  background:#f2f6f1
}

.ppv-apoio h2{
  margin:0;
  color:#21300C;
  font-size:22px;
  line-height:1.25;
  font-weight:900
}

.ppv-apoio>p{
  margin:6px 0 0;
  color:#5b6558;
  font-size:13px;
  line-height:1.6
}

.ppv-grid{
  display:grid;
  grid-template-columns:
    repeat(
      2,
      minmax(
        0,
        1fr
      )
    );
  gap:20px;
  margin-top:18px
}

.ppv-card{
  padding:18px;
  border-left:5px solid #00AE35;
  border-radius:14px;
  background:#fff;
  border-top:1px solid #e2e8f0;
  border-right:1px solid #e2e8f0;
  border-bottom:1px solid #e2e8f0
}

.ppv-card h3{
  margin:0 0 6px;
  color:#21300C;
  font-size:16px;
  font-weight:800
}

.ppv-card p{
  margin:0;
  color:#374151;
  font-size:13px;
  line-height:1.55
}

.ppv-footer{
  margin-top:28px;
  padding:28px;
  background:#071007;
  border-top:6px solid #00AE35;
  border-radius:16px;
  color:#fff;
  text-align:center
}

.ppv-brand{
  display:flex;
  align-items:center;
  justify-content:center;
  gap:12px;
  margin-bottom:12px
}

.ppv-mark{
  padding:5px 12px;
  border-radius:8px;
  background:#00AE35;
  color:#101510;
  font-size:18px;
  font-weight:900
}

.ppv-name strong{
  display:block;
  color:#fff;
  font-size:20px;
  line-height:1;
  font-weight:900;
  letter-spacing:1px
}

.ppv-name span{
  font-size:12px;
  color:#00AE35;
  font-weight:700;
  text-transform:uppercase
}

.ppv-footer p{
  max-width:700px;
  margin:0 auto 16px;
  color:#cbd5e1;
  font-size:13px;
  line-height:1.65
}

.ppv-footer a{
  display:inline-block;
  padding:10px 22px;
  border-radius:999px;
  background:#00AE35;
  color:#fff;
  text-decoration:none;
  font-size:12px;
  font-weight:800;
  text-transform:uppercase
}

@media(max-width:600px){

  .ppv-grid{
    grid-template-columns:1fr
  }

  .ppv-brand{
    align-items:flex-start
  }

  .ppv-footer{
    padding:24px 18px
  }
}

</style>

</head>

<body>

<div class="ppv-wrap">

  <section class="ppv-apoio">

    <h2>
      Empresas que apoiam o kartismo
    </h2>

    <p>
      Marcas que ajudam a manter o esporte em movimento.
    </p>

    <div class="ppv-grid">

      <div class="ppv-card">

        <h3>
          Mega Kart
        </h3>

        <p>
          Empresa parceira e apoiadora do kartismo brasileiro.
        </p>

      </div>

      <div class="ppv-card">

        <h3>
          Paralego
        </h3>

        <p>
          Empresa parceira e apoiadora do esporte a motor.
        </p>

      </div>

    </div>

  </section>

  <section class="ppv-footer">

    <div class="ppv-brand">

      <div class="ppv-mark">
        PV
      </div>

      <div class="ppv-name">

        <strong>
          PORTAL PISTA VERDE
        </strong>

        <span>
          Grid aquecido com responsabilidade
        </span>

      </div>

    </div>

    <p>
      O Portal Pista Verde é uma startup brasileira especializada
      no ecossistema do kartismo e automobilismo e desenvolve o
      Programa ESG/ODS Pista Verde para kartódromos e autódromos,
      com referências internacionais adaptadas à realidade brasileira.
    </p>

    <a
      href="https://www.pistaverde.com.br/programa-esg-automobilismo"
      target="_blank"
      rel="noopener noreferrer"
    >
      Conheça o Programa ESG/ODS
    </a>

  </section>

</div>

</body>
</html>`;

  const richNodes = [];

  // ============================================================
  // SUBTÍTULO
  // ============================================================

  if (cleanSubtitle) {

    richNodes.push(
      paragraphNode(
        cleanSubtitle,
        {
          italic:
            true,

          color:
            "#333333",

          fontSize:
            18,

          lineHeight:
            "1.65",

          paddingBottom:
            "26px"
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

        const t =
          String(
            item || ""
          ).trim();

        return (
          t &&
          !/^##\s+/.test(t) &&
          !/^H2:\s*/i.test(t) &&
          !/^###\s+/.test(t) &&
          !/^H3:\s*/i.test(t)
        );
      })
      .length;

  const adAfterParagraph =
    Math.max(
      2,
      Math.ceil(
        editorialCount / 2
      )
    );

  let editorialParagraphIndex =
    0;

  let adInserted =
    false;

  // ============================================================
  // CORPO DA MATÉRIA
  // ============================================================

  rawParagraphs.forEach(
    paragraph => {

      const text =
        String(
          paragraph || ""
        ).trim();

      if (!text) {
        return;
      }

      // H2

      if (
        /^##\s+/.test(text) ||
        /^H2:\s*/i.test(text)
      ) {

        const heading =
          text
            .replace(
              /^##\s+/,
              ""
            )
            .replace(
              /^H2:\s*/i,
              ""
            )
            .trim();

        if (heading) {
          richNodes.push(
            headingNode(
              heading,
              2
            )
          );
        }

        return;
      }

      // H3

      if (
        /^###\s+/.test(text) ||
        /^H3:\s*/i.test(text)
      ) {

        const heading =
          text
            .replace(
              /^###\s+/,
              ""
            )
            .replace(
              /^H3:\s*/i,
              ""
            )
            .trim();

        if (heading) {
          richNodes.push(
            headingNode(
              heading,
              3
            )
          );
        }

        return;
      }

      editorialParagraphIndex += 1;

      const isLead =
        editorialParagraphIndex === 1;

      richNodes.push(
        paragraphNode(
          text,
          {
            bold:
              isLead,

            fontWeight:
              isLead
                ? 600
                : 400,

            color:
              isLead
                ? "#21300C"
                : "#333333",

            fontSize:
              isLead
                ? 21
                : 18,

            lineHeight:
              isLead
                ? "1.62"
                : "1.78",

            paddingBottom:
              isLead
                ? "30px"
                : "25px"
          }
        )
      );

      // PUBLICIDADE NO MEIO DA MATÉRIA

      if (
        !adInserted &&
        editorialParagraphIndex >=
          adAfterParagraph
      ) {

        richNodes.push(
          htmlNode(
            publicidadeHtml,
            "250",
            "860"
          )
        );

        adInserted =
          true;
      }
    }
  );

  // MATÉRIA MUITO CURTA

  if (
    !adInserted &&
    editorialParagraphIndex > 0
  ) {

    richNodes.push(
      htmlNode(
        publicidadeHtml,
        "250",
        "860"
      )
    );
  }

  // ============================================================
  // LINKS INTERNOS
  // ============================================================

  if (
    cleanInternalLinks.length
  ) {

    richNodes.push(
      headingNode(
        "Leia também",
        2
      )
    );

    cleanInternalLinks
      .forEach(link => {

        richNodes.push(
          paragraphNode(
            String(
              link.text ||
              ""
            ).trim(),
            {
              color:
                "#00AE35",

              fontSize:
                18,

              lineHeight:
                "1.6",

              paddingBottom:
                "12px",

              underline:
                true,

              linkUrl:
                String(
                  link.url ||
                  ""
                ).trim()
            }
          )
        );
      });
  }

  // ============================================================
  // CRÉDITO FINAL
  // ============================================================

  richNodes.push(
    paragraphNode(
      `Texto/Fonte: ${sourceText} | Fotos: ${photographerText} | Redação: José Carlos Grites — Jornalista | Portal Pista Verde`,
      {
        italic:
          true,

        color:
          "#626B5D",

        fontSize:
          13,

        lineHeight:
          "1.7",

        paddingTop:
          "18px",

        paddingBottom:
          "20px"
      }
    )
  );

  // ============================================================
  // FINAL DA MATÉRIA — HTML / IFRAME
  // ============================================================

  richNodes.push(
    htmlNode(
      finalMateriaHtml,
      "620",
      "860"
    )
  );

  // ============================================================
  // DOCUMENTO RICOS
  // ============================================================

  const richContent = {

    nodes:
      richNodes,

    metadata: {
      version:
        1,

      id:
        newNodeId(
          "document"
        )
    },

    documentStyle: {

      paragraph: {

        decorations: [
          decorationColor(
            "#333333"
          ),

          decorationFontSize(
            18
          )
        ],

        nodeStyle: {
          paddingTop:
            "0px",

          paddingBottom:
            "25px"
        },

        lineHeight:
          "1.78"
      },

      headerTwo: {

        decorations: [
          {
            type:
              "BOLD",

            fontWeightValue:
              900
          },

          decorationColor(
            "#00AE35"
          ),

          decorationFontSize(
            32
          )
        ],

        nodeStyle: {
          paddingTop:
            "23px",

          paddingBottom:
            "18px"
        },

        lineHeight:
          "1.25"
      },

      headerThree: {

        decorations: [
          {
            type:
              "BOLD",

            fontWeightValue:
              800
          },

          decorationColor(
            "#21300C"
          ),

          decorationFontSize(
            22
          )
        ],

        nodeStyle: {
          paddingTop:
            "12px",

          paddingBottom:
            "10px"
        },

        lineHeight:
          "1.35"
      }
    }
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
      type:
        "title",

      children:
        seoTitle
    },

    {
      type:
        "meta",

      props: {
        name:
          "description",

        content:
          seoDescription
      }
    },

    {
      type:
        "meta",

      props: {
        property:
          "og:title",

        content:
          seoTitle
      }
    },

    {
      type:
        "meta",

      props: {
        property:
          "og:description",

        content:
          seoDescription
      }
    },

    {
      type:
        "meta",

      props: {
        name:
          "twitter:title",

        content:
          seoTitle
      }
    },

    {
      type:
        "meta",

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
            method:
              "GET",

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

        if (
          found?.id
        ) {

          resolvedCategoryIds =
            [
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
            method:
              "GET",

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

      settings: {

        keywords:
          focusKeyword
            ? [
                focusKeyword
              ]
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
                draftPostObj,

              fieldsets: [
                "URL",
                "RICH_CONTENT"
              ]
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
