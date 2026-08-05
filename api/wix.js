const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

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
    const content = body.content || body.richContent || body.excerpt || "";
    const coverImage = body.coverImage || body.capa || "";
    const videoUrl = body.videoUrl || body.video || "";

    // Retorna resposta de sucesso para a interface
    return res.status(200).json({
      success: true,
      message: "Payload processado com sucesso no backend do PV ONE",
      data: { title, coverImage, videoUrl, content }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
