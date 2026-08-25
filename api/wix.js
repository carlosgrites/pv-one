// ============================================================
// PORTAL PISTA VERDE — PV ONE
// api/wix.js — Wix Blog V3
// ============================================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  try {
    const apiKey = String(process.env.WIX_API_KEY || "")
      .replace(/^Bearer\s+/i, "")
      .trim();

    const siteId =
      "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";

    const authorEmail =
      "portalpistaverde@gmail.com";

    if (!apiKey) {
      return res.status(500).json({
        error:
          "A variável WIX_API_KEY não está disponível neste deployment da Vercel."
      });
    }

    const headers = {
      Authorization: apiKey,
      "Content-Type": "application/json",
      "wix-site-id": siteId
    };

    const body = parseRequestBody(req.body);

    const headline =
      cleanText(body.headline);

    const subtitle =
      cleanText(body.subtitle);

    const editorialBody =
      normalizeBody(body.editorialBody);

    const editorialBlocks =
      normalizeEditorialBlocks(
        body.editorialBlocks,
        editorialBody
      );

    const source =
      cleanText(body.source) ||
      "Assessoria de Imprensa";

    const photographer =
      cleanText(body.photographer) ||
      "Divulgação";

    if (!headline) {
      return res.status(400).json({
        error: "O título da matéria está vazio."
      });
    }

    if (!editorialBlocks.length) {
      return res.status(400).json({
        error: "O corpo da matéria está vazio."
      });
    }

    const memberId =
      await findAuthorMemberId(
        headers,
        authorEmail
      );

    const richContent =
      buildRichContent({
        subtitle,
        editorialBlocks,
        source,
        photographer
      });

    const draftPost = {
      title: headline,
      memberId,
      richContent
    };

    const wixResponse =
      await fetch(
        "https://www.wixapis.com/blog/v3/draft-posts",
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            draftPost,
            publish: false
          })
        }
      );

    const wixData =
      await readResponse(wixResponse);

    if (!wixResponse.ok) {
      console.error(
        "WIX_CREATE_DRAFT_ERROR",
        {
          status: wixResponse.status,
          response: wixData
        }
      );

      return res
        .status(wixResponse.status)
        .json({
          error: extractWixError(
            wixData,
            "O Wix recusou a criação do rascunho."
          ),
          wixStatus: wixResponse.status,
          details: wixData
        });
    }

    return res.status(200).json({
      success: true,
      message:
        "Rascunho nativo criado com sucesso no Wix.",
      draftPost:
        wixData.draftPost || wixData
    });
  } catch (error) {
    console.error(
      "PV_ONE_WIX_ERROR",
      error
    );

    const status =
      Number(error?.status) || 500;

    return res.status(status).json({
      error:
        error?.message ||
        "Erro interno na integração com o Wix.",
      details:
        error?.details || undefined
    });
  }
}

