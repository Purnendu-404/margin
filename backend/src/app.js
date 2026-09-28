const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');

const documentsRouter = require('./routes/documents');

const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const uploadRouter = require('./routes/upload');
const queryRouter = require('./routes/query');

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/health', healthRouter);
app.use('/auth', authRouter);
app.use('/upload', uploadRouter);
app.use('/query', queryRouter);
app.use('/documents', documentsRouter);

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Max size is 10MB.' });
    }
    next(err);
});

module.exports = app;