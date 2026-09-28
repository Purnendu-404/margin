const pdfParse = require('pdf-parse'); // keep pdf-parse@1.1.1

async function extractTextFromPdf(buffer) {
    const data = await pdfParse(buffer);
    return { text: data.text || '', numPages: data.numpages || 0 };
}

module.exports = { extractTextFromPdf };