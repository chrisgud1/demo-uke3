import express from 'express';
import HTTP_CODES from './utils/httpCodes.mjs';
import deckManager from './utils/deckManager.mjs';
import { createLogger, LOGG_LEVELS } from './modules/log.mjs';
import fs from 'node:fs/promises';
import { createRateLimiter } from './modules/rateLimiter.mjs';
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

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

// Add this function to server.mjs (near the logs directory creation)
async function ensureIconsExist() {
  const iconsDir = './Public/icons';
  try {
    await fs.mkdir(iconsDir, { recursive: true });
    console.log('Icons directory exists or was created');
  } catch (error) {
    console.error('Error ensuring icons directory:', error);
  }
}

// Call this function before starting the server
await ensureIconsExist();

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

// Add explicit MIME type handling
server.use((req, res, next) => {
  if (req.url.endsWith('.js')) {
    res.type('application/javascript');
  } else if (req.url.endsWith('.css')) {
    res.type('text/css');
  } else if (req.url.endsWith('.json')) {
    res.type('application/json');
  } else if (req.url.endsWith('.svg')) {
    res.type('image/svg+xml');
  } else if (req.url.endsWith('.png')) {
    res.type('image/png');
  }
  next();
});

// Place this BEFORE your static middleware
server.use(express.static('Public')); // Note the uppercase 'P'

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

const sequelize = new Sequelize(process.env.DB_URL, {
    dialect: 'sqlite',
    storage: 'db.sqlite',
    logging: false
});

sequelize
.sync()
.then(() => {
    console.log('Database connected')
})
.catch((err) => {
    console.log(err)
});

// Define Deck model
const Deck = sequelize.define('Deck', {
  id: {
    type: Sequelize.STRING,
    primaryKey: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
    defaultValue: 'My Deck'
  },
  cards: {
    type: Sequelize.TEXT, // Store serialized cards
    allowNull: false
  },
  shuffled: {
    type: Sequelize.BOOLEAN,
    defaultValue: false
  },
  cardsRemaining: {
    type: Sequelize.INTEGER
  }
});

// Database CRUD handler functions
async function handleSaveDeck(req, res) {
  try {
    const deckId = req.params.deck_id;
    const deck = deckManager.getDeck(deckId);
    
    if (!deck) {
      return res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({ 
        error: 'Deck not found'
      });
    }
    
    // Create or update deck in database
    const [dbDeck, created] = await Deck.findOrCreate({
      where: { id: deckId },
      defaults: {
        name: req.body.name || 'My Deck',
        cards: JSON.stringify(deck),
        cardsRemaining: deck.length,
        shuffled: req.body.shuffled || false
      }
    });
    
    // If deck already exists, update it
    if (!created) {
      await dbDeck.update({
        cards: JSON.stringify(deck),
        cardsRemaining: deck.length,
        shuffled: req.body.shuffled || dbDeck.shuffled,
        name: req.body.name || dbDeck.name
      });
    }
    
    res.status(HTTP_CODES.SUCCESS.OK).json({
      success: true,
      deckId: deckId,
      created: created
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({
      error: 'Failed to save deck to database'
    });
  }
}

async function handleGetSavedDecks(req, res) {
  try {
    const decks = await Deck.findAll({
      attributes: ['id', 'name', 'cardsRemaining', 'shuffled', 'createdAt']
    });
    
    res.status(HTTP_CODES.SUCCESS.OK).json({
      success: true,
      decks: decks
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({
      error: 'Failed to retrieve decks from database'
    });
  }
}

async function handleGetSavedDeck(req, res) {
  try {
    const deckId = req.params.deck_id;
    const dbDeck = await Deck.findByPk(deckId);
    
    if (!dbDeck) {
      return res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({ 
        error: 'Deck not found in database'
      });
    }
    
    // Load the deck from the database into memory if needed
    if (!deckManager.getDeck(deckId)) {
      const cards = JSON.parse(dbDeck.cards);
      deckManager.decks.set(deckId, cards);
    }
    
    res.status(HTTP_CODES.SUCCESS.OK).json({
      success: true,
      deck: {
        id: dbDeck.id,
        name: dbDeck.name,
        cardsRemaining: dbDeck.cardsRemaining,
        shuffled: dbDeck.shuffled,
        createdAt: dbDeck.createdAt
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({
      error: 'Failed to retrieve deck from database'
    });
  }
}

async function handleUpdateDeckName(req, res) {
  try {
    const deckId = req.params.deck_id;
    const { name } = req.body;
    
    if (!name) {
      return res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({
        error: 'Name is required'
      });
    }
    
    const dbDeck = await Deck.findByPk(deckId);
    
    if (!dbDeck) {
      return res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({ 
        error: 'Deck not found in database'
      });
    }
    
    await dbDeck.update({ name });
    
    res.status(HTTP_CODES.SUCCESS.OK).json({
      success: true,
      deck: {
        id: dbDeck.id,
        name: dbDeck.name
      }
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({
      error: 'Failed to update deck name'
    });
  }
}

async function handleDeleteDeck(req, res) {
  try {
    const deckId = req.params.deck_id;
    const dbDeck = await Deck.findByPk(deckId);
    
    if (!dbDeck) {
      return res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({ 
        error: 'Deck not found in database'
      });
    }
    
    await dbDeck.destroy();
    
    // Also remove from memory
    deckManager.decks.delete(deckId);
    
    res.status(HTTP_CODES.SUCCESS.OK).json({
      success: true,
      message: `Deck ${deckId} deleted successfully`
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(HTTP_CODES.CLIENT_ERROR.NOT_FOUND).json({
      error: 'Failed to delete deck'
    });
  }
}

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

// Root endpoint handler - update to serve the index.html file
function handleRoot(req, res) {
    // Serve the index.html file rather than sending JSON
    res.sendFile('index.html', { root: './Public' });
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

// Add to server.mjs after your other routes
// Fallback route for missing icons to avoid 404s
server.get('/icons/:iconName', (req, res) => {
  // Try to serve the requested icon
  const iconPath = `./Public/icons/${req.params.iconName}`;
  fs.access(iconPath)
    .then(() => {
      // Icon exists, serve it
      res.sendFile(req.params.iconName, { root: './Public/icons' });
    })
    .catch(() => {
      // Icon doesn't exist, serve template SVG instead
      res.sendFile('icon-template.svg', { root: './Public/icons' });
    });
});

server.post('/api/decks/:deck_id/save', handleSaveDeck);
server.get('/api/decks', handleGetSavedDecks);
server.get('/api/decks/:deck_id', handleGetSavedDeck);
server.patch('/api/decks/:deck_id', handleUpdateDeckName);
server.delete('/api/decks/:deck_id', handleDeleteDeck);

server.listen(port, () => {
    console.log('server running on port', port);
});