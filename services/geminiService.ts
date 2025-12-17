
import { GoogleGenAI, Type } from "@google/genai";

export const getCodeAssistance = async (prompt: string, currentCode: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Código Arduino Atual:\n\`\`\`cpp\n${currentCode}\n\`\`\`\n\nPergunta do Usuário: ${prompt}`,
    config: {
      systemInstruction: `Você é o Assistente de IA Oficial do Arduino IDE. 
      Sua missão é ajudar desenvolvedores a criar sketches perfeitos.
      
      Regras:
      1. Forneça código C++ (Arduino) de alta qualidade.
      2. Sempre use blocos de código markdown com 'cpp'.
      3. Seja técnico, preciso e conciso.
      4. Responda em Português Brasileiro (PT-BR).
      5. Priorize o uso de millis() em vez de delay().
      6. Explique brevemente as conexões de hardware necessárias.`,
      thinkingConfig: { thinkingBudget: 4000 }
    },
  });
  return response.text;
};

export const analyzeCode = async (code: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analise este sketch Arduino e identifique problemas:\n\`\`\`cpp\n${code}\n\`\`\``,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, description: "Sucesso ou Erro" },
          issues: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                severity: { type: Type.STRING, description: "critical, warning, or suggestion" },
                message: { type: Type.STRING, description: "Descrição do problema em PT-BR" },
                line: { type: Type.NUMBER, description: "Linha aproximada do erro" }
              },
              required: ["severity", "message"]
            }
          },
          summary: { type: Type.STRING, description: "Resumo geral da análise em PT-BR" }
        },
        required: ["status", "issues", "summary"]
      },
      systemInstruction: "Você é um compilador estático humano e consultor sênior de Arduino. Analise a sintaxe, lógica e boas práticas. Retorne um JSON estruturado."
    }
  });
  
  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    return { status: "Erro", summary: response.text, issues: [] };
  }
};
