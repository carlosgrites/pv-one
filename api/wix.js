export default async function handler(req, res) {
  console.log("ENTROU NO HANDLER", req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const WIX_API_KEY = process.env.WIX_API_KEY;
  const WIX_SITE_ID = process.env.WIX_SITE_ID || "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";

  try {
    const { draftPost } = req.body;

    // LOG DO JSON COMPLETO LOGO ANTES DO FETCH
    console.log("JSON enviado ao Wix:", JSON.stringify({ draftPost }));

    const response = await fetch("https://www.wixapis.com/blog/v3/draft-posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": WIX_API_KEY,
        "wix-site-id": WIX_SITE_ID
      },
      body: JSON.stringify({ draftPost })
    });

    const responseText = await response.text();
    console.log("Status HTTP Wix:", response.status);
    console.log("Resposta Wix:", responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { message: responseText };
    }

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Erro interno no handler:", error.message);
    return res.status(500).json({ message: error.message });
  }
}
