import { ChatOpenAI } from "@langchain/openai";

console.log("[LLM] MODULE LOADED — llm.ts is being executed");

export function createLLM(): ChatOpenAI {
  const baseURL = localStorage.getItem("codex_api_url") || "";
  const apiKey = localStorage.getItem("codex_api_key") || "";

  console.log("[LLM] createLLM called v2 — baseURL:", baseURL || "(EMPTY!)", "apiKey:", apiKey ? `${apiKey.slice(0,8)}...` : "(EMPTY!)");

  if (!baseURL || !apiKey) {
    const msg = `[LLM] FATAL: ${!baseURL ? "API 地址" : "API Key"} 未设置！请在设置页填写 AI 服务的 API 地址和 API Key`;
    console.error(msg);
    // Still create the client — the error will propagate as 401
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
