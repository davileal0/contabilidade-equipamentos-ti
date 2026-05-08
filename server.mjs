import express from "express";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";
const apiOnly = process.argv.includes("--api-only");
const dbDir = path.join(__dirname, "db");
const dbPath = path.join(dbDir, "inventory.sqlite");
const seedPath = path.join(__dirname, "src", "data", "initialInventory.json");
const distDir = path.join(__dirname, "dist");

mkdirSync(dbDir, { recursive: true });

const db = new DatabaseSync(dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Máquinas', 'Periféricos')),
    ti_room INTEGER NOT NULL DEFAULT 0 CHECK (ti_room >= 0),
    protheus INTEGER NOT NULL DEFAULT 0 CHECK (protheus >= 0)
  )
`);

const clampQuantity = (value) => Math.max(0, Math.min(9999, Math.trunc(Number(value)) || 0));
const getLocalIp = () => {
  const interfaces = os.networkInterfaces();

  for (const networkEntries of Object.values(interfaces)) {
    for (const entry of networkEntries ?? []) {
      if (entry.family === "IPv4" && !entry.internal && !entry.address.startsWith("169.254.")) {
        return entry.address;
      }
    }
  }

  return "127.0.0.1";
};

const normalizeItem = (item) => ({
  id: String(item.id),
  name: String(item.name),
  category: item.category === "Máquinas" ? "Máquinas" : "Periféricos",
  tiRoom: clampQuantity(item.tiRoom),
  protheus: clampQuantity(item.protheus),
});

const mapRow = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  tiRoom: row.ti_room,
  protheus: row.protheus,
});

const seedDatabase = () => {
  const count = db.prepare("SELECT COUNT(*) AS total FROM inventory_items").get().total;

  if (count > 0) {
    return;
  }

  const seedItems = JSON.parse(readFileSync(seedPath, "utf8")).map(normalizeItem);
  const insert = db.prepare(`
    INSERT INTO inventory_items (id, name, category, ti_room, protheus)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN");

  try {
    for (const item of seedItems) {
      insert.run(item.id, item.name, item.category, item.tiRoom, item.protheus);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
};

const listItems = () =>
  db
    .prepare(
      "SELECT id, name, category, ti_room, protheus FROM inventory_items ORDER BY rowid ASC",
    )
    .all()
    .map(mapRow);

const replaceItems = (items) => {
  if (!Array.isArray(items)) {
    throw new Error("Inventário inválido.");
  }

  const normalizedItems = items.map(normalizeItem);
  const upsert = db.prepare(`
    INSERT INTO inventory_items (id, name, category, ti_room, protheus)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      ti_room = excluded.ti_room,
      protheus = excluded.protheus
  `);

  db.exec("BEGIN");

  try {
    for (const item of normalizedItems) {
      upsert.run(item.id, item.name, item.category, item.tiRoom, item.protheus);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return listItems();
};

const updateItemQuantities = (id, quantities) => {
  const current = db
    .prepare("SELECT id, name, category, ti_room, protheus FROM inventory_items WHERE id = ?")
    .get(id);

  if (!current) {
    return null;
  }

  const tiRoom = quantities.tiRoom === undefined ? current.ti_room : clampQuantity(quantities.tiRoom);
  const protheus =
    quantities.protheus === undefined ? current.protheus : clampQuantity(quantities.protheus);

  db.prepare("UPDATE inventory_items SET ti_room = ?, protheus = ? WHERE id = ?").run(
    tiRoom,
    protheus,
    id,
  );

  return mapRow(
    db
      .prepare("SELECT id, name, category, ti_room, protheus FROM inventory_items WHERE id = ?")
      .get(id),
  );
};

seedDatabase();

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/inventory", (_request, response) => {
  response.json(listItems());
});

app.put("/api/inventory", (request, response) => {
  try {
    response.json(replaceItems(request.body));
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "Erro ao salvar inventário.",
    });
  }
});

app.patch("/api/inventory/:id", (request, response) => {
  const item = updateItemQuantities(request.params.id, request.body ?? {});

  if (!item) {
    response.status(404).json({ error: "Item não encontrado." });
    return;
  }

  response.json(item);
});

if (!apiOnly) {
  app.use(express.static(distDir));
  app.use((_request, response) => {
    response.sendFile(path.join(distDir, "index.html"));
  });
}

app.listen(port, host, () => {
  const mode = apiOnly ? "API" : "app";
  const localIp = getLocalIp();
  console.log(`Servidor ${mode} em http://127.0.0.1:${port}`);
  console.log(`Servidor ${mode} na rede local em http://${localIp}:${port}`);
});
