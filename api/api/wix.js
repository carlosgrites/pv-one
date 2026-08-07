async function enviarParaWixDraft() {
  const btn = document.getElementById('btn-enviar-wix');
  const status = document.getElementById('status-wix-envio');

  status.classList.remove('hidden', 'bg-red-500/10', 'text-red-400', 'border-red-500/20', 'bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/20');
  status.classList.add('bg-cyan-500/10', 'text-cyan-400', 'border-cyan-500/20');
  status.innerHTML = '<i class="fa-solid fa-circle-notch animate-spin"></i> Montando pacote de SEO e enviando rascunho para o Wix...';

  btn.disabled = true;

  const h1 = document.getElementById('input-h1').value;
  const subtitulo = document.getElementById('input-subtitulo').value;
  const categoria = document.getElementById('input-categoria').value;
  const htmlCorpo = document.getElementById('leitor-materia-html').innerHTML;
  
  const slug = h1.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  const payload = {
    draftPost: {
      title: h1,
      excerpt: subtitulo,
      content: htmlCorpo,
      slug: slug,
      categoryIds: [],
      seoData: {
        tags: [
          { name: "title", children: h1 },
          { name: "description", children: subtitulo },
          { property: "og:title", content: h1 },
          { property: "og:description", content: subtitulo }
        ]
      }
    }
  };

  try {
    // Aponta para a ponte da Vercel (sem bloqueio de CORS)
    const response = await fetch("/api/wix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      status.classList.remove('bg-cyan-500/10', 'text-cyan-400', 'border-cyan-500/20');
      status.classList.add('bg-emerald-500/10', 'text-emerald-400', 'border-emerald-500/20');
      status.innerHTML = '<i class="fa-solid fa-circle-check"></i> <strong>Rascunho criado no Wix!</strong> Abra seu painel do Wix Blog para revisar e publicar.';
    } else {
      const errData = await response.json();
      throw new Error(errData.message || "Erro de resposta da API Wix (" + response.status + ")");
    }
  } catch (err) {
    status.classList.remove('bg-cyan-500/10', 'text-cyan-400', 'border-cyan-500/20');
    status.classList.add('bg-red-500/10', 'text-red-400', 'border-red-500/20');
    status.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> <strong>Falha no Envio:</strong> ' + err.message;
  } finally {
    btn.disabled = false;
  }
}
