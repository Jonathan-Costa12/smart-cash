# Smart Cash

App de controle financeiro compartilhado entre duas pessoas. MVP (login, dashboard, lançamento manual, notificações push) e lançamento por foto com OCR já implementados.

> O código-fonte e o repositório continuam com o nome `financas-casal` (pasta local e repositório no GitHub) — só o nome exibido para os usuários mudou para "Smart Cash". Avise se quiser renomear a pasta/repositório também.

## Estrutura

- `server/` — API REST (Node/Express), autenticação JWT, notificações push, banco SQLite local (embutido, sem serviço externo)
- `client/` — Frontend (React + Vite + Tailwind), PWA instalável, service worker com push
- `client/android/` — projeto Android nativo (Capacitor), empacota o mesmo frontend web para gerar APK/publicar na Play Store

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
   - `ANTHROPIC_API_KEY`: se já estiver usando o OCR, copie do `.env` local; senão deixe em branco
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

### Limitação importante: disco do Render free é temporário

**Todos os dados** — lançamentos, contas de login, inscrições de notificação — ficam em SQLite local no servidor. No plano gratuito do Render, esse arquivo **é apagado a cada novo deploy** (toda vez que você publica uma atualização de código) — não em cada "soneca" por inatividade, só quando sobe código novo. Ou seja: enquanto você não fizer outro `git push`, os dados ficam intactos; mas ao atualizar o app publicado, os lançamentos, logins e inscrições de notificação são perdidos e é preciso recomeçar (rodar `npm run seed` de novo, logar, reativar avisos).

Isso é aceitável para começar a usar e testar, mas **não é adequado para depender do app no dia a dia com dados reais**. Antes de usar para valer, vale migrar para um plano com disco persistente do Render (pago, a partir de poucos dólares/mês) ou para um banco gerenciado com camada gratuita de verdade (ex: Postgres no [Neon](https://neon.tech) ou [Supabase](https://supabase.com)) — me avise quando quiser seguir por esse caminho.

### 6. Instalar no celular

1. Abra a URL da Vercel no navegador do celular (Chrome no Android, Safari no iPhone).
2. Faça login e clique em "Ativar avisos" para conceder a permissão de notificação.
3. **Android (Chrome)**: menu (⋮) → "Adicionar à tela inicial" ou "Instalar app".
4. **iPhone (Safari)**: toque no ícone de compartilhar (□↑) → "Adicionar à Tela de Início".
5. O ícone do app aparece na tela inicial, abre em tela cheia (sem barra de navegador) e recebe notificações normalmente.

Repita esse passo no celular de cada um de vocês dois.

## App nativo Android (Capacitor)

O frontend web é empacotado como app Android de verdade usando [Capacitor](https://capacitorjs.com), em `client/android/`. Ícone e splash screen já seguem a identidade verde/preto.

### Gerar um APK de teste

Java 17 (JDK) e o Android SDK já estão instalados nesta máquina. O projeto já está sincronizado (`npm run build` + `npx cap sync android` já rodados).

**Use o Android Studio pela interface gráfica** (não o terminal) para gerar o APK — em builds automatizados por script, o antivírus corporativo (McAfee) desta máquina bloqueia a comunicação interna do Gradle com o erro `Unable to establish loopback connection`, mesmo sendo tráfego 100% local. Abrindo o Android Studio normalmente esse bloqueio não costuma acontecer:

1. Abra o **Android Studio**
2. **Open** → selecione a pasta `client/android`
3. Espere sincronizar (primeira vez demora)
4. **Build → Build Bundle(s) / APK(s) → Build APK(s)**

O APK fica em `client/android/app/build/outputs/apk/debug/app-debug.apk`. Copie esse arquivo pro celular Android (ou use `adb install app-debug.apk` com o aparelho conectado) e instale — pode ser preciso permitir "instalar de fontes desconhecidas" nas configurações do Android, já que não veio da Play Store.

Se preferir tentar pelo terminal mesmo assim (`cd client/android && ./gradlew.bat assembleDebug`) e esbarrar no mesmo erro de loopback, provavelmente é a mesma proteção agindo — nesse caso a interface gráfica do Android Studio é o caminho mais confiável.

### Sempre que mudar algo no app web

Depois de editar o frontend, repita `npm run build && npx cap sync android` antes de gerar um novo APK — o Capacitor não observa mudanças automaticamente.

### Publicar na Google Play (opcional, futuro)

Exige uma conta de desenvolvedor Google Play (US$25, pagamento único, só você pode criar) e gerar um build assinado (`./gradlew bundleRelease`) em vez do debug. Podemos fazer isso quando quiser publicar de verdade — o debug já serve pra instalar e usar no dia a dia sem passar pela loja.

### iOS

Build nativo para iPhone exige Xcode, que só roda em macOS — não é possível compilar isso nesta máquina Windows. O caminho recomendado agora é o **PWA já configurado**: abrir a URL do app no Safari do iPhone e "Adicionar à Tela de Início" (seção de instalação no celular, mais abaixo) — funciona sem custo, sem Mac e sem conta de desenvolvedor, com ícone próprio, tela cheia e notificações. Se um dia quiser o app "de verdade" na App Store, aí sim entra a conversa de conta Apple Developer (US$99/ano) + Mac ou serviço de build na nuvem.

## Próximos passos (Fase 2 restante)

- Exportação/sincronização com a planilha do OneDrive
- Múltiplas contas/cartões, metas por categoria, gráficos históricos
