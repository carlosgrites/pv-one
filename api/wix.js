export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Método não permitido" });
  }

  const WIX_API_KEY = process.env.WIX_API_KEY;
  const WIX_SITE_ID = "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";

  try {
    const { draftPost } = req.body;

    if (!draftPost) {
      return res.status(400).json({
        message: "draftPost não recebido"
      });
    }

    delete draftPost.memberIds;
    draftPost.memberId = "1786139062248";

    console.log("=== ENVIANDO PARA O WIX ===");
    console.log(JSON.stringify(draftPost, null, 2));

    const response = await fetch(
      "https://www.wixapis.com/blog/v3/draft-posts",
      {
        method: "POST",
        headers: {
          "Authorization": WIX_API_KEY,
          "Content-Type": "application/json",
          "wix-site-id": WIX_SITE_ID
        },
        body: JSON.stringify({ draftPost })
      }
    );

    const text = await response.text();

    console.log("STATUS:", response.status);
    console.log("RESPOSTA DO WIX:");
    console.log(text);

    return res.status(response.status).send(text);

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: err.message
    });
  }
}
