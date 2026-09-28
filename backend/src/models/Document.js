const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, required: true },
    pineconeDocumentId: { type: String, required: true },
    status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' },
    source: { type: String, enum: ['text', 'handwritten'], default: 'text' },
    error: { type: String, default: '' },
    text: { type: String, select: false }, // full extracted text, only loaded when asked for
    chunkCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);