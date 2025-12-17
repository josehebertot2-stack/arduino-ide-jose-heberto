
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Service to interact with the Google Gemini API for Arduino-specific tasks.
 */
export const getCodeAssistance = async (prompt: string, currentCode: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Contexto do código Arduino atual:\n\`\`\`cpp\n${currentCode}\n\`\`\`\n\nPergunta ou solicitação do usuário: ${prompt}`,
      config: {
        systemInstruction: `Você é o Assistente Sênior Especialista em Arduino. 
        Sua missão é ajudar desenvolvedores a criar sketches profissionais, seguros e eficientes.
        
        Diretrizes:
        1. Responda sempre em Português Brasileiro (PT-BR).
        2. Forneça explicações técnicas claras e concisas.
        3. Sempre formate blocos de código usando crases triplas com a linguagem 'cpp'.
        4. Priorize o uso de millis() para multitarefa e evite delay() bloqueante.
        5. Sugira boas práticas de organização de hardware e pinagem.`,
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error (Assistance):", error);
    return "Ocorreu um erro ao consultar a IA. Verifique sua conexão ou tente novamente mais tarde.";
  }
};

/**
 * Performs a deep static analysis of the Arduino code using Gemini.
 */
export const analyzeCode = async (code: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise este sketch Arduino em busca de erros de sintaxe, lógica e melhorias de performance:\n\`\`\`cpp\n${code}\n\`\`\``,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { 
              type: Type.STRING, 
              description: "Status geral da análise (ex: 'Alerta', 'Ok', 'Crítico')." 
            },
            summary: { 
              type: Type.STRING, 
              description: "Resumo em uma frase do que foi encontrado." 
            },
            issues: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  severity: { 
                    type: Type.STRING, 
                    description: "Nível do problema: 'critical', 'warning' ou 'suggestion'." 
                  },
                  message: { 
                    type: Type.STRING, 
                    description: "Descrição detalhada do problema em PT-BR." 
                  },
                  line: { 
                    type: Type.NUMBER, 
                    description: "Número da linha aproximada onde o problema ocorre." 
                  }
                },
                required: ["severity", "message"]
              }
            }
          },
          required: ["status", "summary", "issues"],
        },
        systemInstruction: "Você é um compilador humano de Arduino e consultor de engenharia de software. Analise o código rigorosamente e retorne apenas o JSON estruturado conforme o esquema.",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini API Error (Analysis):", error);
    return { 
      status: "Erro", 
      summary: "A análise falhou devido a um erro técnico.", 
      issues: [] 
    };
  }
};
