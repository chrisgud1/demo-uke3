// utils/deckManager.mjs
class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
    }
}

class DeckManager {
    constructor() {
        this.decks = new Map();
    }

    createDeck() {
        try {
            const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
            const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
            const deck = [];
            
            for (const suit of suits) {
                for (const value of values) {
                    deck.push(new Card(suit, value));
                }
            }
            
            const deckId = Date.now().toString();
            this.decks.set(deckId, deck);
            return deckId;
        } catch (error) {
            console.error('Error creating deck:', error);
            throw error;
        }
    }

    shuffleDeck(deckId) {
        const deck = this.decks.get(deckId);
        if (!deck) return false;
        
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return true;
    }

    getDeck(deckId) {
        return this.decks.get(deckId);
    }

    drawCard(deckId) {
        const deck = this.decks.get(deckId);
        if (!deck || deck.length === 0) return null;
        return deck.pop();
    }
}

export default new DeckManager();