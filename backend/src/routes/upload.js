const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const requireAuth = require('../middleware/auth');
const Document = require('../models/Document');
const Conversation = require('../models/Conversation');
const { extractTextFromPdf } = require('../services/pdfExtractor');
const { transcribeHandwrittenPdf } = require('../services/handwritingOcr');
const { chunkDocument } = require('../services/chunker');
const { embedChunks } = require('../services/embeddings');
const { upsertChunks } = require('../services/vectorStore');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(), // the PDF never touches disk
    limits: { fileSize: 100 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    },
});

// Runs in the background after the upload request has already been answered
async function processDocument(doc, userId, buffer) {
    try {
        let text = '';
        let numPages = 0;
        try {
            ({ text, numPages } = await extractTextFromPdf(buffer));
        } catch (e) {
            // pdf-parse can fail on scans; fall through to OCR
        }

        // very little text per page means the PDF is scanned or handwritten
        let source = 'text';
        if (text.trim().length / Math.max(numPages, 1) < 100) {
            text = await transcribeHandwrittenPdf(buffer);
            source = 'handwritten';
        }

        const chunks = chunkDocument(text);
        if (chunks.length === 0) {
            throw new Error('No readable text found in this PDF.');
        }

        const embeddings = await embedChunks(chunks);
        await upsertChunks(userId, doc.pineconeDocumentId, chunks, embeddings);

        doc.text = text;
        doc.source = source;
        doc.chunkCount = chunks.length;
        doc.status = 'ready';
        doc.error = '';
        await doc.save();
    } catch (err) {
        console.error(err);
        doc.status = 'failed';
        doc.error = err.message;
        await doc.save().catch(() => {});
    }
}

router.post('/', requireAuth, upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF uploaded' });
        }

        const doc = await Document.create({
            userId: req.userId,
            filename: req.file.originalname,
            pineconeDocumentId: crypto.randomUUID(),
            status: 'processing',
        });

        await Conversation.create({ userId: req.userId, documentId: doc._id, messages: [] });

        res.status(202).json({ id: doc._id, filename: doc.filename, status: doc.status });

        processDocument(doc, req.userId, req.file.buffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Upload failed', details: err.message });
    }
});

module.exports = router;