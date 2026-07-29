import Anthropic from '@anthropic-ai/sdk';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

export const ocrEnabled = Boolean(ANTHROPIC_API_KEY);

const client = ocrEnabled ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

const EXTRACT_TOOL = {
  name: 'extrair_lancamento',
  description: 'Registra os dados extraídos de um comprovante, boleto ou nota fiscal.',
  input_schema: {
    type: 'object',
    properties: {
      valor: {
        type: 'number',
        description: 'Valor total do comprovante em reais, apenas o número (ex: 149.9).',
      },
      data: {
        type: 'string',
        description: 'Data do comprovante/vencimento no formato AAAA-MM-DD. Se não achar, use null.',
        nullable: true,
      },
      fornecedor: {
        type: 'string',
        description: 'Nome do estabelecimento, fornecedor ou fonte (ex: "Energia", "Supermercado Pão de Açúcar").',
      },
      tipo_sugerido: {
        type: 'string',
        enum: ['Receita', 'Despesa'],
        description: 'Quase sempre "Despesa" para comprovantes de compra/conta.',
      },
      categoria_sugerida: {
        type: 'string',
        enum: ['Fixa', 'Variavel'],
        description:
          'Fixa para contas recorrentes previsíveis (aluguel, condomínio, internet, energia, água). Variavel para o resto (mercado, restaurante, lazer, compras avulsas).',
      },
      confianca: {
        type: 'string',
        enum: ['alta', 'media', 'baixa'],
        description: 'Sua confiança na extração dos dados.',
      },
    },
    required: ['valor', 'fornecedor', 'tipo_sugerido', 'categoria_sugerida', 'confianca'],
  },
};

export async function extrairDadosComprovante({ imageBase64, mediaType }) {
  if (!ocrEnabled) {
    const err = new Error(
      'OCR não configurado: defina ANTHROPIC_API_KEY no .env do servidor (veja README.md).'
    );
    err.code = 'OCR_DISABLED';
    throw err;
  }

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    tools: [EXTRACT_TOOL],
    tool_choice: { type: 'tool', name: 'extrair_lancamento' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          {
            type: 'text',
            text: 'Extraia os dados deste comprovante/boleto/nota fiscal e chame a ferramenta extrair_lancamento com os campos preenchidos.',
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === 'tool_use');
  if (!toolUse) {
    const err = new Error('Não foi possível extrair os dados da imagem.');
    err.code = 'OCR_NO_RESULT';
    throw err;
  }

  return toolUse.input;
}
