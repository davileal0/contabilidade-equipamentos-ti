# Dashboard de Equipamentos de TI

Plataforma web simples para visualizar e editar quantidades de equipamentos da Sala da TI e do Estoque no Protheus.

O projeto usa React, TypeScript, Vite, Tailwind CSS, backend Node.js com Express e banco SQLite local.

## Como Rodar em Desenvolvimento

```bash
npm install
npm run dev
```

O comando sobe:

- API local em `http://127.0.0.1:3001`
- Frontend Vite em `http://127.0.0.1:5173`

## Como Rodar a Versão Compilada

```bash
npm run build
npm start
```

Depois abra:

```text
http://127.0.0.1:3001/
```

## Persistência

Os dados oficiais ficam salvos no arquivo SQLite:

```text
db/inventory.sqlite
```

As alterações feitas na interface são enviadas para a API e gravadas nesse banco. O `localStorage` permanece apenas como fallback visual caso a API local esteja indisponível durante o desenvolvimento.

## Deploy na Vercel

O projeto está preparado para dois modos:

- desenvolvimento/local: `server.mjs` com SQLite em `db/inventory.sqlite`
- produção na Vercel: função serverless em `api/inventory.js` usando Vercel Blob

Arquivos usados no deploy da Vercel:

- `vercel.json`
- `api/inventory.js`

Para o deploy funcionar com persistência na Vercel, conecte um Blob Store ao projeto para que a variável `BLOB_READ_WRITE_TOKEN` seja criada no ambiente.

Depois disso, o fluxo é:

1. importar o repositório na Vercel
2. conectar um Blob Store ao projeto
3. fazer o deploy
4. apontar o domínio/subdomínio desejado no painel da Vercel

## Rotas da API

- `GET /api/inventory`: lista todos os itens.
- `PUT /api/inventory`: atualiza a lista completa de itens.
- `PATCH /api/inventory/:id`: atualiza as quantidades de um item específico.

## Funcionalidades

- Dashboard principal com destaque para notebooks, smartphones e periféricos.
- Separação visual entre dashboard e área editável.
- Separação visual entre Máquinas e Periféricos na área editável.
- Cards por item com nome, categoria, total e saldo visual.
- Campos numéricos editáveis para Sala da TI e Protheus.
- Botões de mais e menos para ajustes rápidos.
- Atualização imediata dos totais enquanto o usuário edita.
- Persistência local em SQLite.

## Itens Monitorados

Máquinas:

- Notebook
- Desktop
- All-in-one
- Smartphones

Periféricos:

- Mouse
- Teclado
- Régua de filtro de linha
- Headset
- Mousepad
- Mochila
- Suporte para notebook
- Suporte de vidro para monitor
- Suporte de monitor articulado
- Webcam
