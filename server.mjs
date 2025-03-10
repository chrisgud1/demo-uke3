import express from 'express';
import HTTP_CODES from './utils/httpCodes.mjs';
import deckManager from './utils/deckManager.mjs';
import { createLogger, LOGG_LEVELS } from './modules/log.mjs';
import fs from 'node:fs/promises';
import { createRateLimiter } from './modules/rateLimiter.mjs';

const ENABLE_LOGGING = true;
const server = express();

// Update port to use Render's default if no environment variable is set
const port = process.env.PORT || 10000; // Changed from 8000 to 10000 for Render

// Create logs directory if it doesn't exist
try {
    await fs.mkdir('./logs', { recursive: true });
} catch (error) {
    console.error('Error creating logs directory:', error);
}

const logger = createLogger(LOGG_LEVELS.VERBOSE);

// Add logger middleware before other middleware
server.use(logger);

// Set the port before using it
server.set('port', port);

const rateLimiter = createRateLimiter();

// Apply rate limiting to ALL endpoints, not just deck endpoints
server.use(rateLimiter);

// Global middleware
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(express.static('public'));

// Collection of poems
const poems = [
    {
        title: "The Road Not Taken",
        author: "Robert Frost",
        text: "Two roads diverged in a yellow wood,\nAnd sorry I could not travel both\nAnd be one traveler, long I stood\nAnd looked down one as far as I could\nTo where it bent in the undergrowth;"
    },
    {
        title: "Annabel Lee",
        author: "Edgar Allan Poe", 
        text: "It was many and many a year ago,\nIn a kingdom by the sea,\nThat a maiden there lived whom you may know\nBy the name of Annabel Lee;"
    },
    {
        title: "Hope is the thing with feathers",
        author: "Emily Dickinson",
        text: "Hope is the thing with feathers\nThat perches in the soul,\nAnd sings the tune without the words,\nAnd never stops at all,"
    }
];

// Collection of quotes - add near the top with other data collections
const quotes = [
    {
        text: "Be the change you wish to see in the world",
        author: "Mahatma Gandhi"
    },
    {
        text: "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe",
        author: "Albert Einstein"
    },
    {
        text: "I have not failed. I've just found 10,000 ways that won't work",
        author: "Thomas A. Edison"
    },
    {
        text: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment",
        author: "Ralph Waldo Emerson"
    },
    {
        text: "The only way to do great work is to love what you do",
        author: "Steve Jobs"
    }
];

function getRoot(_req, res) {
    res.status(HTTP_CODES.SUCCESS.OK).send('Hello World').end();
}

// Route handler functions
function handleDrawCard(req, res) {
    const card = deckManager.drawCard(req.params.deck_id);
    if (card) {
        res.locals.card = card;
        res.status(HTTP_CODES.SUCCESS.OK).json({ 
            card: card,
            suit: card.suit,
            value: card.value
        });
    } else {
        res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({ 
            error: 'Deck not found or empty' 
        });
    }
}

function handleGetPoem(_req, res) {
    const randomIndex = Math.floor(Math.random() * poems.length);
    const poem = poems[randomIndex];
    
    res.locals.poem = poem.title;
    res.status(HTTP_CODES.SUCCESS.OK).json({
        title: poem.title,
        author: poem.author,
        text: poem.text
    });
}

function handleGetQuote(_req, res) {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const quote = quotes[randomIndex];
    
    res.locals.quote = quote.text;
    res.status(HTTP_CODES.SUCCESS.OK).json({
        text: quote.text,
        author: quote.author
    });
}

function handleCreateDeck(_req, res) {
    try {
        const deckId = deckManager.createDeck();
        res.locals.deck_id = deckId;
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
}

function handleShuffleDeck(req, res) {
    const success = deckManager.shuffleDeck(req.params.deck_id);
    if (success) {
        res.status(HTTP_CODES.SUCCESS.OK).json({ message: 'Deck shuffled successfully' });
    } else {
        res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({ error: 'Deck not found' });
    }
}

function handleGetDeck(req, res) {
    const deck = deckManager.getDeck(req.params.deck_id);
    if (deck) {
        res.status(HTTP_CODES.SUCCESS.OK).json({ cards: deck });
    } else {
        res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({ error: 'Deck not found' });
    }
}

function handleSum(req, res) {
    try {
        const a = parseInt(req.params.a);
        const b = parseInt(req.params.b);
        
        if (isNaN(a) || isNaN(b)) {
            res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({
                error: 'Parameters must be numbers'
            });
            return;
        }
        
        const sum = a + b;
        res.locals.sum = sum;
        
        res.status(HTTP_CODES.SUCCESS.OK).json({
            sum: sum,
            a: a,
            b: b
        });
    } catch (error) {
        res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({
            error: 'Failed to calculate sum'
        });
    }
}

// Root endpoint handler
function handleRoot(_req, res) {
    res.status(HTTP_CODES.SUCCESS.OK).json({
        message: "Hello World"
    });
}

// Route definitions
server.get("/", handleRoot);  // Root endpoint
server.post('/temp/deck', handleCreateDeck);
server.patch('/temp/deck/shuffle/:deck_id', handleShuffleDeck);
server.get('/temp/deck/:deck_id', handleGetDeck);
server.get('/temp/deck/:deck_id/card', handleDrawCard);
server.get('/temp/poem', handleGetPoem);
server.get('/temp/quote', handleGetQuote);
server.post('/temp/sum/:a/:b', handleSum);

server.listen(port, () => {
    console.log('server running on port', port);
});