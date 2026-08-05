import { createClient, ApiKeyStrategy } from '@wix/sdk';
import { items } from '@wix/data';

const WIX_API_KEY = "IST.eyJraWQiOiJQb3pIX2FDMiIsImFsZyI6IlJTMjU2In0.eyJkYXRhIjoie1wiaWRcIjpcImIxNzkzZGQ3LTIyMWUtNGY2ZC04ZjQ3LWYzNTMwZjFhMDJmZFwiLFwiaWRlbnRpdHlcIjp7XCJ0eXBlXCI6XCJhcHBsaWNhdGlvblwiLFwiaWRcIjpcIjk2YjFlYTQxLWE2MDctNDAxYy1hYTlmLTU5YjRjYjJiYzE4NVwifSxcInRlbmFudFwiOntcInR5cGVcIjpcImFjY291bnRcIixcImlkXCI6XCI3NDcxM2E2ZS1lMDA3LTRkZjktOGNjNC1hMTA1OGM1NWQwNWRcIn19IiwiaWF0IjoxNzg1OTU4Mzk1fQ.OmRV7lt5A_U7vug99VGYzsz54zYzlw2kh5jskYwYz2iRkK-TR_4QvpkXF6kcgtMAwzO3xQZhTeev_wKtnD2sB7m2aHsoA90-CqrXvOXMNpqdo-WHR5rDG1KKqQNyRy7LP5gtPbW9N7K8DRgGFEMrTcpZF50jl9dczroMkRo47-iny6q6oiIAg46phLilUk4CL3Rk-6EH3ww5F-XDEVBQpBKTYCAj4AOmuC6-p5y-RvP2T02Qu4QRJ2-N7G0DvVlFkyAeixOPsgWzy68o87u1Kovq_skkpKiaULmsqYtd-lwQJi1J-lzGRRAWPULg2ZFH9b7bmtGYGVp2wlc3HLPKLg";
const WIX_SITE_ID = "50bca98c-31f2-4172-a19d-c3abf3dd9dd7";

const wixClient = createClient({
  modules: { items },
  auth: ApiKeyStrategy({
    apiKey: WIX_API_KEY,
    siteId: WIX_SITE_ID,
  }),
});

export async function sendToWix(materiaData) {
  try {
    const response = await wixClient.items.insertDataItem({
      dataCollectionId: 'Materias',
      dataItem: {
        data: {
          title: materiaData.titulo || materiaData.title,
          subtitulo: materiaData.subtitulo || '',
          conteudo: materiaData.conteudo || materiaData.content || '',
          imagem: materiaData.imagem || materiaData.image || '',
          categoria: materiaData.categoria || 'Geral',
          dataPublicacao: new Date().toISOString()
        }
      }
    });

    return { success: true, data: response };
  } catch (error) {
    console.error("Erro ao enviar matéria para o Wix:", error);
    return { success: false, error: error.message };
  }
}
