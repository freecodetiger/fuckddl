import { ChatOpenAI } from "@langchain/openai";

export function createLLM(): ChatOpenAI {
  // Hardcoded for testing — verify the call chain works
  const baseURL = "https://api.okinto.com/v1";
  const apiKey = "sk-k0C9T0xzgDbDf4fZpU60nHKmHF1Qy2XJzL6jpacEx9eJBukM";

  // This WILL appear in the BROWSER DevTools console (right-click app → Inspect → Console)
  console.log("[LLM] HARDCODED createLLM called, baseURL=", baseURL, "model=gpt-5.4");

  return new ChatOpenAI({
    model: "gpt-5.4",
    temperature: 0.3,
    apiKey,
    configuration: {
      baseURL,
    },
  });
}
