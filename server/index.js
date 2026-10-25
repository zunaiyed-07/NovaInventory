import express from "express";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const port = 3001;
const dataPath = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "store.json");
const app = express();
let revision = 0;
let state = null;
let writeQueue = Promise.resolve();

try {
  const saved = JSON.parse(await readFile(dataPath, "utf8"));
  if (saved && Number.isInteger(saved.revision) && saved.state && typeof saved.state === "object") {
    revision = saved.revision;
    state = saved.state;
  } else {
    throw new Error("The saved data file has an invalid format.");
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/state", (_req, res) => res.json({ state, revision }));

app.post("/api/state", async (req, res, next) => {
  try {
    if (!isState(req.body?.state))
      return res.status(400).json({ error: "Invalid application state." });
    await enqueueWrite(async () => {
      if (state === null) {
        const previousRevision = revision;
        state = req.body.state;
        revision += 1;
        try {
          await persist();
        } catch (error) {
          state = null;
          revision = previousRevision;
          throw error;
        }
      }
    });
    res.json({ state, revision });
  } catch (error) {
    next(error);
  }
});

app.put("/api/state", async (req, res, next) => {
  try {
    if (!isState(req.body?.state) || !Number.isInteger(req.body?.revision)) {
      return res.status(400).json({ error: "Invalid state or revision." });
    }
    let conflict = false;
    await enqueueWrite(async () => {
      if (req.body.revision !== revision) {
        conflict = true;
        return;
      }
      const previousState = state;
      const previousRevision = revision;
      state = req.body.state;
      revision += 1;
      try {
        await persist();
      } catch (error) {
        state = previousState;
        revision = previousRevision;
        throw error;
      }
    });
    if (conflict) return res.status(409).json({ state, revision });
    res.json({ state, revision });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error("Local sync API error:", error);
  res.status(500).json({ error: "Unable to save local application data." });
});

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Local sync API listening on http://127.0.0.1:${port}`);
});

function isState(value) {
  return (
    value &&
    typeof value === "object" &&
    Array.isArray(value.products) &&
    Array.isArray(value.customers) &&
    Array.isArray(value.sales) &&
    Array.isArray(value.expenses) &&
    Array.isArray(value.shiftHistory) &&
    Array.isArray(value.vouchers) &&
    (value.shift === null || typeof value.shift === "object") &&
    typeof value.settings === "object"
  );
}

function enqueueWrite(operation) {
  const next = writeQueue.then(operation);
  writeQueue = next.catch(() => {});
  return next;
}

async function persist() {
  await mkdir(dirname(dataPath), { recursive: true });
  const tempPath = `${dataPath}.tmp`;
  await writeFile(tempPath, JSON.stringify({ revision, state }, null, 2), "utf8");
  await rename(tempPath, dataPath);
}

process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
