export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const { title, richContent, coverImage } = req.body;

    // ID real do site Pista Verde extraído do seu painel
    const WIX_SITE_ID = "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";
    const WIX_API_KEY = "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImRjMGM3OGI3LWE2MTgtNDYwOS1hMjg1LTViMmY3MzkxZjcwY1wiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjgwNWEzZTk4LWIwYmYtNDliOS1iZGVlLWEyZTlkMDk1YjIxOFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3NDcxM2E2ZS1lMDA3LTRkZjktOGNjNC1hMTA1OGM1NWQwNWRcIn19IiwiaWF0IjoxNzg1OTAwNjE5fQ.KfX4t6Sw3Wz745uSdw6UN1hXdm2vSZVq2nRDgvMNIRX9auY2NhhF1ikIhyz4pjkSoy07dBbsCjjO_hAzRKbEVMcmIaz5XouW25v6Wa6qdn8G5ui-SGNI3OG7McCwYbbCKiaF7ShA9Ha4c8KlnhZunfZvwHqIuPcEZ74Od0ThbQP0YAlqgVOmSYnr_hwiDodMXO-0nc_jQrrlj6FByUiw4ccfF-4cKEY_H8MIJXqVpoONTbJd-mhPL_U6xwvMK3plUeIswu2abnGvpB-Y-xuVmIbJY3ojHTs6czTRukg3nL0yMd3j3reVgHd2ovycu_rpWV4R0jImSrDqmBKhNVmfhQ";

    const payload = {
      draftPost: {
        title: title,
        memberId: "dc0c78b7-a618-4609-a285-5b2f7391f70c",
        coverMedia: {
          image: {
            url: coverImage
          }
        },
        excerpt: "Matéria processada pelo PV ONE para o Portal Pista Verde.",
        richContent: {
          nodes: [
            {
              type: "HTML",
              id: "h1",
              htmlData: {
                containerData: {
                  width: { size: "FULL_WIDTH" },
                  alignment: "CENTER"
                },
                html: richContent
              }
            }
          ]
        }
      }
    };

    const wixResponse = await fetch('https://www.wixapis.com/blog/v3/draft-posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'wix-site-id': WIX_SITE_ID,
        'Authorization': WIX_API_KEY
      },
      body: JSON.stringify(payload)
    });

    const data = await wixResponse.json();

    if (wixResponse.ok) {
      return res.status(200).json({ success: true, data });
    } else {
      return res.status(wixResponse.status).json({ success: false, error: data });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
