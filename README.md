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
- Para o alerta realmente chegar ao celular mesmo com o app fechado, o **servidor precisa estar acessível** — hoje ele só roda enquanto você mantém `npm run dev` aberto no seu computador. Veja a seção "Publicar de verdade (deploy)" mais abaixo para o passo a passo completo (Render + agendador externo).
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

## Publicar de verdade (deploy) e instalar no celular

Arquitetura: **GitHub** (guarda o código) + **Vercel** (frontend, grátis) + **Render** (backend, grátis). Nenhum dos três pede cartão de crédito no plano gratuito.

### 0. Prontos localmente

- Repositório git já inicializado com o primeiro commit.
- `render.yaml` na raiz configura o backend automaticamente no Render (Blueprint).
- `client/vercel.json` garante que as rotas do app (`/lancamentos`, `/foto`, etc.) funcionem ao recarregar a página na Vercel.

### 1. Subir o código para o GitHub

1. Crie uma conta em [github.com](https://github.com) se ainda não tiver.
2. Crie um repositório novo **vazio** (sem README/gitignore), ex: `financas-casal`.
3. No terminal, dentro da pasta do projeto:

```bash
git remote add origin https://github.com/SEU-USUARIO/financas-casal.git
git branch -M main
git push -u origin main
```

(O GitHub vai pedir login/token na primeira vez — siga o fluxo que ele mostrar.)

### 2. Backend no Render

1. Crie conta em [render.com](https://render.com) (pode logar com GitHub).
2. **New** → **Blueprint** → selecione o repositório `financas-casal`. Ele vai detectar o `render.yaml` sozinho e criar o serviço `financas-casal-api`.
3. Antes de confirmar, preencha as variáveis marcadas como "secret" (o Render pede na tela de criação):
   - `JWT_SECRET`: `477ff732f16d9c540af93979e8e72bafe292db76c2821edff44d0b594a1533b3` (gerado agora — pode usar essa ou gerar outra com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `CORS_ORIGIN`: deixe em branco por enquanto, você volta aqui depois do passo 3
   - `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT`: copie os mesmos valores do seu `server/.env` local (assim as inscrições de notificação continuam válidas)
   - `CRON_SECRET`: copie do seu `server/.env` local (`e23dc04247736d038f4b2cb3b46c7b7d07639c932602358c`) ou gere outro
   - `ANTHROPIC_API_KEY` / `NOCODB_API_TOKEN` / `NOCODB_TABLE_ID`: se já estiver usando, copie do `.env` local; senão deixe em branco
4. Deploy. Quando terminar, anote a URL pública (algo como `https://financas-casal-api.onrender.com`).

### 3. Frontend na Vercel

1. Crie conta em [vercel.com](https://vercel.com) (pode logar com GitHub).
2. **Add New** → **Project** → selecione o repositório `financas-casal`.
3. Em **Root Directory**, selecione `client`.
4. Em **Environment Variables**, adicione:
   - `VITE_API_URL` = `https://financas-casal-api.onrender.com/api` (a URL do Render + `/api`)
5. Deploy. Anote a URL final (algo como `https://financas-casal.vercel.app`).

### 4. Fechar o ciclo: liberar o CORS

Volte no Render → seu serviço → **Environment** → edite `CORS_ORIGIN` para a URL exata da Vercel (ex: `https://financas-casal.vercel.app`, sem barra no final) → salve (isso reinicia o serviço).

### 5. Agendador externo para as notificações (importante)

O plano gratuito do Render "dorme" o servidor depois de ~15 min sem acesso — nesse estado, o `node-cron` interno não dispara. Para garantir que a checagem diária das 8h aconteça mesmo assim:

1. Crie uma conta grátis em [cron-job.org](https://cron-job.org) (ou use GitHub Actions, se preferir).
2. Crie um novo cron job:
   - URL: `https://financas-casal-api.onrender.com/api/push/cron-trigger`
   - Método: `POST`
   - Header customizado: `x-cron-secret: <o valor de CRON_SECRET que você configurou no Render>`
   - Horário: todo dia às 08:00 (horário de Brasília)

Isso "acorda" o servidor e dispara a checagem de contas vencendo no dia, mesmo que ninguém tenha aberto o app.

### Limitação conhecida: disco do Render free é temporário

Contas de login, inscrições de notificação e o controle "já notificado hoje" ficam em SQLite local no servidor. No plano gratuito do Render, esses arquivos **somem a cada novo deploy** (push de código novo) — não em cada "soneca" por inatividade, só quando você publica uma atualização. Na prática: depois de atualizar o app publicado, pode ser preciso logar de novo e reativar as notificações. Os **lançamentos financeiros não são afetados** se estiverem no NocoDB (fica salvo na nuvem deles, independente do Render). Se isso incomodar no dia a dia, dá para migrar login/inscrições para o NocoDB ou um banco Postgres gratuito (Neon/Supabase) depois — não é urgente agora.

### 6. Instalar no celular

1. Abra a URL da Vercel no navegador do celular (Chrome no Android, Safari no iPhone).
2. Faça login e clique em "Ativar avisos" para conceder a permissão de notificação.
3. **Android (Chrome)**: menu (⋮) → "Adicionar à tela inicial" ou "Instalar app".
4. **iPhone (Safari)**: toque no ícone de compartilhar (□↑) → "Adicionar à Tela de Início".
5. O ícone do app aparece na tela inicial, abre em tela cheia (sem barra de navegador) e recebe notificações normalmente.

Repita esse passo no celular de cada um de vocês dois.

## Próximos passos (Fase 2 restante)

- Exportação/sincronização com a planilha do OneDrive
- Múltiplas contas/cartões, metas por categoria, gráficos históricos
