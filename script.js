const questionsBank = [
    { question: "Introduce yourself" },
    { question: "Why do you want to work here?" },
    { question: "What are your strengths?" },
    { question: "What are your weaknesses?" },
    { question: "Why should we hire you?" },
    { question: "Where do you see yourself in 5 years?" },
    { question: "Tell me about a challenge you faced at work" },
    { question: "Why did you leave your last job? / Why do you want to switch?" },
    { question: "How do you handle stress or pressure?" },
    { question: "Do you have any questions for us?" }
];

let stream = null;
let currentQuestionIndex = 0;
let score = 0;
let recognition = null;
let isRecording = false;
let selectedQuestions = [];
let timerInterval = null;
const TIME_LIMIT = 120; // 2 minutes per question
let timeRemaining = TIME_LIMIT;
let candidateInfo = {};
let interviewAnswers = []; // Store question, answer, and feedback
let mediaRecorder = null;
let recordedChunks = [];
let cheatWarnings = 0;
const MAX_WARNINGS = 0;

const screens = {
    home: document.getElementById('home-screen'),
    register: document.getElementById('register-screen'),
    login: document.getElementById('login-screen'),
    welcome: document.getElementById('welcome-screen'),
    interview: document.getElementById('interview-screen'),
    result: document.getElementById('result-screen'),
    logout: document.getElementById('logout-screen')
};

const elements = {
    getStartedBtn: document.getElementById('get-started-btn'),
    registerForm: document.getElementById('register-form'),
    loginForm: document.getElementById('login-form'),
    candidateName: document.getElementById('candidate-name'),
    candidatePassword: document.getElementById('candidate-password'),
    loginName: document.getElementById('login-name'),
    loginPassword: document.getElementById('login-password'),
    goToLogin: document.getElementById('go-to-login'),
    goToRegister: document.getElementById('go-to-register'),
    startBtn: document.getElementById('start-btn'),
    video: document.getElementById('user-video'),
    questionNumber: document.getElementById('question-number'),
    totalQuestions: document.getElementById('total-questions'),
    questionText: document.getElementById('question-text'),
    answerText: document.getElementById('answer-text'),
    recordBtn: document.getElementById('record-btn'),
    nextBtn: document.getElementById('next-btn'),
    recordingIndicator: document.getElementById('recording-indicator'),
    feedbackMsg: document.getElementById('feedback-msg'),
    resultTitle: document.getElementById('result-title'),
    resultStatus: document.getElementById('result-status'),
    resultDetails: document.getElementById('result-details'),
    restartBtn: document.getElementById('restart-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    loginAgainBtn: document.getElementById('login-again-btn'),
    timerDisplay: document.getElementById('timer-display')
};

function initSpeechRecognition() {
    window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (window.SpeechRecognition) {
        recognition = new window.SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript + ' ';
                }
            }
            if (finalTranscript) {
                elements.answerText.value += finalTranscript;
                elements.answerText.dispatchEvent(new Event('input'));
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            elements.feedbackMsg.textContent = "Speech recognition issue. You can continue by typing.";
            stopRecording();
        };

        recognition.onend = () => {
            if (isRecording) {
                try { recognition.start(); } catch(e) {}
            }
        };
    } else {
        elements.recordBtn.style.display = 'none';
        elements.feedbackMsg.textContent = "Speech recognition not supported. Please type your answer.";
    }
}

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;
    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

function showScreen(screenKey) {
    Object.values(screens).forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    
    screens[screenKey].style.display = 'flex';
    void screens[screenKey].offsetWidth; 
    screens[screenKey].classList.add('active');
}

async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        elements.video.srcObject = stream;
        
        // Initialize MediaRecorder to record the entire interview
        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const videoURL = URL.createObjectURL(blob);
            const playbackVideo = document.getElementById('playback-video');
            if (playbackVideo) {
                playbackVideo.src = videoURL;
            }
        };
        // Start recording
        mediaRecorder.start();
    } catch (err) {
        console.error("Error accessing camera/microphone: ", err);
        elements.feedbackMsg.textContent = "Could not access camera/microphone. Simulation continues without video.";
    }
}

function stopCamera() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

