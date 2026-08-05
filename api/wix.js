export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const WIX_API_KEY = process.env.WIX_API_KEY;
  const WIX_SITE_ID = "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";
  const WIX_ACCOUNT_ID = "74713a6e-e007-4df9-8cc4-a1058c55d05d";

  try {
    const { title, content, coverImage } = req.body;

    const response = await fetch('https://www.wixapis.com/wix-data/v1/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': WIX_API_KEY,
        'wix-site-id': WIX_SITE_ID,
        'wix-account-id': WIX_ACCOUNT_ID
      },
      body: JSON.stringify({
        dataCollectionId: "Blog/Posts",
        item: {
          title: title,
          plainContent: content,
          coverImage: coverImage
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        message: 'Erro retornado pelo Wix', 
        details: data 
      });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
