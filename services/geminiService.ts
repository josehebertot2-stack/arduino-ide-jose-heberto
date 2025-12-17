
import { GoogleGenAI, Type } from "@google/genai";

// Inicializa a IA apenas quando necessário para evitar erros de 'process undefined' no topo do arquivo
const getAI = () => {
  const apiKey = typeof process !== 'undefined' && process.env.API_KEY ? process.env.API_KEY : "";
  return new GoogleGenAI({ apiKey });
};

export const getCodeAssistance = async (prompt: string, currentCode: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Código Arduino Atual:\n\`\`\`cpp\n${currentCode}\n\`\`\`\n\nPergunta do Usuário: ${prompt}`,
    config: {
      systemInstruction: `Você é o Assistente Sênior do Arduino IDE. 
      Ajude o usuário a programar. Responda em Português Brasileiro.
      Sempre forneça blocos de código completos e explicados.`,
    },
  });
  return response.text;
};

export const analyzeCode = async (code: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analise este código Arduino e retorne um JSON com status, summary e issues:\n\`\`\`cpp\n${code}\n\`\`\``,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING },
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
          },
          summary: { type: Type.STRING }
        },
        required: ["status", "issues", "summary"]
      },
    },
  });
  
  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { status: "Erro", summary: "Erro ao processar análise.", issues: [] };
  }
};
