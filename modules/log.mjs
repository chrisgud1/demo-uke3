import fs from 'node:fs/promises';

// 1. Log levels
export const LOGG_LEVELS = {
    VERBOSE: 1,
    IMPORTANT: 2,
    ALWAYS: 3
};

// 2. Configuration
let currentLogLevel = LOGG_LEVELS.VERBOSE;
const LOG_FILE = './logs/log.csv';

// 3. Utility functions
const formatCard = (card) => {
    const symbols = {
        hearts: '♥',
        diamonds: '♦',
        clubs: '♣',
        spades: '♠'
    };
    return `${card.value}${symbols[card.suit]}`;
};

const getLogDetails = (req, res) => {
    let details = '';
    
    if (req.method === 'POST' && res.locals.deck_id) {
        details = ` |DECK:${res.locals.deck_id}`;
    } else if (req.url.includes('/card') && res.locals.card) {
        details = ` |CARD:${formatCard(res.locals.card)}`;
    } else if (req.url.includes('shuffle')) {
        details = ' |SHUFFLED';
    }
    return details;
};

// 4. Log writing
const writeLog = async (entry) => {
    try {
        await fs.appendFile(LOG_FILE, entry + '\n');
    } catch (error) {
        console.error('Failed to write log:', error);
    }
};

// 5. Main logging function
const logRequest = async (req, res) => {
    if (req.url.match(/\.(html|css|js|png|jpg|jpeg|gif)$/)) {
        return; // Skip static files
    }

    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const status = res.statusCode;
    const details = getLogDetails(req, res);

    const logEntry = `${timestamp}|${method}|${url}|${status}${details}`;
    console.log(logEntry);
    await writeLog(logEntry);
};

// 6. Express middleware factory (only export this)
export function createLogger(level = LOGG_LEVELS.VERBOSE) {
    currentLogLevel = level;
    
    return (req, res, next) => {
        res.on('finish', () => {
            logRequest(req, res).catch(err => 
                console.error('Logging failed:', err)
            );
        });
        next();
    };
}