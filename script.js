const API_URL = "http://localhost:5000/api";

const totalLevels = 50;

let currentLevel = 1;
let currentDifficulty = "easy";
let currentPuzzle = null;
let score = 0;
let coins = 0;
let completed = 0;
let unlocked = 1;
let timeLeft = 60;
let timerInterval = null;
let hintUsed = false;
let authMode = "login";

const levelsGrid = document.getElementById("levelsGrid");
const answerForm = document.getElementById("answerForm");
const answerInput = document.getElementById("answerInput");

const savedProgress = JSON.parse(
    localStorage.getItem("nexoraProgress") || "{}"
);

score = savedProgress.score || 0;
coins = savedProgress.coins || 0;
completed = savedProgress.completed || 0;
unlocked = savedProgress.unlocked || 1;
currentLevel = savedProgress.currentLevel || 1;

document.getElementById("currentYear").textContent =
    new Date().getFullYear();


function saveProgress() {
    const progress = {
        score,
        coins,
        completed,
        unlocked,
        currentLevel
    };

    localStorage.setItem(
        "nexoraProgress",
        JSON.stringify(progress)
    );

    updateDashboard();
}


function updateDashboard() {
    document.getElementById("totalScore").textContent = score;
    document.getElementById("totalCoins").textContent = coins;

    document.getElementById("completedPuzzles").textContent =
        completed;

    document.getElementById("unlockedLevels").textContent =
        `${unlocked} / ${totalLevels}`;

    const progress = Math.round(
        (completed / totalLevels) * 100
    );

    document.getElementById("progressText").textContent =
        `${progress}%`;

    document.getElementById("progressBar").style.width =
        `${progress}%`;

    document.getElementById("gameScore").textContent = score;
}


function createLevels() {
    levelsGrid.innerHTML = "";

    for (let i = 1; i <= totalLevels; i++) {
        const button = document.createElement("button");

        button.className = "level-card";
        button.textContent = i;

        if (i > unlocked) {
            button.classList.add("locked");
            button.disabled = true;
            button.textContent = "🔒";
        } else if (i <= completed) {
            button.classList.add("completed");
        }

        button.addEventListener("click", () => {
            startLevel(i);
        });

        levelsGrid.appendChild(button);
    }
}


const puzzleTypes = [
    {
        name: "Number Mystery",
        create(level) {
            const number = level + 5;

            return {
                question: `What is ${number} + ${number * 2}?`,
                visual: `${number} + ${number * 2} = ?`,
                answer: String(number * 3),
                hint: "Add both numbers."
            };
        }
    },

    {
        name: "Number Sequence",
        create(level) {
            const start = level + 2;
            const gap = (level % 5) + 2;

            const numbers = [
                start,
                start + gap,
                start + gap * 2,
                start + gap * 3
            ];

            return {
                question: "Find the next number in the sequence.",
                visual: numbers.join("  →  ") + "  →  ?",
                answer: String(start + gap * 4),
                hint: "Look at the difference between consecutive numbers."
            };
        }
    },

    {
        name: "Multiplication",
        create(level) {
            const first = (level % 9) + 2;
            const second = (level % 7) + 3;

            return {
                question: `Calculate ${first} × ${second}.`,
                visual: `${first} × ${second} = ?`,
                answer: String(first * second),
                hint: "Multiply the two numbers."
            };
        }
    },

    {
        name: "Logic Challenge",
        create(level) {
            const number = (level % 10) + 4;

            return {
                question:
                    `A box contains ${number} pairs of shoes. How many individual shoes are there?`,
                visual: `${number} pairs = ? shoes`,
                answer: String(number * 2),
                hint: "Each pair contains two shoes."
            };
        }
    },

    {
        name: "Pattern Challenge",
        create(level) {
            const number = (level % 8) + 2;

            const sequence = [
                number,
                number * 2,
                number * 3,
                number * 4
            ];

            return {
                question: "Complete the multiplication pattern.",
                visual: sequence.join("  →  ") + "  →  ?",
                answer: String(number * 5),
                hint: "Each number is a multiple of the same number."
            };
        }
    }
];


function getDifficultySettings() {
    const settings = {
        easy: {
            time: 60,
            points: 10
        },

        medium: {
            time: 45,
            points: 20
        },

        hard: {
            time: 30,
            points: 30
        }
    };

    return settings[currentDifficulty];
}


