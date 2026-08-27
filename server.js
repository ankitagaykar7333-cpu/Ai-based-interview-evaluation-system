const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_FILE = path.join(__dirname, 'data', 'interviews.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    if (!fs.existsSync(path.dirname(DATA_FILE))) {
        fs.mkdirSync(path.dirname(DATA_FILE));
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// Endpoint to simulate AI evaluation
// In a real scenario, this would call OpenAI API or Gemini API
app.post('/api/evaluate', async (req, res) => {
    const { question, answer } = req.body;
    
    // Mock AI Evaluation Logic
    // Can be replaced with real LLM endpoint (e.g., fetch('https://api.openai.com/v1/...'))
    console.log(`Evaluating answer for: "${question}"`);
    
    // Basic scoring logic: looking for simple heuristics
    let isCorrect = false;
    let feedback = "Answer lacked sufficient technical depth.";
    
    if (answer && answer.length > 20) {
        // A real AI would perform semantic checking here.
        // For our mock, we just give credit if the answer is reasonably long.
        isCorrect = true;
        feedback = "Good technical understanding demonstrated.";
    }

    // Delay to simulate network/AI processing time
    setTimeout(() => {
        res.json({ isCorrect, feedback });
    }, 1000);
});

// Endpoint to save interview results
app.post('/api/results', (req, res) => {
    const resultData = req.body;
    resultData.id = Date.now().toString();
    resultData.timestamp = new Date().toISOString();
    
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        const interviews = JSON.parse(rawData);
        interviews.push(resultData);
        fs.writeFileSync(DATA_FILE, JSON.stringify(interviews, null, 2));
        res.json({ success: true, message: "Interview saved successfully." });
    } catch (err) {
        console.error("Error saving data:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Admin endpoint to GET all results
app.get('/api/admin/results', (req, res) => {
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        res.json(JSON.parse(rawData));
    } catch (err) {
        console.error("Error reading data:", err);
        res.status(500).json({ error: "Failed to load data" });
    }
});

// Admin endpoint to DELETE a result by id
app.delete('/api/admin/results/:id', (req, res) => {
    try {
        const rawData = fs.readFileSync(DATA_FILE, 'utf8');
        let interviews = JSON.parse(rawData);
        
        const targetId = decodeURIComponent(req.params.id);
        const initialLength = interviews.length;
        interviews = interviews.filter(interview => interview.id !== targetId && interview.timestamp !== targetId);
        
        if (interviews.length === initialLength) {
            return res.status(404).json({ success: false, error: "Record not found" });
        }

        fs.writeFileSync(DATA_FILE, JSON.stringify(interviews, null, 2));
        res.json({ success: true, message: "Record deleted successfully." });
    } catch (err) {
        console.error("Error deleting data:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running beautifully on http://localhost:${PORT}`);
});
// In-memory users (temporary storage)
let users = [];

// REGISTER API
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ success: false, error: "Missing fields" });
    }

    const userExists = users.find(u => u.username === username);
    if (userExists) {
        return res.json({ success: false, error: "User already exists" });
    }

    const newUser = {
        id: users.length + 1,
        username,
        password
    };

    users.push(newUser);

    res.json({ success: true });
});

// LOGIN API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    const user = users.find(
        u => u.username === username && u.password === password
    );

    if (user) {
        res.json({ success: true, user });
    } else {
        res.json({ success: false, error: "Invalid credentials" });
    }
});

// LOGOUT API
app.post('/api/logout', (req, res) => {
    res.json({ success: true });
});