
import { GoogleGenAI, Type } from "@google/genai";

// Função para instanciar a IA de forma segura
const createAIClient = () => {
  const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : "";
  if (!apiKey) {
    console.warn("API_KEY não encontrada no ambiente.");
  }
  return new GoogleGenAI({ apiKey: apiKey || "" });
};

export const getCodeAssistance = async (prompt: string, currentCode: string) => {
  try {
    const ai = createAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Contexto do código Arduino:\n\`\`\`cpp\n${currentCode}\n\`\`\`\n\nUsuário: ${prompt}`,
      config: {
        systemInstruction: "Você é o Assistente Especialista em Arduino. Forneça códigos C++ eficientes, use millis() em vez de delay() e responda sempre em Português Brasileiro.",
      },
    });
    return response.text;
  } catch (error) {
    console.error("Erro no Gemini Service (Chat):", error);
    return "Desculpe, ocorreu um erro ao processar sua solicitação de IA.";
  }
};

export const analyzeCode = async (code: string) => {
  try {
    const ai = createAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise este código Arduino e identifique erros:\n\`\`\`cpp\n${code}\n\`\`\``,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            summary: { type: Type.STRING },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  severity: { type: Type.STRING },
                  message: { type: Type.STRING },
                  line: { type: Type.NUMBER }
                },
                required: ["severity", "message"]
              }
            }
          },
          required: ["status", "summary", "issues"]
        },
      },
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Erro no Gemini Service (Análise):", error);
    return { status: "Erro", summary: "Não foi possível analisar o código no momento.", issues: [] };
  }
};
