export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Método não permitido."
    });
  }

  // ============================================================
  // 1. CONFIGURAÇÃO WIX
  // ============================================================

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  // COLE SUA NOVA CHAVE DA API WIX ENTRE AS ASPAS ABAIXO
  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  const apiKeyRaw = "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImQ2MWZhMTE0LWY2YWItNDBiYy1hNzdjLTVjODUzNGNiNWJmOVwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcImEyNTM5M2Q0LTgxOTQtNDdkZi04ZDBlLTMzY2FhN2ExYzkxOFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3NDcxM2E2ZS1lMDA3LTRkZjktOGNjNC1hMTA1OGM1NWQwNWRcIn19IiwiaWF0IjoxNzg3MjY1NTg4fQ.ZmRwqkfXkdY2z-PTbNpjzQWZXAVBdMj3_SCJ6cgvcfgaS2KWG31MLgjwM4kKv0bY8uT5lCZ93cx13dWqPdYel4vDZL8kCVwqFV5a9A7oftLBV6IO7kvuwW6hLaR4YbXch4LPSSELUhWVsXzrbzCZJXk-pmFnLUs58TUydiRxgZDZXmZmyoRhPC8KiSMiMRMr71mjzFs2gB8ifHDG6TZOsQeEPR3HsGZ_f_trXqaV0iuXXnLp07PkxYfem6ZyMhlJF9nKvnJnrGc70sS1ZJeBTiDyLxJsY_xgWSsvuQ3YkqATKYQn6YSUasncCQN7a3yU-BB4ojOgr6twqhKojw7VOQ";

  const siteIdRaw = "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  // COLOQUE AQUI O E-MAIL USADO COMO MEMBRO DO SITE WIX
  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  const authorEmail = "portalpistaverde@gmail.com";

  const cleanApiKey = String(apiKeyRaw || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  const cleanSiteId = String(siteIdRaw || "").trim();

  const cleanAuthorEmail = String(authorEmail || "")
    .trim()
    .toLowerCase();

  if (
    !cleanApiKey ||
    cleanApiKey === "COLE_AQUI_SUA_NOVA_CHAVE_API_WIX"
  ) {
    return res.status(500).json({
      success: false,
      error: "Chave da API Wix não configurada."
    });
  }

  if (!cleanSiteId) {
    return res.status(500).json({
      success: false,
      error: "Site ID do Wix não configurado."
    });
  }

  if (
    !cleanAuthorEmail ||
    cleanAuthorEmail === "cole_aqui_o_email_do_membro_wix"
  ) {
    return res.status(500).json({
      success: false,
      error: "E-mail do autor Wix não configurado."
    });
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: cleanApiKey,
    "wix-site-id": cleanSiteId
  };

  // ============================================================
  // 2. DADOS RECEBIDOS DO PV ONE
  // ============================================================

  const {
    headline,
    subtitle,
    editorialBody,
    paragraphs,
    photographer,
    source,
    coverImageUrl,
    coverImageAlt,
    categoryIds,
    tagIds
  } = req.body || {};

  const cleanHeadline = String(headline || "").trim();
  const cleanSubtitle = String(subtitle || "").trim();

  if (!cleanHeadline) {
    return res.status(400).json({
      success: false,
      error: "Título da matéria não informado."
    });
  }

  // ============================================================
  // 3. BUSCAR AUTOMATICAMENTE O MEMBER ID CORRETO
  // ============================================================

  let memberId = null;
  let memberInfo = null;

  try {
    const memberQueryPayload = {
      query: {
        filter: {
          loginEmail: cleanAuthorEmail
        },
        paging: {
          limit: 1
        }
      }
    };

    console.log(
      "[PV ONE] BUSCANDO MEMBRO WIX:",
      cleanAuthorEmail
    );

    console.log(
      "[PV ONE] MEMBER QUERY PAYLOAD:",
      JSON.stringify(memberQueryPayload, null, 2)
    );

    const memberResponse = await fetch(
      "https://www.wixapis.com/members/v1/members/query",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(memberQueryPayload)
      }
    );

    const memberText = await memberResponse.text();

    let memberData;

    try {
      memberData = memberText
        ? JSON.parse(memberText)
        : {};
    } catch {
      memberData = {
        raw: memberText
      };
    }

    console.log(
      "[PV ONE] MEMBER STATUS:",
      memberResponse.status
    );

    console.log(
      "[PV ONE] MEMBER RESPONSE:",
      JSON.stringify(memberData, null, 2)
    );

    if (!memberResponse.ok) {
      return res.status(memberResponse.status || 500).json({
        success: false,
        error: "Não foi possível consultar os membros do Wix.",
        wixStatus: memberResponse.status,
        details: memberData
      });
    }

    if (
      !Array.isArray(memberData.members) ||
      memberData.members.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Autor não encontrado como membro do site Wix.",
        authorEmail: cleanAuthorEmail,
        instruction:
          "Este e-mail precisa existir como membro do site, não apenas como contato ou administrador do painel Wix."
      });
    }

    memberInfo = memberData.members[0];

    memberId =
      memberInfo.id ||
      memberInfo._id ||
      null;

    if (!memberId) {
      return res.status(500).json({
        success: false,
        error:
          "O Wix encontrou o membro, mas não retornou um Member ID válido.",
        details: memberInfo
      });
    }

    console.log(
      "[PV ONE] MEMBER ID CORRETO ENCONTRADO:",
      memberId
    );

    console.log(
      "[PV ONE] MEMBER NICKNAME:",
      memberInfo?.profile?.nickname || null
    );

  } catch (memberError) {
    console.error(
      "[PV ONE] ERRO AO BUSCAR MEMBRO:",
      memberError
    );

    return res.status(500).json({
      success: false,
      error:
        "Falha de conexão ao consultar o membro do Wix.",
      details:
        memberError instanceof Error
          ? memberError.message
          : String(memberError)
    });
  }

  // ============================================================
  // 4. NORMALIZAÇÃO DOS PARÁGRAFOS
  // ============================================================

  let rawParagraphs = [];

  if (Array.isArray(paragraphs)) {
    rawParagraphs = paragraphs
      .map((p) => String(p || "").trim())
      .filter(Boolean);

  } else if (
    typeof paragraphs === "string" &&
    paragraphs.trim()
  ) {
    rawParagraphs = paragraphs
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

  } else if (
    typeof editorialBody === "string" &&
    editorialBody.trim()
  ) {
    rawParagraphs = editorialBody
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  // ============================================================
  // 5. RICH CONTENT
  // ============================================================

 const nodes = [];

let nodeCounter = 0;

function createParagraph(text, decorations = []) {
  nodeCounter += 1;

  return {
    type: "PARAGRAPH",
    id: `pv_p_${nodeCounter}`,
    nodes: [
      {
        type: "TEXT",
        id: "",
        nodes: [],
        textData: {
          text: String(text || "").trim(),
          decorations: decorations
        }
      }
    ],
    paragraphData: {
      textStyle: {
        textAlignment: "AUTO"
      },
      indentation: 0
    }
  };
}

if (cleanSubtitle) {
  nodes.push(
    createParagraph(
      cleanSubtitle,
      [{ type: "ITALIC" }]
    )
  );
}

rawParagraphs.forEach((paragraph) => {
  const text = String(paragraph || "").trim();

  if (text) {
    nodes.push(createParagraph(text));
  }
});

  // ============================================================
  // 6. CRÉDITOS
  // ============================================================

  const photographerText = String(
    photographer || "Divulgação"
  ).trim();

  const sourceText = String(
    source || "Redação"
  ).trim();

  nodes.push({
    type: "PARAGRAPH",
    nodes: [
      {
        type: "TEXT",
        textData: {
          text:
            `Fotos: ${photographerText} | ` +
            `Fonte: ${sourceText} | ` +
            `Redação Portal Pista Verde`,
          decorations: [
            {
              type: "ITALIC"
            }
          ]
        }
      }
    ]
  });

  // ============================================================
  // 7. EXCERPT
  // ============================================================

  const excerpt = cleanSubtitle
    ? cleanSubtitle.length > 150
      ? cleanSubtitle.substring(0, 147).trim() + "..."
      : cleanSubtitle
    : "";

  // ============================================================
  // 8. OBJETO DO DRAFT
  // ============================================================

  const draftPostObj = {
    title: cleanHeadline,
    excerpt,
    memberId,
    richContent: {
      nodes
    }
  };

  if (
    Array.isArray(categoryIds) &&
    categoryIds.length > 0
  ) {
    draftPostObj.categoryIds = categoryIds
      .map((id) => String(id || "").trim())
      .filter(Boolean);
  }

  if (
    Array.isArray(tagIds) &&
    tagIds.length > 0
  ) {
    draftPostObj.tagIds = tagIds
      .map((id) => String(id || "").trim())
      .filter(Boolean);
  }

  // ============================================================
  // 9. IMPORTAÇÃO DA CAPA
  // ============================================================

  let importedCover = null;
  let nativeCoverId = null;

  if (
    typeof coverImageUrl === "string" &&
    coverImageUrl.trim()
  ) {
    const cleanCoverUrl = coverImageUrl.trim();

    const importPayload = {
      url: cleanCoverUrl,
      mediaType: "IMAGE"
    };

    console.log(
      "[PV ONE] IMPORTAÇÃO CAPA - PAYLOAD:",
      JSON.stringify(importPayload, null, 2)
    );

    try {
      const importResponse = await fetch(
        "https://www.wixapis.com/site-media/v1/files/import",
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(importPayload)
        }
      );

      const importText = await importResponse.text();

      let importData;

      try {
        importData = importText
          ? JSON.parse(importText)
          : {};
      } catch {
        importData = {
          raw: importText
        };
      }

      console.log(
        "[PV ONE] IMPORTAÇÃO CAPA - STATUS:",
        importResponse.status
      );

      console.log(
        "[PV ONE] IMPORTAÇÃO CAPA - RESPOSTA:",
        JSON.stringify(importData, null, 2)
      );

      if (importResponse.ok) {
        importedCover = importData;

        nativeCoverId =
          importData?.file?.id ||
          importData?.file?.fileId ||
          importData?.fileDescriptor?.id ||
          importData?.fileDescriptor?.fileId ||
          importData?.id ||
          null;
      }

    } catch (coverError) {
      console.error(
        "[PV ONE] ERRO NA IMPORTAÇÃO DA CAPA:",
        coverError
      );
    }
  }

  // ============================================================
  // 10. COVER MEDIA
  // ============================================================

  if (nativeCoverId) {
    draftPostObj.media = {
      displayed: true,
      custom: true,
      wixMedia: {
        image: {
          id: nativeCoverId
        }
      }
    };

    console.log(
      "[PV ONE] CAPA ANEXADA AO DRAFT:",
      nativeCoverId
    );
  }

  // ============================================================
  // 11. PAYLOAD FINAL
  // ============================================================

  const wixPayload = {
    draftPost: draftPostObj
  };

  console.log(
    "[PV ONE] ========================================"
  );

  console.log(
    "[PV ONE] AUTOR:",
    cleanAuthorEmail
  );

  console.log(
    "[PV ONE] MEMBER ID:",
    memberId
  );

  console.log(
    "[PV ONE] ENDPOINT:",
    "https://www.wixapis.com/blog/v3/draft-posts"
  );

  console.log(
    "[PV ONE] METHOD: POST"
  );

  console.log(
    "[PV ONE] PAYLOAD:",
    JSON.stringify(wixPayload, null, 2)
  );

  console.log(
    "[PV ONE] CAPA URL RECEBIDA:",
    coverImageUrl || null
  );

  console.log(
    "[PV ONE] CAPA ID:",
    nativeCoverId || null
  );

  console.log(
    "[PV ONE] ========================================"
  );

  // ============================================================
  // 12. ENVIO PARA BLOG V3
  // ============================================================

  try {
    const wixResponse = await fetch(
      "https://www.wixapis.com/blog/v3/draft-posts",
      {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(wixPayload)
      }
    );

    const responseText = await wixResponse.text();

    let data;

    try {
      data = responseText
        ? JSON.parse(responseText)
        : {};
    } catch {
      data = {
        raw: responseText
      };
    }

    console.log(
      "[PV ONE] WIX STATUS:",
      wixResponse.status
    );

    console.log(
      "[PV ONE] WIX RESPONSE:",
      JSON.stringify(data, null, 2)
    );

    // REGRA PV ONE:
    // 200 OU 201 = SUCESSO

    if (
      wixResponse.status !== 200 &&
      wixResponse.status !== 201
    ) {
      return res
        .status(wixResponse.status || 500)
        .json({
          success: false,

          error:
            data?.message ||
            data?.error ||
            "Erro retornado pela API do Wix.",

          wixStatus: wixResponse.status,

          details: data,

          debug: {
            authorEmail: cleanAuthorEmail,
            memberId,
            headline: cleanHeadline,
            coverImageReceived:
              Boolean(coverImageUrl),
            nativeCoverId,
            coverAttached:
              Boolean(draftPostObj.media)
          }
        });
    }

    // ==========================================================
    // SUCESSO
    // ==========================================================

    return res.status(200).json({
      success: true,

      wixStatus: wixResponse.status,

      message:
        "Rascunho enviado com sucesso ao Wix.",

      author: {
        email: cleanAuthorEmail,
        memberId,
        nickname:
          memberInfo?.profile?.nickname || null
      },

      post:
        data?.draftPost ||
        data,

      cover: {
        urlReceived:
          Boolean(coverImageUrl),

        imported:
          Boolean(importedCover),

        nativeId:
          nativeCoverId,

        attachedToDraft:
          Boolean(draftPostObj.media)
      }
    });

  } catch (error) {
    console.error(
      "[PV ONE] ERRO DE CONEXÃO:",
      error
    );

    return res.status(500).json({
      success: false,

      error:
        "Falha de conexão com a API Wix.",

      details:
        error instanceof Error
          ? error.message
          : String(error)
    });
  }
}
