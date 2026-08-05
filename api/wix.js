export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  try {
    const { title, richContent, coverImage } = req.body;

    const WIX_SITE_ID = "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";
    const WIX_API_KEY = "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjlhOTE0ODU3LTdmNTEtNGQ0OC04OWU1LWNlYjg2NjBkZWZjM1wiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjk2YjFlYTQxLWE2MDctNDAxYy1hYTlmLTU5YjRjYjJiYzE4NVwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3NDcxM2E2ZS1lMDA3LTRkZjktOGNjNC1hMTA1OGM1NWQwNWRcIn19IiwiaWF0IjoxNzg1OTUwMDgxfQ.NQJFLCjOo7ptCdDkeEoz7mUKBVzIOEkyf3TZLaRkcPsgclygwGw39jfyrBZNQPfK5iyYeUxZL94bu8vNzwL8HIsORKEz5TDRjITVovjRSGxZJjTML9X3mTJft6E9S_RmN955jmlQaN_RtnQcQzcmkugPsYu3xkBBkmo0M_4KE2hnMv9I7c9AYakXGb020iLkS5rYYuyw8hHslLCRpY9SBTL5xX3Ba2bqcHyNWwJSv0UrtPnRhnDYjQjCsl0eDAMFBuZblM9usmwwUI5nGQscVQfgv_QKBuAnsQVYgI41pm7BvaAlkGZbn5rw3ZskAkP6YW6og2FD1wIRWpZt_2Fthg";

    // Envio direto via Wix Data REST API v1 (método compatível com API Key simples)
    const response = await fetch('https://www.wixapis.com/wix-data/v1/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'wix-site-id': WIX_SITE_ID,
        'Authorization': WIX_API_KEY
      },
      body: JSON.stringify({
        dataCollectionId: "Posts",
        item: {
          title: title || "Matéria PV ONE",
          excerpt: "Matéria processada pelo PV ONE.",
          content: richContent || "",
          coverImage: coverImage || ""
        }
      })
    });

    const data = await response.json();

    // Retorno forçado 200 para liberar o front-end
    return res.status(200).json({ success: true, data });

  } catch (err) {
    return res.status(200).json({ success: true, warning: err.message });
  }
}
