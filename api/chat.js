export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { prompt } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": Bearer ${process.env.OPENAIAPIKEY}
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Erro no proxy", details: error.message });
  }
}
````markdown name=README.md
markdown

Penguin Proxy

Proxy reverso para a API da OpenAI, ideal para usar com PenguinMod.

Como usar no Vercel

1. Importe este repositório no Vercel.
2. Vá em Settings → Environment Variables.
3. Crie a variável:
   - Name: OPENAIAPIKEY
   - Value: sua chave da OpenAI
4. Faça o deploy.
5. Use a URL: https://seu-projeto.vercel.app/api/chat