function parseRequestBody(value) {
  if (
    value &&
    typeof value === "object"
  ) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    try {
      return JSON.parse(value);
    } catch (_) {
      const error =
        new Error(
          "O PV ONE enviou um JSON inválido."
        );

      error.status = 400;
      throw error;
    }
  }

  return {};
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function normalizeBody(value) {
  return cleanText(value)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeEditorialBlocks(
  blocks,
  fallbackBody
) {
  if (Array.isArray(blocks)) {
    const normalized =
      blocks
        .map((block) => {
          if (
            !block ||
            typeof block !== "object"
          ) {
            return null;
          }

          const text =
            cleanText(block.text)
              .replace(/\n+/g, " ")
              .trim();

          if (!text) {
            return null;
          }

          const requestedType =
            String(
              block.type || "paragraph"
            ).toLowerCase();

          const type =
            requestedType === "h2"
              ? "h2"
              : "paragraph";

          return {
            type,
            text
          };
        })
        .filter(Boolean);

    if (normalized.length) {
      return normalized;
    }
  }

  return fallbackBody
    .split(/\n\s*\n+/)
    .map((part) =>
      cleanText(part)
        .replace(/\n+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .map((text) => {
      if (
        /^(?:##\s+|H2:\s*)/i.test(text)
      ) {
        return {
          type: "h2",
          text: text
            .replace(
              /^(?:##\s+|H2:\s*)/i,
              ""
            )
            .trim()
        };
      }

      return {
        type: "paragraph",
        text
      };
    })
    .filter((block) => block.text);
}

async function findAuthorMemberId(
  headers,
  authorEmail
) {
  const response =
    await fetch(
      "https://www.wixapis.com/members/v1/members?paging.limit=100",
      {
        method: "GET",
        headers
      }
    );

  const data =
    await readResponse(response);

  if (!response.ok) {
    const error =
      new Error(
        extractWixError(
          data,
          "Não foi possível consultar o autor no Wix."
        )
      );

    error.status = response.status;
    error.details = data;

    throw error;
  }

  const members =
    Array.isArray(data.members)
      ? data.members
      : [];

  const expectedEmail =
    authorEmail.toLowerCase();

  const author =
    members.find((member) => {
      const emails = [
        member?.loginEmail,

        ...(Array.isArray(
          member?.contact?.emails
        )
          ? member.contact.emails.map(
              (item) => item?.email
            )
          : [])
      ];

      return emails.some(
        (email) =>
          String(email || "")
            .trim()
            .toLowerCase() ===
          expectedEmail
      );
    });

  if (!author?.id) {
    const error =
      new Error(
        `Não foi possível localizar no Wix o autor ${authorEmail}.`
      );

    error.status = 400;
    throw error;
  }

  return author.id;
}

function buildRichContent({
  subtitle,
  editorialBlocks,
  source,
  photographer
}) {
  let sequence = 0;

  const uniquePrefix =
    `${Date.now().toString(36)}_` +
    `${Math.random()
      .toString(36)
      .slice(2, 10)}`;

  function id(prefix) {
    sequence += 1;

    return (
      `${prefix}_` +
      `${uniquePrefix}_` +
      `${sequence}`
    );
  }

  function textNode(text) {
    return {
      type: "TEXT",
      id: id("text"),
      textData: {
        text
      }
    };
  }

  function paragraphNode(text) {
    return {
      type: "PARAGRAPH",
      id: id("paragraph"),
      nodes: [
        textNode(text)
      ],
      paragraphData: {}
    };
  }

  function headingNode(text) {
    return {
      type: "HEADING",
      id: id("heading"),
      nodes: [
        textNode(text)
      ],
      headingData: {
        level: 2
      }
    };
  }

  const nodes = [];

  if (subtitle) {
    nodes.push(
      paragraphNode(subtitle)
    );
  }

  for (
    const block
    of editorialBlocks
  ) {
    nodes.push(
      block.type === "h2"
        ? headingNode(block.text)
        : paragraphNode(block.text)
    );
  }

  nodes.push(
    paragraphNode(
      `Texto/Fonte: ${source} | Fotos: ${photographer}`
    )
  );

  nodes.push(
    paragraphNode(
      "Reportagem/Texto: José Carlos Grites – jornalista profissional (Registro MTE nº 0007501/SC)"
    )
  );

  nodes.push(
    headingNode(
      "Portal Pista Verde"
    )
  );

  nodes.push(
    paragraphNode(
      "Portal Pista Verde é uma startup nacional dedicada exclusivamente ao ecossistema do kartismo e do automobilismo. Atua com o Programa ESG/ODS Pista Verde para kartódromos e autódromos, com base em referências internacionais traduzidas e adaptadas ao Brasil."
    )
  );

  return {
    nodes
  };
}

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

function extractWixError(
  data,
  fallback
) {
  const candidates = [
    data?.message,
    data?.error,
    data?.details
      ?.applicationError
      ?.description,
    data?.details
      ?.applicationError
      ?.code,
    data?.details
      ?.validationError
      ?.fieldViolations?.[0]
      ?.description
  ];

  const message =
    candidates.find(
      (value) =>
        typeof value === "string" &&
        value.trim()
    );

  return message
    ? message.trim()
    : fallback;
}
