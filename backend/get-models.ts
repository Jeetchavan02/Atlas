import fetch from "node-fetch";

async function getModels() {
  const res = await fetch("https://api.groq.com/openai/v1/models", {
    headers: {
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
    }
  });
  const data = await res.json() as any;
  console.log(data.data.map((d: any) => d.id).join(", "));
}
getModels();