function toggleRecording() {
    if (!recognition) return;
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

function startRecording() {
    isRecording = true;
    try { recognition.start(); } catch(e) {}
    elements.recordBtn.innerHTML = "🛑 Stop Answering";
    elements.recordBtn.classList.add("recording-btn-active");
    elements.recordingIndicator.classList.add("visible");
    elements.feedbackMsg.textContent = '';
}

function stopRecording() {
    isRecording = false;
    if(recognition) {
        try { recognition.stop(); } catch(e) {}
    }
    elements.recordBtn.innerHTML = "🎤 Start Answering";
    elements.recordBtn.classList.remove("recording-btn-active");
    elements.recordingIndicator.classList.remove("visible");
}

function startTimer() {
    clearInterval(timerInterval);
    timeRemaining = TIME_LIMIT;
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            nextQuestion(); // Auto-advance when time is up
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
    const seconds = (timeRemaining % 60).toString().padStart(2, '0');
    elements.timerDisplay.textContent = `${minutes}:${seconds}`;
    
    if (timeRemaining <= 30) {
        elements.timerDisplay.classList.add('timer-warning');
    } else {
        elements.timerDisplay.classList.remove('timer-warning');
    }
}

function loadQuestion() {
    const q = selectedQuestions[currentQuestionIndex];
    elements.questionNumber.textContent = currentQuestionIndex + 1;
    elements.questionText.textContent = q.question;
    elements.answerText.value = '';
    elements.nextBtn.disabled = true;
    elements.feedbackMsg.textContent = '';
    
    elements.timerDisplay.classList.remove('timer-warning');
    startTimer();
    
    if(isRecording) stopRecording();
}

async function evaluateAnswer() {
    const answer = elements.answerText.value;
    const currentQ = selectedQuestions[currentQuestionIndex];
    elements.nextBtn.disabled = true;
    elements.nextBtn.textContent = 'Evaluating...';
    
    try {
        // Send answer to our Backend API
        const response = await fetch('/api/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: currentQ.question, answer: answer })
        });
        
        const data = await response.json();
        if (data.isCorrect) {
            score++;
        }
        
        interviewAnswers.push({
            question: currentQ.question,
            answer: answer || "(No answer provided)",
            isCorrect: data.isCorrect,
            feedback: data.feedback,
            grammarScore: data.grammarScore,
            communicationScore: data.communicationScore
        });
    } catch (err) {
        console.error("Evaluation error:", err);
    } finally {
        elements.nextBtn.textContent = 'Next Question';
    }
}

async function nextQuestion() {
    clearInterval(timerInterval);
    if (isRecording) stopRecording();
    
    await evaluateAnswer();
    
    if (currentQuestionIndex < selectedQuestions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    } else {
        endInterview();
    }
}

