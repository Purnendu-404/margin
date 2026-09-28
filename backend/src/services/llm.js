const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT =
  process.env.RAG_SYSTEM_PROMPT +
  "\n\n" +
  process.env.DIAGRAM_RULES;

// history: [{ role: 'user' | 'model', text }] loaded from Mongo
async function generateResponse(question, context, history = []) {
    const contents = [
        ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        {
            role: 'user',
            parts: [{ text: `Context:\n${context}\n\nQuestion: ${question}` }],
        },
    ];

    const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        contents,
        config: {
            systemInstruction: [SYSTEM_PROMPT].filter(Boolean).join('\n\n'),
        },
    });

    return response.text;
}

module.exports = { generateResponse };