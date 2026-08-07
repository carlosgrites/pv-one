export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const WIX_SITE_ID = "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";
  const WIX_MEMBER_ID = "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";
  const WIX_API_TOKEN = "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImRjMGM3OGI3LWE2MTgtNDYwOS1hMjg1LTViMmY3MzkxZjcwY1wiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjgwNWEzZTk4LWIwYmYtNDliOS1iZGVlLWEyZTlkMDk1YjIxOFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3NDcxM2E2ZS1lMDA3LTRkZjktOGNjNC1hMTA1OGM1NWQwNWRcIn19IiwiaWF0IjoxNzg1OTAwNjE5fQ.KfX4t6Sw3Wz745uSdw6UN1hXdm2vSZVq2nRDgvMNIRX9auY2NhhF1ikIhyz4pjkSoy07dBbsCjjO_hAzRKbEVMcmIaz5XouW25v6Wa6qdn8G5ui-SGNI3OG7McCwYbbCKiaF7ShA9Ha4c8KlnhZunfZvwHqIuPcEZ74Od0ThbQP0YAlqgVOmSYnr_hwiDodMXO-0nc_jQrrlj6FByUiw4ccfF-4cKEY_H8MIJXqVpoONTbJd-mhPL_U6xwvMK3plUeIswu2abnGvpB-Y-xuVmIbJY3ojHTs6czTRukg3nL0yMd3j3reVgHd2ovycu_rpWV4R0jImSrDqmBKhNVmfhQ";

  try {
    const bodyData = req.body || {};
    if (bodyData.draftPost) {
      bodyData.draftPost.memberId = WIX_MEMBER_ID;
    }

    const response = await fetch("https://www.wixapis.com/blog/v3/draft-posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": WIX_API_TOKEN,
        "wix-site-id": WIX_SITE_ID
      },
      body: JSON.stringify(bodyData)
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
