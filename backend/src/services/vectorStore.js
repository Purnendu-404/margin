const { Pinecone } = require('@pinecone-database/pinecone');

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.PINECONE_INDEX_NAME);

async function upsertChunks(userId, documentId, chunks, embeddings) {
    const vectors = chunks.map((chunk, i) => ({
        id: `${documentId}-${i}`,
        values: embeddings[i],
        metadata: { documentId, chunkIndex: i, text: chunk },
    }));

    const ns = index.namespace(String(userId));
    for (let i = 0; i < vectors.length; i += 100) {
        await ns.upsert({ records: vectors.slice(i, i + 100) });
    }
}

async function queryChunks(userId, documentId, queryEmbedding, topK = 10) {
    const results = await index.namespace(String(userId)).query({
        vector: queryEmbedding,
        topK,
        includeMetadata: true,
        filter: { documentId: { $eq: documentId } },
    });
    return results.matches;
}

// Deletes by explicit IDs (<documentId>-0 ... <documentId>-N)
async function deleteDocumentChunks(userId, documentId, chunkCount) {
    if (!chunkCount) return;
    const ns = index.namespace(String(userId));
    const ids = Array.from({ length: chunkCount }, (_, i) => `${documentId}-${i}`);

    for (let i = 0; i < ids.length; i += 1000) {
        const batch = ids.slice(i, i + 1000);
        try {
            await ns.deleteMany(batch);
        } catch (err) {
            await ns.deleteMany({ ids: batch }); // fallback if this SDK version wants an object
        }
    }
}

module.exports = { upsertChunks, queryChunks, deleteDocumentChunks };