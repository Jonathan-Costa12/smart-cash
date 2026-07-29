# Finanças Casal

App de controle financeiro compartilhado entre duas pessoas. MVP (login, dashboard, lançamento manual, notificações push) e lançamento por foto com OCR já implementados.

## Estrutura

- `server/` — API REST (Node/Express), autenticação JWT, notificações push. Lançamentos ficam em SQLite local por padrão ou no NocoDB se configurado (ver seção abaixo).
- `client/` — Frontend (React + Vite + Tailwind), PWA instalável, service worker com push

## Como rodar (desenvolvimento)

### 1. Backend

```bash
cd server
npm install
npm run seed   # cria as 2 contas do casal + lançamentos de exemplo
npm run dev    # inicia em http://localhost:3001
```

Usuários criados pelo seed (troque as senhas depois):

- `pessoa1@casal.com` / `mudar123`
- `pessoa2@casal.com` / `mudar123`

### 2. Frontend

```bash
cd client
npm install
npm run dev    # inicia em http://localhost:5173
```

## Regras de negócio implementadas

- `status` de cada lançamento é derivado: `Pago` (tem data de pagamento), `Atrasado` (vencimento passou e não foi pago), `A vencer` (vencimento futuro, não pago), `Sem valor` (valor não informado — hoje bloqueado pela validação, mas mantido no enum para compatibilidade com a planilha).
- Valor é **obrigatório** em todo lançamento (evita a inconsistência que existia na planilha).
- Alerta de saúde financeira: dispara quando o total pago no mês ultrapassa X% da receita esperada antes do dia Y (padrão: 70% antes do dia 20, configurável no dashboard).
- Alerta de despesas fixas atrasadas (vencidas sem pagamento).
- Notificação push no celular/navegador quando uma despesa vence no dia (job diário, horário configurável em `NOTIFICATION_CRON`/`NOTIFICATION_TZ` no `.env` do servidor). Cada usuário precisa clicar em "Ativar avisos" no app e conceder a permissão de notificação uma vez.

## Notificações push — importante

- As chaves VAPID já estão geradas em `server/.env` (não são segredo público, mas troque-as se for para produção).
- Para o alerta realmente chegar ao celular mesmo com o app fechado, o **servidor precisa estar rodando continuamente** — hoje ele só roda enquanto você mantém `npm run dev` aberto no seu computador. Quando for usar de verdade, será preciso publicar o `server/` em algum host que fique sempre ligado (Render, Railway, Fly.io, etc. — todos têm camada gratuita).
- Para testar sem esperar o horário do cron, chame `POST /api/push/test-check` (autenticado) — ele verifica na hora se há despesas vencendo hoje e dispara a notificação.

## Lançamento por foto (OCR) — como ativar

A tela "📷 Foto" já está pronta (upload/captura de foto, extração e formulário de confirmação antes de salvar), mas depende de uma chave da API da Anthropic:

1. Crie uma chave em [console.anthropic.com](https://console.anthropic.com)
2. Cole em `server/.env`: `ANTHROPIC_API_KEY=sk-ant-...`
3. Reinicie o backend (`npm run dev`)

Sem a chave, a tela funciona normalmente até o botão "Extrair dados da foto", que então mostra um aviso claro e um link para lançar manualmente — nada quebra.

O modelo usado é `claude-sonnet-5` (configurável via `ANTHROPIC_MODEL` no `.env`). A IA sugere tipo, categoria, valor, data e fornecedor; o usuário sempre confirma/edita antes de salvar.

## Lançamentos no NocoDB — como ativar

Por padrão os lançamentos ficam num banco SQLite local. Se preencher `NOCODB_API_TOKEN` e `NOCODB_TABLE_ID` no `.env`, o app passa a ler e gravar **direto no NocoDB** — ou seja, o que você lançar pela planilha do NocoDB aparece no app, e o que lançar no app aparece lá, sem nenhum passo de sincronização no meio (é a mesma fonte de dados).

### 1. Criar a tabela em app.nocodb.com

1. Entre em [app.nocodb.com](https://app.nocodb.com) com sua conta e crie (ou abra) uma Base.
2. Crie uma tabela chamada `lancamentos` com estas colunas exatas (nome e tipo):

   | Coluna | Tipo no NocoDB | Observação |
   |---|---|---|
   | `fonte_descricao` | Single line text | pode deixar como o campo "Título/Display" da tabela |
   | `tipo` | Single select | opções: `Receita`, `Despesa` |
   | `categoria` | Single select | opções: `Fixa`, `Variavel` |
   | `valor` | Decimal (ou Number) | |
   | `vencimento` | Date | |
   | `pagamento` | Date | permitir vazio |
   | `origem` | Single select | opções: `manual`, `foto_ocr` |
   | `usuario_email` | Single line text | |

   Não precisa criar `Id`, `CreatedAt` nem `UpdatedAt` — o NocoDB já cria esses campos automaticamente em toda tabela.

### 2. Pegar o Table ID

Com a tabela `lancamentos` aberta, procure o botão de API (ícone `</>` ou "Get API Snippet", geralmente perto do nome da tabela ou no menu "..."). Ele mostra exemplos de requisição já com a URL `/api/v2/tables/<TABLE_ID>/records` — copie esse `TABLE_ID`.

### 3. Gerar o token de API

No canto superior direito, clique no seu avatar → **API Tokens** → **Create New Token** → copie o token gerado (ele só aparece uma vez).

### 4. Configurar o servidor

Em `server/.env`:

```
NOCODB_API_TOKEN=o-token-que-voce-copiou
NOCODB_TABLE_ID=o-table-id-que-voce-copiou
```

Reinicie o backend (`npm run dev`). No terminal deve aparecer:

```
[lancamentosStore] usando NocoDB como fonte de dados dos lançamentos
```

Você pode conferir a qualquer momento em qual banco o app está gravando acessando `http://localhost:3001/api/meta`.

### Observações

- Login/senha do app continuam sempre locais (não vão para o NocoDB) — o NocoDB guarda só os lançamentos.
- Se `NOCODB_API_TOKEN`/`NOCODB_TABLE_ID` ficarem em branco, o app volta a usar o SQLite local automaticamente, sem quebrar nada.
- Como o NocoDB é hospedado na nuvem por eles, essa parte dos dados já fica disponível 24/7 independente do seu computador — mas o job de notificação push (que roda no `server/`) continua precisando de um servidor sempre ligado, como já explicado acima.

## Próximos passos (Fase 2 restante)

- Exportação/sincronização com a planilha do OneDrive
- Múltiplas contas/cartões, metas por categoria, gráficos históricos
