import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'portfolio_db.json');

// Helper to ensure database file exists
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], transactions: [] }, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to initialize database file:', error);
    }
  } else {
    // Make sure both arrays exist
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      const db = JSON.parse(data);
      let updated = false;
      if (!db.users) {
        db.users = [];
        updated = true;
      }
      if (!db.transactions) {
        db.transactions = [];
        updated = true;
      }
      if (updated) {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
      }
    } catch (err) {
      console.error('Failed to parse and verify database file:', err);
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
    return { users: [], transactions: [] };
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

// ==========================================
// USER DB OPERATIONS
// ==========================================

export async function createUser({ email, password }) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const cleanEmail = email.toLowerCase().trim();
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  const db = readDb();
  
  // Check if email already exists
  const existingUser = db.users.find(u => u.email === cleanEmail);
  if (existingUser) {
    throw new Error('Email is already registered');
  }

  // Hash password securely
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

  const newUser = {
    id: userId,
    email: cleanEmail,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  // Auto-migration: If this is the FIRST user, assign any orphan transactions to them
  const isFirstUser = db.users.length === 0;
  let migratedCount = 0;
  if (isFirstUser && db.transactions) {
    db.transactions = db.transactions.map(t => {
      if (!t.userId) {
        migratedCount++;
        return { ...t, userId };
      }
      return t;
    });
  }

  db.users.push(newUser);
  writeDb(db);

  if (migratedCount > 0) {
    console.log(`[MIGRATION] Automatically migrated ${migratedCount} existing transactions to the first user: ${cleanEmail}`);
  }

  return { id: newUser.id, email: newUser.email };
}

export function findUserByEmail(email) {
  if (!email) return null;
  const db = readDb();
  return db.users.find(u => u.email === email.toLowerCase().trim()) || null;
}

export function findUserById(id) {
  if (!id) return null;
  const db = readDb();
  const user = db.users.find(u => u.id === id) || null;
  if (user) {
    return { id: user.id, email: user.email };
  }
  return null;
}

// ==========================================
// TRANSACTION DB OPERATIONS (FILTERED BY USER)
// ==========================================

export function getTransactions(userId) {
  if (!userId) {
    throw new Error('User ID is required to fetch transactions');
  }
  const db = readDb();
  return (db.transactions || []).filter(t => t.userId === userId);
}

export function addTransaction({ userId, symbol, type, quantity, price, date }) {
  if (!userId) {
    throw new Error('User ID is required');
  }
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
    userId: userId, // associate transaction with user
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

export function deleteTransaction(userId, id) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  if (!id) {
    throw new Error('Transaction ID is required');
  }

  const db = readDb();
  const initialCount = db.transactions.length;
  
  // Find the transaction to verify ownership
  const tx = db.transactions.find(t => t.id === id);
  if (!tx) {
    return false; // Not found
  }
  if (tx.userId !== userId) {
    throw new Error('Unauthorized to delete this transaction');
  }

  db.transactions = db.transactions.filter(t => t.id !== id);
  writeDb(db);
  return true;
}