function generatePuzzle(level) {
    let typeIndex = (level - 1) % puzzleTypes.length;

    const puzzle = puzzleTypes[typeIndex].create(level);

    const settings = getDifficultySettings();

    if (currentDifficulty === "medium") {
        puzzle.hint = "Think carefully and check the pattern.";
    }

    if (currentDifficulty === "hard") {
        puzzle.hint = "Break the problem into smaller steps.";
    }

    return {
        ...puzzle,
        category: puzzleTypes[typeIndex].name,
        points: settings.points
    };
}


function startLevel(level) {
    if (level > unlocked) {
        showMessage("Complete previous levels first.", "error");
        return;
    }

    clearInterval(timerInterval);

    currentLevel = level;
    currentPuzzle = generatePuzzle(level);
    hintUsed = false;

    const settings = getDifficultySettings();

    timeLeft = settings.time;

    document.getElementById("currentLevel").textContent =
        `Level ${level}`;

    document.getElementById("puzzleCategory").textContent =
        currentPuzzle.category;

    document.getElementById("puzzleQuestion").textContent =
        currentPuzzle.question;

    document.getElementById("puzzleVisual").textContent =
        currentPuzzle.visual;

    document.getElementById("timer").textContent =
        formatTime(timeLeft);

    document.getElementById("gameMessage").textContent = "";
    document.getElementById("hintMessage").textContent = "";

    answerInput.value = "";

    updateDashboard();

    startTimer();

    document.getElementById("puzzleArea").scrollIntoView({
        behavior: "smooth"
    });
}


function startTimer() {
    clearInterval(timerInterval);

    timerInterval = setInterval(() => {
        timeLeft--;

        document.getElementById("timer").textContent =
            formatTime(timeLeft);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);

            showMessage(
                "Time is over! Try this level again.",
                "error"
            );

            answerInput.disabled = true;
        }
    }, 1000);
}


function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );
}


function showMessage(message, type) {
    const messageBox = document.getElementById("gameMessage");

    messageBox.textContent = message;
    messageBox.style.color =
        type === "success" ? "#00e5a0" : "#ff6b81";
}


function checkAnswer(event) {
    event.preventDefault();

    if (!currentPuzzle || timeLeft <= 0) {
        return;
    }

    const userAnswer = answerInput.value.trim().toLowerCase();

    if (!userAnswer) {
        showMessage("Please enter an answer.", "error");
        return;
    }

    if (userAnswer === currentPuzzle.answer.toLowerCase()) {
        clearInterval(timerInterval);

        const bonus = Math.floor(timeLeft / 5);
        const points = currentPuzzle.points + bonus;

        score += points;
        coins += 5;
        completed++;

        unlocked = Math.max(
            unlocked,
            Math.min(currentLevel + 1, totalLevels)
        );

        saveProgress();
        createLevels();

        showMessage(
            `Correct answer! You earned ${points} points and 5 coins.`,
            "success"
        );

        document.getElementById("gameScore").textContent = score;

        answerInput.disabled = true;
    } else {
        showMessage("Incorrect answer. Try again!", "error");
    }
}


function showHint() {
    if (!currentPuzzle || hintUsed) {
        document.getElementById("hintMessage").textContent =
            "No more hints available for this puzzle.";

        return;
    }

    hintUsed = true;

    document.getElementById("hintMessage").textContent =
        "Hint: " + currentPuzzle.hint;
}


function skipPuzzle() {
    clearInterval(timerInterval);

    showMessage(
        "Puzzle skipped. You can try this level again.",
        "error"
    );

    answerInput.disabled = true;
}


function setDifficulty(difficulty) {
    currentDifficulty = difficulty;

    document.querySelectorAll(".difficulty-card").forEach(card => {
        card.classList.toggle(
            "selected",
            card.dataset.difficulty === difficulty
        );
    });

    showMessage(
        `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} mode selected.`,
        "success"
    );
}


