import rateLimit from 'express-rate-limit';
import HTTP_CODES from './httpCodes.mjs';

// Rate limiting middleware
export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});

// Deck ID validation middleware
export const validateDeckId = (req, res, next) => {
    const deckId = req.params.deck_id;
    if (!deckId || !/^\d+$/.test(deckId)) {
        return res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND)
                 .json({ error: 'Invalid deck ID format' });
    }
    next();
};

// Request timing middleware
export const requestTimer = (req, res, next) => {
    req.requestTime = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - req.requestTime;
        res.set('X-Response-Time', `${duration}ms`);
    });
    next();
};