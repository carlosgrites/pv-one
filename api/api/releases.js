module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const materias = [
    {
      id: "1",
      status: "Fila Ativa",
      titulo: "Copa Brasil de Kart CBA encerra 27ª edição em Imperatriz com grandes disputas e novos campeões",
      capa: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80",
      video: "https://assets.mixkit.co/videos/preview/mixkit-race-car-driving-on-a-track-41562-large.mp4",
      conteudo: "Após duas semanas de intensas emoções no Maranhão, a 27ª edição da Copa Brasil de Kart chegou ao fim no Kartódromo de Imperatriz. O evento reuniu os principais nomes do automobilismo nacional em categorias que variaram da Mirim à Sênior.\n\nCom corridas altamente competitivas e estratégias arrojadas sob o calor de Imperatriz, os pilotos demonstraram alto nível técnico. A Confederação Brasileira de Automobilismo (CBA) celebrou o recorde de público e o sucesso das transmissões ao vivo.\n\nO destaque ficou para a categoria Graduados, onde as disputas de ultrapassagens nas últimas voltas garantiram o título decidido por milésimos de segundo. O Portal Pista Verde acompanhou todos os detalhes dos bastidores e traz a cobertura completa.",
      instaLegenda: "🏁 GRANDE FINAL DA COPA BRASIL DE KART EM IMPERATRIZ!\n\nA 27ª edição do segundo maior torneio do automobilismo nacional coroou os novos campeões do país em uma semana épica de corridas no Maranhão. 🏆⚡\n\nConfira a matéria completa no site do Portal Pista Verde! Link na bio.\n\n#PistaVerde #Kart #CBA #CopaBrasilDeKart #Automobilismo #Motorsport",
      tiktokRoteiro: "[00:00-00:03] Cena: Tomada aérea dos karts alinhados no grid de Imperatriz.\nLocução: A Copa Brasil de Kart 2026 definiu os grandes campeões no Maranhão!\n\n[00:03-00:07] Cena: Ultrapassagem decisiva na última curva.\nLocução: Foram duas semanas de pura adrenalina e chegadas decididas no milésimo de segundo!\n\n[00:07-00:10] Cena: Piloto erguendo o troféu no pódio.\nLocução: Acesse o Portal Pista Verde e confira a classificação completa!"
    }
  ];

  return res.status(200).json(materias);
};
