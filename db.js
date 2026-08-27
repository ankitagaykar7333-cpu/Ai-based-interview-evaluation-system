const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Create database directory if it doesn't exist just in case
const dbDir = path.dirname(__filename);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Connect to the SQLite file
const dbPath = path.join(__dirname, 'app.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening SQLite database:', err.message);
    } else {
        console.log('Connected to the SQLite database internally.');
        
        db.serialize(() => {
            // Create Users table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )`, (err) => {
                if (err) {
                    console.error("Error creating users table", err);
                } else {
                    console.log("Users table initialized.");
                }
            });
            
            // Create Interview Results table
            db.run(`CREATE TABLE IF NOT EXISTS interview_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                candidate_name TEXT NOT NULL,
                score INTEGER,
                total INTEGER,
                hired BOOLEAN,
                timestamp TEXT,
                user_id INTEGER,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`, (err) => {
                if (err) {
                    console.error("Error creating interview_results table", err);
                } else {
                    console.log("Interview results table initialized.");
                }
            });

            // Create Login History table
            db.run(`CREATE TABLE IF NOT EXISTS login_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`, (err) => {
                if (err) {
                    console.error("Error creating login_history table", err);
                } else {
                    console.log("Login history table initialized.");
                }
            });
        });
    }
});

// Helper function to insert a user (Promise based)
function createUser(username, password) {
    return new Promise((resolve, reject) => {
        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, password], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, username });
            }
        });
    });
}

// Helper function to get a user
function getUser(username, password) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row); // returns undefined if not found
            }
        });
    });
}

// Helper function to save a result
function saveResult(candidate_name, score, total, hired, timestamp, user_id = null) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO interview_results (candidate_name, score, total, hired, timestamp, user_id) 
             VALUES (?, ?, ?, ?, ?, ?)`,
             [candidate_name, score, total, hired, timestamp, user_id],
             function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
             }
        );
    });
}

// Helper function to log login/logout history
function logHistory(user_id, action) {
    const timestamp = new Date().toISOString();
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO login_history (user_id, action, timestamp) VALUES (?, ?, ?)`,
            [user_id, action, timestamp],
            function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            }
        );
    });
}

module.exports = {
    db,
    createUser,
    getUser,
    saveResult,
    logHistory
};
