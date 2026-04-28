import { ChatOpenAI } from "@langchain/openai";

export function createLLM(): ChatOpenAI {
  const baseURL = localStorage.getItem("codex_api_url") || "";
  const apiKey = localStorage.getItem("codex_api_key") || "";

  if (!baseURL || !apiKey) {
    console.warn("[LLM] Missing config — please set API 地址 and API Key in Settings");
  }

  return new ChatOpenAI({
    model: "gpt-5.4",
    temperature: 0.3,
    apiKey,
    configuration: {
      baseURL,
    },
  });
}
