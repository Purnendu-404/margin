const CHUNK_SIZE = 300; // words
const OVERLAP = 50;     // words

// For typed PDFs: word-window chunks with overlap (flattens whitespace)
function chunkText(text) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const chunks = [];
    let i = 0;

    while (i < words.length) {
        chunks.push(words.slice(i, i + CHUNK_SIZE).join(' '));
        if (i + CHUNK_SIZE >= words.length) break;
        i += CHUNK_SIZE - OVERLAP;
    }

    return chunks;
}

// Keeps line breaks (needed for ASCII diagrams); only splits when a page is long
function splitKeepingLines(body, maxWords = 350) {
    const out = [];
    let cur = [];
    let count = 0;

    for (const line of body.split('\n')) {
        const w = line.trim().split(/\s+/).filter(Boolean).length;
        if (count + w > maxWords && cur.length) {
            out.push(cur.join('\n').trim());
            cur = [];
            count = 0;
        }
        cur.push(line);
        count += w;
    }
    if (cur.join('').trim()) out.push(cur.join('\n').trim());
    return out;
}

// For handwritten transcripts: one chunk per page, prefixed with its page number
function chunkTranscript(text) {
    const parts = text.split(/^## Page (\d+)[ \t]*$/m);
    const chunks = [];

    for (let i = 1; i < parts.length; i += 2) {
        const body = (parts[i + 1] || '').trim();
        if (!body) continue;
        for (const piece of splitKeepingLines(body)) {
            chunks.push(`[Page ${parts[i]}]\n${piece}`);
        }
    }
    return chunks;
}

function chunkDocument(text) {
    if (/^## Page \d+[ \t]*$/m.test(text)) {
        const chunks = chunkTranscript(text);
        if (chunks.length) return chunks;
    }
    return chunkText(text);
}

module.exports = { chunkText, chunkDocument };