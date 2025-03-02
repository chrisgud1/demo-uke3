const express = require('express');
const app = express();

app.use(express.static('public'));

class DeckClient {
    constructor() {
        this.currentDeckId = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('createDeck').addEventListener('click', () => this.createDeck());
        document.getElementById('shuffleDeck').addEventListener('click', () => this.shuffleDeck());
        document.getElementById('drawCard').addEventListener('click', () => this.drawCard());
    }

    async createDeck() {
        try {
            const response = await fetch('/temp/deck', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.deck_id) {
                this.currentDeckId = data.deck_id;
                document.getElementById('currentDeckId').textContent = this.currentDeckId;
                document.getElementById('shuffleDeck').disabled = false;
                document.getElementById('drawCard').disabled = false;
            } else {
                throw new Error('Invalid server response');
            }
        } catch (error) {
            console.error('Error creating deck:', error);
            document.getElementById('currentDeckId').textContent = 'Error creating deck';
        }
    }

    async shuffleDeck() {
        if (!this.currentDeckId) return;
        try {
            await fetch(`/temp/deck/shuffle/${this.currentDeckId}`, { method: 'PATCH' });
            alert('Deck shuffled successfully!');
        } catch (error) {
            console.error('Error shuffling deck:', error);
        }
    }

    async drawCard() {
        if (!this.currentDeckId) return;
        try {
            const response = await fetch(`/temp/deck/${this.currentDeckId}/card`);
            const data = await response.json();
            if (data.card) {
                this.displayCard(data.card);
            }
        } catch (error) {
            console.error('Error drawing card:', error);
        }
    }

    displayCard(card) {
        const cardDisplay = document.getElementById('cardDisplay');
        const cardElement = document.createElement('div');
        cardElement.className = `card ${card.suit}`;
        
        const suitSymbol = {
            'hearts': '♥',
            'diamonds': '♦',
            'clubs': '♣',
            'spades': '♠'
        };

        cardElement.textContent = `${card.value}${suitSymbol[card.suit]}`;
        cardDisplay.innerHTML = '';
        cardDisplay.appendChild(cardElement);
    }
}

// Initialize the client when the page loads
new DeckClient();