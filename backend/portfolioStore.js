import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'portfolio_db.json');

// Helper to ensure database file exists
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify({ transactions: [] }, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to initialize database file:', error);
    }
  }
}

// Read database
function readDb() {
  initDb();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading database file, returning empty state:', error);
    return { transactions: [] };
  }
}

// Write database
function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to write database file:', error);
    return false;
  }
}

// Get all transactions
export function getTransactions() {
  const db = readDb();
  return db.transactions || [];
}

// Add transaction
export function addTransaction({ symbol, type, quantity, price, date }) {
  if (!symbol || !type || !quantity || !price || !date) {
    throw new Error('Missing transaction details');
  }

  const cleanSymbol = symbol.toUpperCase().trim();
  const cleanType = type.toUpperCase().trim();
  if (cleanType !== 'BUY' && cleanType !== 'SELL') {
    throw new Error('Transaction type must be BUY or SELL');
  }

  const parsedQty = parseFloat(quantity);
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    throw new Error('Quantity must be a positive number');
  }
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    throw new Error('Price must be a positive number');
  }

  const db = readDb();
  const newTransaction = {
    id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
    symbol: cleanSymbol,
    type: cleanType,
    quantity: parsedQty,
    price: parsedPrice,
    date: date, // YYYY-MM-DD
    createdAt: new Date().toISOString()
  };

  db.transactions.push(newTransaction);
  writeDb(db);
  return newTransaction;
}

// Delete transaction
export function deleteTransaction(id) {
  if (!id) {
    throw new Error('Transaction ID is required');
  }

  const db = readDb();
  const initialCount = db.transactions.length;
  db.transactions = db.transactions.filter(t => t.id !== id);
  
  if (db.transactions.length === initialCount) {
    return false; // Not found
  }

  writeDb(db);
  return true;
}
