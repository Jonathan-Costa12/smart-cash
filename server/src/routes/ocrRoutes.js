import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth.js';
import { extrairDadosComprovante, ocrEnabled } from '../ocr.js';

const router = Router();
router.use(requireAuth);

const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const extractSchema = z.object({
  imageBase64: z.string().min(1),
  mediaType: z.enum(MEDIA_TYPES),
});

router.get('/status', (_req, res) => {
  res.json({ enabled: ocrEnabled });
});

router.post('/extrair', async (req, res) => {
  const parsed = extractSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Imagem inválida ou não enviada' });
  }

  try {
    const dados = await extrairDadosComprovante(parsed.data);
    res.json(dados);
  } catch (err) {
    if (err.code === 'OCR_DISABLED') {
      return res.status(501).json({ error: err.message });
    }
    console.error('Erro no OCR:', err);
    res.status(502).json({ error: 'Falha ao processar a imagem. Tente novamente ou lance manualmente.' });
  }
});

export default router;
