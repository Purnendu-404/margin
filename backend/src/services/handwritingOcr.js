const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const PROMPT = `You are transcribing a student's handwritten notes from a scanned PDF so they can be searched later.

Rules:
- Go page by page. Start every page with a line that is exactly: ## Page N (N is the page number in this PDF).
- Transcribe all handwriting and printed text faithfully. Keep headings, bullet points, numbering and line breaks. Write formulas in plain text or LaTeX.
- Do not summarize, correct, or add anything. If a word is unreadable, write [illegible]. Never guess.
- Tables: transcribe them as markdown tables.
- For every diagram, figure, graph or flowchart, insert this block where it appears:
[DIAGRAM]
Description: what it shows, every label on it, and how the parts connect (arrows, direction, groupings), in 1 to 3 sentences.
Sketch: a simple drawing made only of plain ASCII characters (+ - | > v ^ and letters), with boxes and arrows, on the lines below. Keep it under 60 characters wide.
[/DIAGRAM]
- Output only the transcription, with no commentary before or after.`;

async function transcribeHandwrittenPdf(buffer) {
    const response = await ai.models.generateContent({
        model: process.env.GEMINI_OCR_MODEL || 'gemini-2.5-flash',
        contents: [
            {
                role: 'user',
                parts: [
                    { inlineData: { mimeType: 'application/pdf', data: buffer.toString('base64') } },
                    { text: PROMPT },
                ],
            },
        ],
        config: { temperature: 0 },
    });

    const text = (response.text || '').trim();
    if (text.length < 20) {
        throw new Error('Could not read any text from this scan.');
    }
    return text;
}

module.exports = { transcribeHandwrittenPdf };