import { get, put } from "@vercel/blob";
import { readFile } from "node:fs/promises";

const INVENTORY_PATH = "inventory/data.json";
const SEED_URL = new URL("../src/data/initialInventory.json", import.meta.url);

const clampQuantity = (value) => Math.max(0, Math.min(9999, Math.trunc(Number(value)) || 0));

const normalizeItems = (items) => {
  if (!Array.isArray(items)) {
    throw new Error("Inventário inválido.");
  }

  return items.map((item) => ({
    id: String(item.id),
    name: String(item.name),
    category: item.category === "Máquinas" ? "Máquinas" : "Periféricos",
    tiRoom: clampQuantity(item.tiRoom),
    protheus: clampQuantity(item.protheus),
  }));
};

const loadSeedItems = async () => {
  const seed = await readFile(SEED_URL, "utf8");
  return normalizeItems(JSON.parse(seed));
};

const readInventoryFromBlob = async () => {
  const blob = await get(INVENTORY_PATH, {
    access: "public",
  });

  if (!blob) {
    const seedItems = await loadSeedItems();
    await put(INVENTORY_PATH, JSON.stringify(seedItems, null, 2), {
      access: "public",
      addRandomSuffix: false,
      contentType: "application/json; charset=utf-8",
      allowOverwrite: true,
    });
    return seedItems;
  }

  if (blob.statusCode !== 200 || !blob.stream) {
    throw new Error("Não foi possível ler o inventário no Blob.");
  }

  const content = await new Response(blob.stream).text();
  return normalizeItems(JSON.parse(content));
};

const writeInventoryToBlob = async (items) => {
  const normalizedItems = normalizeItems(items);

  await put(INVENTORY_PATH, JSON.stringify(normalizedItems, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json; charset=utf-8",
    allowOverwrite: true,
  });

  return normalizedItems;
};

export default async function handler(request, response) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      response.status(500).json({
        error: "BLOB_READ_WRITE_TOKEN não configurado na Vercel.",
      });
      return;
    }

    if (request.method === "GET") {
      response.setHeader("Cache-Control", "no-store");
      response.status(200).json(await readInventoryFromBlob());
      return;
    }

    if (request.method === "PUT") {
      response.setHeader("Cache-Control", "no-store");
      response.status(200).json(await writeInventoryToBlob(request.body));
      return;
    }

    response.setHeader("Allow", "GET, PUT");
    response.status(405).json({ error: "Método não permitido." });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Erro inesperado na API da Vercel.",
    });
  }
}
