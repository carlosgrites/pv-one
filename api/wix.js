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
  const WIX_API_TOKEN = "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjYwMTQ0NWVlLTk2NDYtNDU5NC1hYWFlLWQ0NmJkNzc1NjNkZFwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjBkMWRjNTE3LTRlMDktNDAwZS04NGJhLTIyZWJhNGZlMTU5MFwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3NDcxM2E2ZS1lMDA3LTRkZjktOGNjNC1hMTA1OGM1NWQwNWRcIn19IiwiaWF0IjoxNzg2MTI5ODYzfQ.Bf5McTn0XNDKAeTM5vPOqnjkx-qahrPFv9DNYbo8RiChRgmitrf0qRWzuEQ4zZJd2vPnOAr00XmmzNO2BNrBHm04vdg4AaosPvPz2OOnYqAoTesQgQTgiqZA1TCqC1Xz9Nna1XUctgcYOeggtTjdInmeqlzF82riWDTC__W2W3KbTNcQGeUTcjos5RhNWHh8wKzOoBQBEAjpXPE7vHVERQ-_3oukmHAVzZme62SOixjOAKX6h2mbxrGnI1CM4zxbpqUy6cp5hh9r1H6yn2txcyfEitHx-vLVPp1pRfB7AbE65jSvC8eXJb_bsl80hqR7XAM-0plsgMZqR51smX54vw";

  try {
    let bodyData = req.body || {};
    if (typeof bodyData === 'string') {
      try { bodyData = JSON.parse(bodyData); } catch (e) { bodyData = {}; }
    }

    const payload = bodyData.draftPost ? bodyData : { draftPost: bodyData };
    if (payload.draftPost && !payload.draftPost.memberId) {
      payload.draftPost.memberId = WIX_MEMBER_ID;
    }

    const wixResponse = await fetch("https://www.wixapis.com/blog/v3/draft-posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": WIX_API_TOKEN,
        "wix-site-id": WIX_SITE_ID
      },
      body: JSON.stringify(payload)
    });

    const textResponse = await wixResponse.text();
    let data;
    try { data = JSON.parse(textResponse); } catch (e) { data = { message: textResponse }; }

    if (!wixResponse.ok) {
      return res.status(wixResponse.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Erro no servidor" });
  }
}
