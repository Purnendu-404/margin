const { GoogleGenAI } = require('@google/genai');
require('dotenv').config()

const ai = new GoogleGenAI({});

async function embedChunks(chunks) {
    const embeddings = [];

    for (const chunk of chunks) {
        const response = await ai.models.embedContent({
            model: 'gemini-embedding-2',
            contents: chunk,
            config: {
                outputDimensionality: 768,
            },
        });
        embeddings.push(response.embeddings[0].values);
    }

    return embeddings;
}

async function embedQuery(text) {
    const response = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: text,
        config: {
            outputDimensionality: 768,
        },
    });
    return response.embeddings[0].values;
}

module.exports = { embedChunks, embedQuery };