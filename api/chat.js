export default async function handler(req, res) {
  // CORS permissivo (ajuste se precisar de credenciais)
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  const requested = req.headers["access-control-request-headers"];
  res.setHeader("Access-Control-Allow-Headers", requested || "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Access-Control-Expose-Headers", "Content-Length,Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method === "GET") return res.status(200).json({ reverse_proxy_is_working: true });
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  // Safe headers for logs
  const safeHeaders = { ...req.headers };
  if (safeHeaders.authorization) safeHeaders.authorization = "REDACTED";

  // Ensure we can read body in any format
  let body = req.body;
  if (!body || Object.keys(body).length === 0) {
    try {
      const raw = await (async () => {
        try { return await req.text(); } catch { return null; }
      })();

      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          // try form-urlencoded
          if (raw.includes("=")) {
            body = Object.fromEntries(new URLSearchParams(raw));
          } else {
            body = { text: raw };
          }
        }
      } else {
        body = {};
      }
    } catch (e) {
      body = {};
    }
  }

  const bodyPreview = (() => { try { return JSON.stringify(body).slice(0,1000); } catch { return String(body).slice(0,1000); } })();
  console.log("[proxy] Incoming POST", { url: req.url, headers: safeHeaders, bodyPreview });

  // Accept multiple field names the mod might send
  const prompt = body.prompt || body.input || body.message || body.text || null;
  const clientMessages = body.messages || null;
  const model = body.model || "gpt-3.5-turbo";

  const messages = clientMessages ? clientMessages : (prompt ? [{ role: "user", content: prompt }] : null);
  if (!messages) return res.status(400).json({ error: "Missing 'prompt' or 'messages' in request body", received: bodyPreview });

  // Call OpenAI
  try {
    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model, messages })
    });

    const text = await openaiResp.text();
    let data;
    try { data = JSON.parse(text); } catch (e) {
      console.log("[proxy] OpenAI returned non-JSON", text.slice(0,1000));
      return res.status(502).json({ error: "Invalid response from OpenAI", details: text });
    }

    if (!openaiResp.ok) {
      console.log("[proxy] OpenAI API error", data);
      return res.status(openaiResp.status).json({ error: "OpenAI API error", details: data });
    }

    const content = (data.choices && data.choices[0] && (data.choices[0].message?.content || data.choices[0].text)) || "";
    return res.status(200).json({ choices: [{ message: { content } }] });
  } catch (err) {
    console.log("[proxy] Fetch error", err && err.message ? err.message : err);
    return res.status(500).json({ error: "Erro no proxy", details: err?.message || String(err) });
  }
}