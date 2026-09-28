const express = require('express');
const mongoose = require('mongoose');
const requireAuth = require('../middleware/auth');
const Document = require('../models/Document');
const Conversation = require('../models/Conversation');
const { chunkDocument } = require('../services/chunker');
const { embedChunks } = require('../services/embeddings');
const { upsertChunks, deleteDocumentChunks } = require('../services/vectorStore');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
    const docs = await Document.find({ userId: req.userId })
        .select('filename status error source createdAt')
        .sort({ createdAt: -1 });
    res.json(docs);
});

router.get('/:id/messages', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ error: 'Invalid id' });
    }
    const convo = await Conversation.findOne({ documentId: req.params.id, userId: req.userId });
    if (convo) return res.json(convo.messages);

    // no conversation yet (e.g. still processing): fine if the document is yours
    const owned = await Document.exists({ _id: req.params.id, userId: req.userId });
    if (!owned) return res.status(404).json({ error: 'Document not found' });
    res.json([]);
});

// Rebuild vectors from the stored text (use after changing chunk size)
router.post('/:id/reindex', async (req, res) => {
    let doc;
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: 'Invalid id' });
        }
        doc = await Document.findOne({ _id: req.params.id, userId: req.userId }).select('+text');
        if (!doc) return res.status(404).json({ error: 'Document not found' });
        if (!doc.text) {
            return res.status(400).json({ error: 'No stored text for this document. Upload it again.' });
        }

        doc.status = 'processing';
        await doc.save();

        await deleteDocumentChunks(req.userId, doc.pineconeDocumentId, doc.chunkCount);

        const chunks = chunkDocument(doc.text);
        const embeddings = await embedChunks(chunks);
        await upsertChunks(req.userId, doc.pineconeDocumentId, chunks, embeddings);

        doc.chunkCount = chunks.length;
        doc.status = 'ready';
        doc.error = '';
        await doc.save();

        res.json({ id: doc._id, status: doc.status, chunkCount: chunks.length });
    } catch (err) {
        console.error(err);
        if (doc) {
            doc.status = 'failed';
            await doc.save();
        }
        res.status(500).json({ error: 'Re-index failed', details: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ error: 'Invalid id' });
        }
        const doc = await Document.findOne({ _id: req.params.id, userId: req.userId });
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        await deleteDocumentChunks(req.userId, doc.pineconeDocumentId, doc.chunkCount);
        await Conversation.deleteOne({ documentId: doc._id });
        await Document.deleteOne({ _id: doc._id });

        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Delete failed', details: err.message });
    }
});

module.exports = router;