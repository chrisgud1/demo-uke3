import express from 'express';
import HTTP_CODES from './utils/httpCodes.mjs';
import deckManager from './utils/deckManager.mjs';
import { rateLimiter, validateDeckId, requestTimer } from './utils/middleware.mjs';

const server = express();
const port = process.env.PORT || 8000;

// Set the port before using it
server.set('port', port);

// Global middleware
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(express.static('public'));
server.use(requestTimer);
server.use('/temp/deck', rateLimiter);

function getRoot(req, res, next) {
    res.status(HTTP_CODES.SUCCESS.OK).send('Hello World').end();
}

server.get("/", getRoot);

// Define POST endpoint for deck creation
server.post('/temp/deck', rateLimiter, (req, res) => {
    try {
        const deckId = deckManager.createDeck();
        res.status(HTTP_CODES.SUCCESS.OK).json({ 
            deck_id: deckId,
            success: true 
        });
    } catch (error) {
        res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({ 
            error: 'Failed to create deck',
            success: false 
        });
    }
});

// Shuffle deck
server.patch('/temp/deck/shuffle/:deck_id', validateDeckId, (req, res) => {
    const success = deckManager.shuffleDeck(req.params.deck_id);
    if (success) {
        res.status(HTTP_CODES.SUCCESS.OK).json({ message: 'Deck shuffled successfully' });
    } else {
        res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({ error: 'Deck not found' });
    }
});

// Get deck
server.get('/temp/deck/:deck_id', validateDeckId, (req, res) => {
    const deck = deckManager.getDeck(req.params.deck_id);
    if (deck) {
        res.status(HTTP_CODES.SUCCESS.OK).json({ cards: deck });
    } else {
        res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({ error: 'Deck not found' });
    }
});

// Draw card
server.get('/temp/deck/:deck_id/card', validateDeckId, (req, res) => {
    const card = deckManager.drawCard(req.params.deck_id);
    if (card) {
        res.status(HTTP_CODES.SUCCESS.OK).json({ card: card });
    } else {
        res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({ error: 'Deck not found or empty' });
    }
});

server.listen(port, () => {
    console.log('server running on port', port);
});