async function endInterview() {
    stopCamera();
    clearInterval(timerInterval);
    
    if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch(e) {}
    }
    
    elements.resultStatus.textContent = "Processing...";
    elements.resultStatus.className = `status-badge`;
    elements.resultDetails.innerHTML = `Calculating your final score...`;
    showScreen('result');
    
    const isHired = score >= 6; // Candidate needs at least 6 correct answers to be hired
    
    // Save to Backend Database
    try {
        await fetch('/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                candidateName: candidateInfo.name, 
                score, 
                total: selectedQuestions.length, 
                hired: isHired,
                userId: candidateInfo.id,
                answers: interviewAnswers
            })
        });
    } catch (err) {
        console.error("Failed to save result:", err);
    }
    
    elements.resultStatus.textContent = isHired ? "Hired!" : "Not Hired";
    elements.resultStatus.className = `status-badge status-${isHired ? 'hired' : 'nothired'}`;
    
    elements.resultDetails.innerHTML = `You answered <strong>${score} out of ${selectedQuestions.length}</strong> questions positively.<br><br>` + 
        (isHired ? "Impressive work! Your communication stood out to our team." : "There's room for improvement in your responses. Keep practicing!");
        
        // Generate Report
        const feedbackReport = document.getElementById('feedback-report');
        const feedbackList = document.getElementById('feedback-list');
        const videoFeedbackReport = document.getElementById('video-feedback-report');
        const videoMetrics = document.getElementById('video-metrics');
        const analyticsReports = document.getElementById('analytics-reports');
        const grammarReport = document.getElementById('grammar-report');
        const facialReport = document.getElementById('facial-report');
        
        // Calculate Participation
        let totalAnswerLength = 0;
        let emptyAnswersCount = 0;
        interviewAnswers.forEach(item => {
            if (item.answer === "(No answer provided)" || item.answer.trim().length < 5) {
                emptyAnswersCount++;
            } else {
                totalAnswerLength += item.answer.trim().length;
            }
        });
        const isSilent = emptyAnswersCount >= (selectedQuestions.length / 2) || totalAnswerLength < 20;

        // Feedback Pools
        const goodGrammar = [
            "<span style='color: #4cd137;'>Excellent vocabulary and sentence formulation context.</span>",
            "<span style='color: #4cd137;'>Your grammatical structure is strong, making your answers very clear.</span>",
            "<span style='color: #4cd137;'>Great use of professional language and appropriate syntax.</span>"
        ];
        const badGrammar = [
            "<span style='color: #e84118;'>Your grammar needs improvement. Consider practicing more to avoid basic syntax issues.</span>",
            "<span style='color: #e84118;'>There were multiple sentence formulation errors. Work on structuring your thoughts.</span>",
            "<span style='color: #e84118;'>Vocabulary usage is somewhat limited, making points harder to follow.</span>"
        ];
        const goodFacial = [
            "<span style='color: #4cd137;'>Positive engagement detected. You maintained a calm and confident physical composure.</span>",
            "<span style='color: #4cd137;'>Great eye contact and solid facial expression consistency throughout the answers.</span>",
            "<span style='color: #4cd137;'>You looked very attentive and expressive while answering the questions.</span>"
        ];
        const badFacial = [
            "<span style='color: #e84118;'>Low engagement observed. Try to maintain active and expressive facial demeanors.</span>",
            "<span style='color: #e84118;'>You appeared distracted or tense. Remember to smile and relax your expression.</span>",
            "<span style='color: #e84118;'>Eye contact was frequently broken or you appeared visibly stressed.</span>"
        ];
        
        const getRandomFeedback = (pool) => pool[Math.floor(Math.random() * pool.length)];

        // Dynamic Scoring Logic based on totalAnswerLength
        let baseScore;
        const incompleteAnswers = emptyAnswersCount > 0;
        const isShort = totalAnswerLength < 80;

        if (isSilent) {
            baseScore = Math.floor(Math.random() * 15) + 10; // 10-24
        } else if (incompleteAnswers || isShort) {
            baseScore = Math.floor(Math.random() * 15) + 35; // 35-49
        } else if (totalAnswerLength > 200) {
            baseScore = Math.floor(Math.random() * 10) + 85; // 85-94
        } else if (totalAnswerLength > 100) {
            baseScore = Math.floor(Math.random() * 10) + 75; // 75-84
        } else {
            baseScore = Math.floor(Math.random() * 10) + 60; // 60-69
        }

        // Mock Video Analytics
        if (videoFeedbackReport && videoMetrics) {
            const eyeContactScore = isSilent ? baseScore : Math.min(100, baseScore + Math.floor(Math.random() * 10) - 2);
            const confidenceScore = isSilent ? baseScore : Math.min(100, baseScore + Math.floor(Math.random() * 10) - 2);
            videoMetrics.innerHTML = `
                <div><strong>Eye Contact:</strong> ${eyeContactScore}%</div>
                <div><strong>Confidence:</strong> ${confidenceScore}%</div>
            `;
            videoFeedbackReport.style.display = 'block';
        }
        
        // Mock Grammar and Facial Analytics
        if (analyticsReports && grammarReport && facialReport) {
            let grammarScore = isSilent ? baseScore : Math.min(100, baseScore + Math.floor(Math.random() * 8) - 3);
            let facialScore = isSilent ? baseScore : Math.min(100, baseScore + Math.floor(Math.random() * 8) - 3);
            
            let grammarFeedback, facialFeedback;
            
            if (isSilent) {
                grammarFeedback = "<span style='color: #e84118;'>Insufficient speech/text to evaluate grammar. Please ensure you actively answer the questions.</span>";
                facialFeedback = "<span style='color: #e84118;'>Extremely low engagement detected. We could not capture proper facial expressions due to inactivity.</span>";
            } else if (incompleteAnswers) {
                grammarFeedback = "<span style='color: #e84118;'>You skipped answering some questions. Full participation is required for a positive evaluation.</span>";
                facialFeedback = "<span style='color: #e84118;'>Overall engagement dropped because you did not answer all questions.</span>";
            } else if (isShort) {
                grammarFeedback = "<span style='color: #e84118;'>Your answers were noticeably brief. You must elaborate to receive a passing grammar and technical score.</span>";
                facialFeedback = "<span style='color: #e84118;'>Lack of comprehensive responses negatively impacted your engagement and confidence metrics.</span>";
            } else {
                grammarFeedback = grammarScore >= 70 ? getRandomFeedback(goodGrammar) : getRandomFeedback(badGrammar);
                facialFeedback = facialScore >= 70 ? getRandomFeedback(goodFacial) : getRandomFeedback(badFacial);
            }
            
            grammarReport.innerHTML = `<strong>Grammar Report:</strong> ${grammarScore}% <br> <div style="margin-top: 5px;"><em>Feedback:</em> ${grammarFeedback}</div>`;
            facialReport.innerHTML = `<strong>Facial Detection Report:</strong> ${facialScore}% <br> <div style="margin-top: 5px;"><em>Feedback:</em> ${facialFeedback}</div>`;
            analyticsReports.style.display = 'block';
        }
        
        if (feedbackReport && feedbackList) {
            feedbackList.innerHTML = ''; // Clear previous
            
            // Removed Grammar and Expression summary per user request
            
            interviewAnswers.forEach((item, index) => {
                const feedbackClass = item.isCorrect ? 'feedback-good' : 'feedback-improve';
                const statusLabel = item.isCorrect ? '&#9989; Good' : '&#128161; Area for Improvement';
                
                const html = `
                    <div class="feedback-item">
                        <div class="feedback-question">Q${index + 1}: ${item.question}</div>
                        <div class="feedback-answer">" ${item.answer} "</div>
                        <div class="feedback-suggestion-box ${feedbackClass}">
                            <strong>${statusLabel}:</strong> ${item.feedback}
                        </div>
                    </div>
                `;
                feedbackList.innerHTML += html;
            });
            
            feedbackReport.style.display = 'block';
        }
}

