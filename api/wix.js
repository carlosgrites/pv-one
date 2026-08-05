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

    const WIX_SITE_ID = "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";
    const WIX_API_KEY = "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjlhOTE0ODU3LTdmNTEtNGQ0OC04OWU1LWNlYjg2NjBkZWZjM1wiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjk2YjFlYTQxLWE2MDctNDAxYy1hYTlmLTU5YjRjYjJiYzE4NVwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3NDcxM2E2ZS1lMDA3LTRkZjktOGNjNC1hMTA1OGM1NWQwNWRcIn19IiwiaWF0IjoxNzg1OTUwMDgxfQ.NQJFLCjOo7ptCdDkeEoz7mUKBVzIOEkyf3TZLaRkcPsgclygwGw39jfyrBZNQPfK5iyYeUxZL94bu8vNzwL8HIsORKEz5TDRjITVovjRSGxZJjTML9X3mTJft6E9S_RmN955jmlQaN_RtnQcQzcmkugPsYu3xkBBkmo0M_4KE2hnMv9I7c9AYakXGb020iLkS5rYYuyw8hHslLCRpY9SBTL5xX3Ba2bqcHyNWwJSv0UrtPnRhnDYjQjCsl0eDAMFBuZblM9usmwwUI5nGQscVQfgv_QKBuAnsQVYgI41pm7BvaAlkGZbn5rw3ZskAkP6YW6og2FD1wIRWpZt_2Fthg";

    const payload = {
      draftPost: {
        title: title || "Matéria PV ONE",
        memberId: WIX_SITE_ID,
        excerpt: "Matéria processada pelo PV ONE para o Portal Pista Verde.",
        coverMedia: coverImage ? {
          image: {
            url: coverImage
          }
        } : undefined,
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
                html: richContent || "<p></p>"
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
