export default async function handler(req, res) {
  // Permitir origem dinamicamente (mais compatível com clientes que enviam Origin)
  const origin = req.headers.origin || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // se seu cliente usar cookies/credenciais, ative true (e então não use "*")
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(204).end(); // preflight
  }

  if (req.method === "GET") {
    // Health check usado por clients/extensions que verificam o proxy
    return res.status(200).json({ reverse_proxy_is_working: true });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in request body" });
  }

  try {
    const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const text = await openaiResp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      // resposta não-JSON da OpenAI — repassar para depuração
      return res.status(502).json({ error: "Invalid response from OpenAI", details: text });
    }

    if (!openaiResp.ok) {
      // repassar erro do OpenAI para o cliente
      return res.status(openaiResp.status).json({ error: "OpenAI API error", details: data });
    }

    const content =
      (data.choices && data.choices[0] && (data.choices[0].message?.content || data.choices[0].text)) ||
      "";

    res.status(200).json({
      choices: [
        {
          message: {
            content
          }
        }
      ]
    });
  } catch (error) {
    res.status(500).json({ error: "Erro no proxy", details: error.message });
  }
}