function startInterview() {
    selectedQuestions = [...questionsBank].slice(0, 10); // Take 10 sequence wise
    currentQuestionIndex = 0;
    score = 0;
    interviewAnswers = []; // Reset answers
    elements.totalQuestions.textContent = selectedQuestions.length;
    
    showScreen('interview');
    startCamera();
    initSpeechRecognition();
    loadQuestion();
}

// Event Listeners
if (elements.getStartedBtn) {
    elements.getStartedBtn.addEventListener('click', () => { showScreen('register'); });
}

if (elements.registerForm) {
    elements.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = elements.candidateName.value;
        const password = elements.candidatePassword.value;
        
        if (username && password) {
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                if (data.success) {
                    alert("Registration successful! Please login.");
                    showScreen('login');
                } else {
                    alert("Registration failed: " + data.error);
                }
            } catch (err) {
                alert("Error registering. Please try again.");
                console.error(err);
            }
        }
    });
}

if (elements.loginForm) {
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = elements.loginName.value;
        const password = elements.loginPassword.value;

        if (username && password) {
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await response.json();
                if (data.success) {
                    candidateInfo = { id: data.user.id, name: data.user.username };
                    showScreen('welcome');
                } else {
                    alert("Login failed: " + data.error);
                }
            } catch (err) {
                alert("Error logging in.");
                console.error(err);
            }
        }
    });
}

if (elements.goToLogin) {
    elements.goToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('login');
    });
}

if (elements.goToRegister) {
    elements.goToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        showScreen('register');
    });
}

elements.startBtn.addEventListener('click', async () => {
    cheatWarnings = 0;
    try {
        await document.documentElement.requestFullscreen();
    } catch (err) {
        console.log("Could not enable fullscreen:", err);
    }
    startInterview();
});

elements.recordBtn.addEventListener('click', toggleRecording);
elements.nextBtn.addEventListener('click', () => {
    // Only fetch evaluate if user actually clicked next
    if(!elements.nextBtn.disabled) nextQuestion();
});
elements.restartBtn.addEventListener('click', () => { showScreen('welcome'); });

if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', async () => {
        if (candidateInfo && candidateInfo.id) {
            try {
                await fetch('/api/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: candidateInfo.id })
                });
            } catch (err) {
                console.error("Error logging out on backend:", err);
            }
        }
        candidateInfo = {}; // Clear user session info
        showScreen('logout');
    });
}
if (elements.loginAgainBtn) {
    elements.loginAgainBtn.addEventListener('click', () => { showScreen('login'); });
}

// Enable next button when text is entered
elements.answerText.addEventListener('input', () => {
    elements.nextBtn.disabled = elements.answerText.value.trim().length === 0;
});

// Anti-Cheat Mechanisms
document.addEventListener('visibilitychange', () => {
    if (screens.interview.classList.contains('active') && document.hidden) {
        handleCheatingAttempt("You switched tabs or minimized the window!");
    }
});

document.addEventListener('fullscreenchange', () => {
    if (screens.interview.classList.contains('active') && !document.fullscreenElement) {
        handleCheatingAttempt("You exited full screen mode!");
    }
});

function handleCheatingAttempt(message) {
    cheatWarnings++;
    if (cheatWarnings >= MAX_WARNINGS) {
        alert(message + " Maximum warnings reached. Your interview will now be terminated.");
        endInterview();
    } else {
        alert(message + ` Warning ${cheatWarnings} of ${MAX_WARNINGS}. Please stay in full screen and do not switch tabs.`);
        try { document.documentElement.requestFullscreen(); } catch(e) {}
    }
}
