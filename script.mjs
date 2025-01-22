import express from 'express';
import HTTP_CODES from './utils/httpCodes.mjs';
import deckManager from './utils/deckManager.mjs';

const server = express();
const port = (process.env.PORT || 8000);

server.set('port', port);
server.use(express.static('public'));

function getRoot(req, res, next) {
    res.status(HTTP_CODES.SUCCESS.OK).send('Hello World').end();
}

server.get("/", getRoot);

// Create new deck
server.post('/temp/deck', (req, res) => {
    const deckId = deckManager.createDeck();
    res.status(HTTP_CODES.SUCCESS.OK).json({ deck_id: deckId });
});

// Shuffle deck
server.patch('/temp/deck/shuffle/:deck_id', (req, res) => {
    const success = deckManager.shuffleDeck(req.params.deck_id);
    if (success) {
        res.status(HTTP_CODES.SUCCESS.OK).json({ message: 'Deck shuffled successfully' });
    } else {
        res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({ error: 'Deck not found' });
    }
});

// Get deck
server.get('/temp/deck/:deck_id', (req, res) => {
    const deck = deckManager.getDeck(req.params.deck_id);
    if (deck) {
        res.status(HTTP_CODES.SUCCESS.OK).json({ cards: deck });
    } else {
        res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({ error: 'Deck not found' });
    }
});

// Draw card
server.get('/temp/deck/:deck_id/card', (req, res) => {
    const card = deckManager.drawCard(req.params.deck_id);
    if (card) {
        res.status(HTTP_CODES.SUCCESS.OK).json({ card: card });
    } else {
        res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({ error: 'Deck not found or empty' });
    }
});

server.listen(server.get('port'), function () {
    console.log('server running', server.get('port'));
});