function openAuth(mode) {
    authMode = mode;

    const modal = document.getElementById("authModal");
    const nameGroup = document.getElementById("nameGroup");

    modal.classList.add("show");

    if (mode === "signup") {
        document.getElementById("authTitle").textContent =
            "Create Account";

        document.getElementById("authDescription").textContent =
            "Join PR26X NEXORA and start your adventure.";

        document.getElementById("authSubmit").textContent =
            "Sign Up";

        nameGroup.hidden = false;

        document.getElementById("authName").required = true;

        document.getElementById("authSwitch").innerHTML =
            'Already have an account? <button type="button" id="switchAuth">Login</button>';
    } else {
        document.getElementById("authTitle").textContent =
            "Welcome Back";

        document.getElementById("authDescription").textContent =
            "Login to continue your adventure.";

        document.getElementById("authSubmit").textContent =
            "Login";

        nameGroup.hidden = true;

        document.getElementById("authName").required = false;

        document.getElementById("authSwitch").innerHTML =
            'Don\'t have an account? <button type="button" id="switchAuth">Sign Up</button>';
    }

    document.getElementById("authMessage").textContent = "";

    document.getElementById("switchAuth").addEventListener(
        "click",
        () => openAuth(authMode === "login" ? "signup" : "login")
    );
}


function closeAuth() {
    document.getElementById("authModal").classList.remove("show");
}


async function handleAuth(event) {
    event.preventDefault();

    const message = document.getElementById("authMessage");
    const name = document.getElementById("authName").value.trim();
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;

    const endpoint = authMode === "signup"
        ? "/auth/register"
        : "/auth/login";

    const data = {
        email,
        password
    };

    if (authMode === "signup") {
        data.username = name;
    }

    message.textContent = "Please wait...";

    try {
        const response = await fetch(API_URL + endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Authentication failed.");
        }

        if (result.token) {
            localStorage.setItem("nexoraToken", result.token);
        }

        message.textContent =
            result.message || "Account operation successful.";

        message.style.color = "#00e5a0";

        setTimeout(closeAuth, 1200);

        loadLeaderboard();

    } catch (error) {
        message.textContent = error.message;
        message.style.color = "#ff6b81";
    }
}


async function loadLeaderboard() {
    const list = document.getElementById("leaderboardList");

    try {
        const response = await fetch(API_URL + "/leaderboard");

        if (!response.ok) {
            throw new Error("Unable to load leaderboard.");
        }

        const players = await response.json();

        list.innerHTML = "";

        if (!players.length) {
            list.innerHTML =
                '<p class="leaderboard-empty">No players available yet.</p>';

            return;
        }

        players.forEach((player, index) => {
            const row = document.createElement("div");

            row.className = "leaderboard-row";

            const rank = document.createElement("span");
            const name = document.createElement("span");
            const playerScore = document.createElement("span");

            rank.textContent = index + 1;
            name.textContent = player.username;
            playerScore.textContent = player.score;

            row.append(rank, name, playerScore);
            list.appendChild(row);
        });

    } catch (error) {
        list.innerHTML =
            '<p class="leaderboard-empty">Leaderboard will be available when the server is running.</p>';
    }
}


document.getElementById("startGameBtn").addEventListener(
    "click",
    () => startLevel(currentLevel)
);

document.getElementById("finalStartBtn").addEventListener(
    "click",
    () => startLevel(currentLevel)
);

document.getElementById("loginBtn").addEventListener(
    "click",
    () => openAuth("login")
);

document.getElementById("signupBtn").addEventListener(
    "click",
    () => openAuth("signup")
);

document.getElementById("closeModal").addEventListener(
    "click",
    closeAuth
);

document.getElementById("authForm").addEventListener(
    "submit",
    handleAuth
);

document.getElementById("switchAuth").addEventListener(
    "click",
    () => openAuth(authMode === "login" ? "signup" : "login")
);

document.getElementById("hintBtn").addEventListener(
    "click",
    showHint
);

document.getElementById("skipBtn").addEventListener(
    "click",
    skipPuzzle
);

answerForm.addEventListener("submit", checkAnswer);

document.querySelectorAll(".difficulty-card").forEach(card => {
    card.addEventListener("click", () => {
        setDifficulty(card.dataset.difficulty);
    });
});

document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("navLinks").classList.toggle("open");
});

document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
        document.getElementById("navLinks").classList.remove("open");
    });
});

document.getElementById("authModal").addEventListener("click", event => {
    if (event.target.id === "authModal") {
        closeAuth();
    }
});


updateDashboard();
createLevels();
setDifficulty("easy");
loadLeaderboard();
