const express = require('express');
const mongoose = require('mongoose');
const requireAuth = require('../middleware/auth');
const Document = require('../models/Document');
const Conversation = require('../models/Conversation');
const { embedQuery } = require('../services/embeddings');
const { queryChunks } = require('../services/vectorStore');
const { generateResponse } = require('../services/llm');

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
    try {
        const { documentId, question } = req.body;

        if (!mongoose.isValidObjectId(documentId) || !question?.trim()) {
            return res.status(400).json({
                error: 'documentId and question are required'
            });
        }

        const doc = await Document.findOne({
            _id: documentId,
            userId: req.userId
        });

        if (!doc) {
            return res.status(404).json({
                error: 'Document not found'
            });
        }

        if (doc.status !== 'ready') {
            return res.status(409).json({
                error: 'Document is not ready yet'
            });
        }

        const conversation = await Conversation.findOne({
            documentId: doc._id,
            userId: req.userId
        });

        const queryEmbedding = await embedQuery(question);

        const matches = await queryChunks(
            req.userId,
            doc.pineconeDocumentId,
            queryEmbedding
        );

        const context = matches
            .map((m) => m.metadata.text)
            .join('\n\n---\n\n');

        // Last 20 messages only
        const history = conversation.messages.slice(-20);

        // Tell browser that we are streaming text
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Generate + stream response
        const answer = await generateResponse(
            question,
            context,
            history,
            res
        );

        // Save conversation AFTER Gemini finishes
        conversation.messages.push({
            role: 'user',
            text: question
        });

        conversation.messages.push({
            role: 'model',
            text: answer
        });

        await conversation.save();

        // Tell browser streaming is finished
        res.end();

    } catch (err) {
        console.error(err);

        if (!res.headersSent) {
            res.status(500).json({
                error: 'Failed to generate answer',
                details: err.message
            });
        } else {
            res.end();
        }
    }
});

module.exports = router;