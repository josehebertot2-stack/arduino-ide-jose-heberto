
import { GoogleGenAI } from "@google/genai";

export const getCodeAssistance = async (prompt: string, currentCode: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Código Arduino Atual:\n\`\`\`cpp\n${currentCode}\n\`\`\`\n\nPergunta do Usuário: ${prompt}`,
    config: {
      systemInstruction: `Você é o Assistente de IA Oficial do Arduino. 
      1. Forneça código C++ de alta qualidade para Arduino.
      2. Sempre coloque os blocos de código entre crases triplas com 'cpp'.
      3. Seja conciso e técnico.
      4. Responda SEMPRE em português brasileiro.
      5. Sugira conexões de pinos se houver hardware envolvido.
      6. Use as melhores práticas (código não bloqueante com millis() em vez de delay() quando possível).`,
      thinkingConfig: { thinkingBudget: 1500 }
    },
  });
  return response.text;
};

export const analyzeCode = async (code: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Analise este sketch Arduino:\n\`\`\`cpp\n${code}\n\`\`\``,
    config: {
      systemInstruction: "Verifique: pontos e vírgulas ausentes, modos de pino incorretos, estouro de variável (ex: int para millis) e lógica de bloqueio. Retorne um resumo breve das descobertas EM PORTUGUÊS.",
    }
  });
  return response.text;
};
