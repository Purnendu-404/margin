const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const SYSTEM_PROMPT =
    process.env.RAG_SYSTEM_PROMPT +
    "\n\n" +
    process.env.DIAGRAM_RULES;

async function generateResponse(question, context, history, res) {

    const messages = history.map((message) => ({
        role: message.role,
        parts: [
            { text: message.text }
        ],
    }));

    messages.push({
        role: "user",
        parts: [
            {
                text: `Context:
${context}

Question:
${question}`
            }
        ],
    });

    const response = await ai.models.generateContentStream({
        model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
        contents: messages,
        config: {
            systemInstruction: SYSTEM_PROMPT,
        },
    });

    let modelResponse = "";

    for await (const chunk of response) {
        const text = chunk.text || "";

        if (text) {
            modelResponse += text;
            res.write(text);
        }
    }

    return modelResponse;
}

module.exports = {
    generateResponse,
};