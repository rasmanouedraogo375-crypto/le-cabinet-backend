require("dotenv").config();
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

if (!ANTHROPIC_API_KEY) {
  console.error("ERREUR : la variable d'environnement ANTHROPIC_API_KEY n'est pas définie.");
}

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
app.use("/api/", limiter);

async function askClaude(prompt, { maxTokens = 1500 } = {}) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .filter(Boolean)
    .join("\n");
  return text;
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/recherche", async (req, res) => {
  try {
    const question = (req.body.question || "").trim();
    if (!question) return res.status(400).json({ error: "Question manquante." });
    const prompt = `Réponds en français, de façon développée, structurée et précise à la question suivante. Utilise des paragraphes clairs, pas de markdown lourd (pas de titres avec #). Question : ${question}`;
    const text = await askClaude(prompt, { maxTokens: 1200 });
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Une erreur est survenue." });
  }
});

app.post("/api/document", async (req, res) => {
  try {
    const { type, sujet } = req.body;
    if (!sujet || !sujet.trim()) return res.status(400).json({ error: "Sujet manquant." });
    const prompt = `Rédige en français un document de type "${type || "document"}" à partir de ces instructions : ${sujet}. Rends un texte complet, prêt à l'emploi, sans commentaire méta ni markdown (pas de # ni **). Structure-le avec des paragraphes ou des sections numérotées si pertinent.`;
    const text = await askClaude(prompt, { maxTokens: 1800 });
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Une erreur est survenue." });
  }
});

app.post("/api/recherche-approfondie", async (req, res) => {
  try {
    const sujet = (req.body.sujet || "").trim();
    if (!sujet) return res.status(400).json({ error: "Sujet manquant." });
    const prompt = `Fais une recherche approfondie en français sur le sujet suivant, en croisant plusieurs angles (contexte, enjeux, arguments pour/contre, exemples concrets, limites, perspectives). Sois développé et rigoureux, en paragraphes structurés, sans markdown lourd (pas de # ni **). Sujet : ${sujet}`;
    const text = await askClaude(prompt, { maxTokens: 2500 });
    res.json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Une erreur est survenue." });
  }
});

app.listen(PORT, () => {
  console.log(`Le Cabinet — backend démarré sur le port ${PORT}`);
});
