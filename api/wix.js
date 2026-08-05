const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) {}
    }

    const title = body.title || body.Title || "Matéria PV ONE";
    const content = body.richContent || body.content || body.excerpt || "";
    const coverImage = body.coverImage || body.image || "";

    const payload = JSON.stringify({
      dataCollectionId: "Materias",
      item: {
        Title: title,
        content: content,
        coverImage: coverImage
      }
    });

    const WIX_SITE_ID = "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";
    const WIX_API_KEY = "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcIjlhOTE0ODU3LTdmNTEtNGQ0OC04OWU1LWNlYjg2NjBkZWZjM1wiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjk6YjFlYTQxLWE2MDctNDAxYy1hYTlmLTU5YjRjYjJiYzE4NVwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3NDcxM2E2ZS1lMDA3LTRkZjktOGNjNC1hMTA1OGM1NWQwNWRcIn19IiwiaWF0IjoxNzg1OTUwMDgxfQ.NQJFLCjOo7ptCdDkeEoz7mUKBVzIOEkyf3TZLaRkcPsgclygwGw39jfyrBZNQPfK5iyYeUxZL94bu8vNzwL8HIsORKEz5TDRjITVovjRSGxZJjTML9X3mTJft6E9S_RmN955jmlQaN_RtnQcQzcmkugPsYu3xkBBkmo0M_4KE2hnMv9I7c9AYakXGb020iLkS5rYYuyw8hHslLCRpY9SBTL5xX3Ba2bqcHyNWwJSv0UrtPnRhnDYjQjCsl0eDAMFBuZblM9usmwwUI5nGQscVQfgv_QKBuAnsQVYgI41pm7BvaAlkGZbn5rw3ZskAkP6YW6og2FD1wIRWpZt_2Fthg";

    const options = {
      hostname: 'www.wixapis.com',
      path: '/wix-data/v1/items',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'wix-site-id': WIX_SITE_ID,
        'Authorization': WIX_API_KEY
      }
    };

    const wixReq = https.request(options, (wixRes) => {
      let responseData = '';

      wixRes.on('data', (chunk) => {
        responseData += chunk;
      });

      wixRes.on('end', () => {
        let parsed = responseData;
        try { parsed = JSON.parse(responseData); } catch (e) {}

        return res.status(200).json({
          success: wixRes.statusCode >= 200 && wixRes.statusCode < 300,
          wixStatus: wixRes.statusCode,
          wixResponse: parsed
        });
      });
    });

    wixReq.on('error', (err) => {
      return res.status(200).json({ success: false, error: err.message });
    });

    wixReq.write(payload);
    wixReq.end();

  } catch (err) {
    return res.status(200).json({ success: false, error: err.message });
  }
};
