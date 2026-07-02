# MesaFlow Menu

Cardápio digital com pedidos pelo WhatsApp para pequenos negócios de alimentação.
O cliente entra, escolhe, personaliza, adiciona ao carrinho e finaliza o pedido
direto no WhatsApp — sem cadastro, sem login e sem aplicativo.

**Demo:** **Beco da Chapa** — hamburgueria artesanal.

> Beco da Chapa é uma marca fictícia criada para demonstração do MesaFlow Menu.
> Dados de contato, endereço, redes sociais e número de WhatsApp são fictícios.

**Produção:** https://mesaflow-menu.vercel.app

---

## Tecnologias

- HTML5 semântico
- CSS3 com custom properties (design tokens)
- JavaScript puro com ES Modules nativos
- localStorage para persistência de carrinho e favoritos
- Web Share API para compartilhamento

Sem frameworks. Sem dependências. Sem build step. Imagens locais (`assets/images/`).

---

## Principais funcionalidades

- Hero com foto real, avaliação e status "Aberto agora / Fechado" calculado pelo horário
- Banner rotativo de promoções (dispensável) e skeleton loading no carregamento
- Filtro por categoria, busca em tempo real (com normalização de acentos) e favoritos
- Cards com foto real e fallback neutro em gradiente (sem emoji sobre a imagem)
- Painel compacto de personalização de hambúrgueres (remover ingredientes, adicionais
  com preço, ponto da carne) e escolha obrigatória de bebida nos combos
- Carrinho lateral com quantidades, linhas de customização, total e frete grátis progressivo
- Checkout com Delivery/Retirada, endereço condicional, pagamento e troco condicional
- Seção "Sobre" com galeria, avaliações de clientes e rodapé com QR Code do cardápio
- Layout responsivo: no mobile os produtos ficam em coluna única com imagens grandes

---

## Fluxo

```
site → cardápio → carrinho → checkout → WhatsApp
```

O checkout monta uma mensagem formatada (itens, quantidades, customizações, bebida,
entrega/retirada, pagamento, observações e total) e abre o WhatsApp da loja.

---

## Estrutura de pastas

```
CardapioPro/
├── index.html
├── src/
│   ├── config.js     URL pública da demo (SITE_URL) — fonte única
│   ├── app.js        bootstrap, eventos, banner rotativo, status da loja
│   ├── data.js       loja, cardápio, avaliações, banners (fonte única de dados)
│   ├── cart.js       estado do carrinho (itens simples e customizados)
│   ├── customize.js  painel de personalização
│   ├── checkout.js   formulário e geração da mensagem do WhatsApp
│   ├── filters.js    filtragem por categoria e busca
│   ├── search.js     debounce do campo de busca
│   ├── storage.js    wrapper de localStorage (com migração de chaves antigas)
│   └── ui.js         renderização (cards, skeleton, carrinho, avaliações, share)
├── styles/           reset, variables, layout, components, pages
└── assets/images/    hero, sobre, QR e produtos (fotos locais)
```

---

## Como rodar localmente

ES Modules exigem um servidor HTTP (não funciona via `file://`).

```bash
npx serve .            # dentro de CardapioPro/  (ou: npx serve produtos/CardapioPro)
# alternativas: VS Code Live Server, ou  python -m http.server 3000
```

Acesse a URL exibida no terminal.

---

## Configuração

- **URL pública:** `src/config.js` → `SITE_URL`. Ao trocar de domínio, atualize esse
  valor, espelhe em `<link rel="canonical">` / `<meta property="og:url">` no `index.html`
  e regenere o QR local (`assets/images/qr-code.png`) para o mesmo endereço.
- **WhatsApp de pedidos:** `src/data.js` → `STORE.whatsapp` (DDI+DDD+número).
- **Cardápio:** array `PRODUCTS` em `src/data.js`; fotos em `assets/images/products/`.

Regenerar o QR (exemplo, ajuste a URL):

```bash
curl -s -o assets/images/qr-code.png \
  "https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=https%3A%2F%2Fmesaflow-menu.vercel.app"
```

---

## Screenshots

Capturas em `prints/` (ver `prints/README.md` para a lista e os nomes esperados).

---

## Backend em evolução

A interface pública atual continua funcionando como **frontend estático** (HTML/CSS/JS
na raiz) e é ela que está publicada em produção. Em paralelo, o `backend/` inicia a
fundação de um backend real, preparando o MesaFlow para pedidos persistidos e painel
operacional nas próximas etapas.

**Stack:** Node.js + Express + Prisma + PostgreSQL (ES Modules).

**Modelos:** `Restaurant`, `Category`, `Product`, `Order`, `OrderItem` (valores monetários
sempre em centavos, como inteiros).

**Endpoints disponíveis nesta etapa:**

- `GET /api/health` → `{ "status": "ok" }`
- `GET /api/public/restaurants/beco-da-chapa/menu` → cardápio público (restaurante,
  categorias e produtos ativos)

O seed reutiliza `src/data.js` como fonte única (sem duplicar o cardápio) e é idempotente.

```bash
cd backend
cp .env.example .env          # aponte DATABASE_URL para um PostgreSQL local
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev                   # sobe a API em http://localhost:3333
```

> Nesta etapa o frontend **ainda não** consome a API. A próxima etapa conectará o
> checkout ao backend para registrar pedidos.

---

## Roadmap — ecossistema MesaFlow

- **MesaFlow Menu** — concluído
- MesaFlow Mesa
- MesaFlow Comanda
- MesaFlow Kitchen
- MesaFlow Caixa
- MesaFlow Estoque
- MesaFlow Financeiro

---

## Licença

MIT — livre para uso pessoal e comercial.
