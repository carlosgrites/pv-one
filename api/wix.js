export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Método não permitido."
    });
  }

  // ============================================================
  // 1. CREDENCIAIS WIX
  // ============================================================

  // COLE SUA NOVA CHAVE DA API WIX ENTRE AS ASPAS ABAIXO:
  const apiKeyRaw = "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImQ2MWZhMTE0LWY2YWItNDBiYy1hNzdjLTVjODUzNGNiNWJmOVwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcImEyNTM5M2Q0LTgxOTQtNDdkZi04ZDBlLTMzY2FhN2ExYzkxOFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3NDcxM2E2ZS1lMDA3LTRkZjktOGNjNC1hMTA1OGM1NWQwNWRcIn19IiwiaWF0IjoxNzg3MjY1NTg4fQ.ZmRwqkfXkdY2z-PTbNpjzQWZXAVBdMj3_SCJ6cgvcfgaS2KWG31MLgjwM4kKv0bY8uT5lCZ93cx13dWqPdYel4vDZL8kCVwqFV5a9A7oftLBV6IO7kvuwW6hLaR4YbXch4LPSSELUhWVsXzrbzCZJXk-pmFnLUs58TUydiRxgZDZXmZmyoRhPC8KiSMiMRMr71mjzFs2gB8ifHDG6TZOsQeEPR3HsGZ_f_trXqaV0iuXXnLp07PkxYfem6ZyMhlJF9nKvnJnrGc70sS1ZJeBTiDyLxJsY_xgWSsvuQ3YkqATKYQn6YSUasncCQN7a3yU-BB4ojOgr6twqhKojw7VOQ";

  const siteIdRaw = "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";

  // IMPORTANTE:
  // Para integração de terceiros, o Wix exige memberId no Draft Post.
  // Coloque aqui o ID CORRETO do autor/blog writer do Portal Pista Verde.
  const wixMemberId = "76233c36-475b-4ea3-9317-363ee57c8de2";

  const cleanApiKey = String(apiKeyRaw || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  const cleanSiteId = String(siteIdRaw || "").trim();

  const cleanMemberId = String(wixMemberId || "").trim();

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
    !cleanMemberId ||
    cleanMemberId === "COLE_AQUI_O_MEMBER_ID_CORRETO_DO_AUTOR"
  ) {
    return res.status(500).json({
      success: false,
      error: "memberId do autor Wix não configurado."
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

    // OPCIONAIS
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
  // 3. NORMALIZAÇÃO DOS PARÁGRAFOS
  // ============================================================

  let rawParagraphs = [];

  if (Array.isArray(paragraphs)) {
    rawParagraphs = paragraphs
      .map((p) => String(p || "").trim())
      .filter(Boolean);
  } else if (typeof paragraphs === "string" && paragraphs.trim()) {
    rawParagraphs = paragraphs
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
  } else if (typeof editorialBody === "string" && editorialBody.trim()) {
    rawParagraphs = editorialBody
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }

  // ============================================================
  // 4. RICH CONTENT
  // ============================================================

  const nodes = [];

  // Subtítulo no corpo, caso exista
  if (cleanSubtitle) {
    nodes.push({
      type: "PARAGRAPH",
      nodes: [
        {
          type: "TEXT",
          textData: {
            text: cleanSubtitle,
            decorations: [
              {
                type: "ITALIC"
              }
            ]
          }
        }
      ]
    });
  }

  // Corpo principal
  rawParagraphs.forEach((paragraph) => {
    nodes.push({
      type: "PARAGRAPH",
      nodes: [
        {
          type: "TEXT",
          textData: {
            text: paragraph,
            decorations: []
          }
        }
      ]
    });
  });

  // Créditos finais
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
  // 5. EXCERPT
  // ============================================================

  const excerpt = cleanSubtitle
    ? cleanSubtitle.length > 150
      ? cleanSubtitle.substring(0, 147).trim() + "..."
      : cleanSubtitle
    : "";

  // ============================================================
  // 6. OBJETO DO DRAFT POST
  // ============================================================

  const draftPostObj = {
    title: cleanHeadline,
    excerpt,

    memberId: cleanMemberId,

    richContent: {
      nodes
    }
  };

  // Categorias opcionais
  if (Array.isArray(categoryIds) && categoryIds.length > 0) {
    draftPostObj.categoryIds = categoryIds
      .map((id) => String(id || "").trim())
      .filter(Boolean);
  }

  // Tags opcionais
  if (Array.isArray(tagIds) && tagIds.length > 0) {
    draftPostObj.tagIds = tagIds
      .map((id) => String(id || "").trim())
      .filter(Boolean);
  }

  // ============================================================
  // 7. CAPA
  // ============================================================
  //
  // NÃO enviamos URL externa diretamente no coverMedia.
  //
  // Primeiro a imagem precisa ser importada no Media Manager.
  // O endpoint atual do Wix para importação é:
  // POST https://www.wixapis.com/site-media/v1/files/import
  //
  // Como o arquivo importado não fica necessariamente disponível
  // imediatamente, não vamos criar um coverMedia inválido.
  //
  // Se coverImageUrl vier preenchida, tentamos importar.
  // ============================================================

  let importedCover = null;

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

      let importData = null;

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
      } else {
        console.error(
          "[PV ONE] Falha ao importar capa no Media Manager."
        );
      }
    } catch (coverError) {
      console.error(
        "[PV ONE] Erro de conexão na importação da capa:",
        coverError
      );
    }
  }

  // ============================================================
  // 8. TENTATIVA DE EXTRAIR ID NATIVO DA CAPA
  // ============================================================

  let nativeCoverId = null;

  if (importedCover) {
    nativeCoverId =
      importedCover?.file?.id ||
      importedCover?.file?.fileId ||
      importedCover?.fileDescriptor?.id ||
      importedCover?.fileDescriptor?.fileId ||
      importedCover?.id ||
      null;
  }

  /*
    ATENÇÃO:

    O Wix informa que arquivos importados podem não ficar disponíveis
    imediatamente após o POST de importação.

    Portanto, somente colocamos coverMedia se o retorno trouxer um
    identificador nativo utilizável.

    Caso contrário, o Draft Post ainda é criado normalmente, e o log
    mostrará exatamente o que o Wix devolveu.
  */

  if (nativeCoverId) {
    draftPostObj.coverMedia = {
      displayed: true,
      custom: true,
      wixMedia: {
        image: {
          id: nativeCoverId,
          altText:
            String(coverImageAlt || "").trim() ||
            cleanHeadline
        }
      }
    };
  }

  // ============================================================
  // 9. PAYLOAD FINAL
  // ============================================================

  const wixPayload = {
    draftPost: draftPostObj
  };

  console.log(
    "[PV ONE] ==============================================="
  );

  console.log(
    "[PV ONE] ENDPOINT:",
    "https://www.wixapis.com/blog/v3/draft-posts"
  );

  console.log(
    "[PV ONE] METHOD: POST"
  );

  console.log(
    "[PV ONE] PAYLOAD ENVIADO:",
    JSON.stringify(wixPayload, null, 2)
  );

  console.log(
    "[PV ONE] CAPA URL RECEBIDA:",
    coverImageUrl || null
  );

  console.log(
    "[PV ONE] CAPA NATIVA ID:",
    nativeCoverId || null
  );

  console.log(
    "[PV ONE] ==============================================="
  );

  // ============================================================
  // 10. ENVIO DO RASCUNHO PARA O WIX
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

    let data = null;

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
      "[PV ONE] WIX OK:",
      wixResponse.ok
    );

    console.log(
      "[PV ONE] WIX BODY:",
      JSON.stringify(data, null, 2)
    );

    // ----------------------------------------------------------
    // REGRA PV ONE:
    // 200 ou 201 = SUCESSO
    // ----------------------------------------------------------

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
            headline: cleanHeadline,
            memberId: cleanMemberId,
            coverImageReceived: Boolean(coverImageUrl),
            nativeCoverId,
            coverAttached: Boolean(
              draftPostObj.coverMedia
            )
          }
        });
    }

    // ----------------------------------------------------------
    // SUCESSO
    // ----------------------------------------------------------

    return res.status(200).json({
      success: true,

      wixStatus: wixResponse.status,

      message:
        "Rascunho enviado com sucesso ao Wix.",

      post:
        data?.draftPost ||
        data,

      cover: {
        urlReceived: Boolean(coverImageUrl),
        imported: Boolean(importedCover),
        nativeId: nativeCoverId,
        attachedToDraft: Boolean(
          draftPostObj.coverMedia
        )
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
