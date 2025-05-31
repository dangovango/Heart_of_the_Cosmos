// game.js

// --- GAME DATA (will be populated asynchronously) ---
let gameData = {}; // Initialize as an empty object

// --- STATIC GAME NARRATIVE DATA (can remain here or be moved to another JSON if preferred) ---
const staticGameNarrative = {
    splashScreen: {
        title: "Heart of the Cosmos",
        subtitle: "Treasure hidden in the void"
    },
    introGame: {
        text: "Welcome, brave spacefarers! You are part of a four-person crew, renowned for your daring exploits, now seeking untold treasures across the cosmos. Prepare for adventure, danger, and glory!"
    },
    introCrewDynamics: {
        text: "Your crew is a diverse group, each bringing unique skills and personalities to the table. Their strengths will be tested, and their bonds forged in the fires of space. Work together, for your survival depends on it."
    },
    missionBrief: {
        text: "Your current mission: locate the fabled 'Star-Heart Gem' within the treacherous Cygnus Nebula. Be warned, adventurers – your choices have consequences. Discuss, decide, and navigate wisely to secure the treasure and ensure the crew's safe return. Your objective is clear: maximize treasure, minimize danger, eliminate threats."
    },
    conclusion: "The End: Whether triumphant or barely surviving, your Space Adventure concludes. Your crew has faced incredible challenges, made difficult decisions, and forged an unforgettable story. Thank you for playing!"
};


// --- GAME STATE ---
let gameState = {
    currentPage: 'loading', // Set initial page to 'loading'
    shipHealth: 100,
    crewHealth: 100,
    treasure: 0,
    currentAct: 0,
    currentEncounter: 0,
    lastChoice: 0,
    rivalFactionEncountered: false,
    gameOverReason: null // NEW: To store why the game ended
};

// --- DOM REFERENCES ---
const gameTitleElem = document.getElementById('game-title');
const gameSubtitleElem = document.getElementById('game-subtitle');
const characterPortraitElem = document.getElementById('character-portrait');
const encounterImageElem = document.getElementById('encounter-image');
const gameContentElem = document.getElementById('game-content');
const choicesContainerElem = document.getElementById('choices-container');
const statusDisplayElem = document.getElementById('status-display');
const nextButton = document.getElementById('next-button');

// NEW: Audio DOM References
const bgMusic = document.getElementById('bg-music');
const sfxButtonClick = document.getElementById('sfx-button-click');
const sfxTyping = document.getElementById('sfx-typing');

// --- GAME LOGIC FUNCTIONS ---

// NEW: Function to play background music
function playBgMusic() {
    bgMusic.volume = 0.3; // Adjust volume as needed (0.0 to 1.0)
    bgMusic.play().catch(e => console.log("Background music play failed:", e)); // Catch potential user interaction errors
}

// NEW: Function to stop background music
function stopBgMusic() {
    bgMusic.pause();
    bgMusic.currentTime = 0; // Rewind to start
}

// NEW: Function to play a sound effect (utility for all SFX)
function playSfx(audioElement, volume = 0.7) {
    audioElement.currentTime = 0; // Rewind to start in case it's still playing
    audioElement.volume = volume;
    audioElement.play().catch(e => console.log("SFX play failed:", e));
}

// NEW: Function to start typing sound
function startTypingSfx() {
    playSfx(sfxTyping, 0.4); // Adjust volume for typing sound
}

// NEW: Function to stop typing sound
function stopTypingSfx() {
    sfxTyping.pause();
    sfxTyping.currentTime = 0;
}


// Function to update the status display (health, treasure)
function updateStatusDisplay() {
    statusDisplayElem.innerHTML = `
        <strong>Ship Health:</strong> ${gameState.shipHealth}<br>
        <strong>Crew Health:</strong> ${gameState.crewHealth}<br>
        <strong>Treasure:</strong> ${gameState.treasure} credits
    `;
    statusDisplayElem.classList.remove('hidden'); // Ensure status is visible when updated
}

// Function to simulate typing text
// UPDATED: Now includes start/stop typing SFX
function typeText(element, text, speed = 30) { // speed in milliseconds per character
    return new Promise(resolve => {
        element.textContent = ''; // Clear existing text
        let i = 0;
        startTypingSfx(); // NEW: Start typing sound
        const typingInterval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(typingInterval);
                stopTypingSfx(); // NEW: Stop typing sound
                resolve(); // Resolve the promise when typing is complete
            }
        }, speed);
    });
}


// Function to display content for a given page.
async function displayPage(pageId) {
    // Reset all elements to hidden first, then show what's needed for the current page
    gameTitleElem.classList.add('hidden');
    gameSubtitleElem.classList.add('hidden');
    gameContentElem.classList.add('hidden');
    choicesContainerElem.classList.add('hidden');
    statusDisplayElem.classList.add('hidden');
    nextButton.classList.add('hidden');

    // Clear previous choices
    choicesContainerElem.innerHTML = '';

    // Always hide portraits and encounter images unless explicitly shown in a case
    characterPortraitElem.classList.add('hidden');
    encounterImageElem.classList.add('hidden');


    // Disable all buttons initially for typing effect, re-enabled later by individual cases
    nextButton.disabled = true;
    document.querySelectorAll('.choice-button').forEach(button => button.disabled = true);


    switch (pageId) {
        case 'loading':
            // No typing effect here as it's a transient loading screen
            gameTitleElem.textContent = "Loading Game Data...";
            gameContentElem.textContent = "Please wait.";
            gameTitleElem.classList.remove('hidden');
            gameContentElem.classList.remove('hidden');
            // No button to enable
            break;

        case 'splashScreen':
            gameTitleElem.classList.remove('hidden');
            gameSubtitleElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');

            await typeText(gameTitleElem, staticGameNarrative.splashScreen.title, 50); // Slower title typing
            await typeText(gameSubtitleElem, staticGameNarrative.splashScreen.subtitle, 40); // Slightly faster subtitle typing
            nextButton.textContent = "Click to Start";
            nextButton.disabled = false; // Enable button after typing
            break;

        case 'introGame':
            gameTitleElem.classList.remove('hidden');
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');

            await typeText(gameTitleElem, "Introduction", 50);
            await typeText(gameContentElem, staticGameNarrative.introGame.text, 30);
            nextButton.textContent = "Continue";
            nextButton.disabled = false; // Enable button
            break;

        case 'introCrewDynamics':
            gameTitleElem.classList.remove('hidden');
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');

            await typeText(gameTitleElem, "Your Crew", 50);
            await typeText(gameContentElem, staticGameNarrative.introCrewDynamics.text, 30);
            nextButton.textContent = "Meet Your Team";
            nextButton.disabled = false; // Enable button
            break;

        case 'characterIntro':
            if (!gameData.characters) {
                console.error("Characters data not loaded yet!");
                return;
            }
            const charKeys = Object.keys(gameData.characters);
            const currentCharIndex = gameState.currentEncounter - 1;
            const currentChar = gameData.characters[charKeys[currentCharIndex]];

            if (currentChar) {
                gameTitleElem.classList.remove('hidden');
                gameContentElem.classList.remove('hidden');
                nextButton.classList.remove('hidden');
                characterPortraitElem.classList.remove('hidden'); // Ensure portrait is visible

                await typeText(gameTitleElem, `Meet ${currentChar.name}`, 50);

                const imagePath = `assets/${currentChar.portrait}`;
                console.log("Image path:", imagePath);
                characterPortraitElem.src = imagePath;

                let traitsText = `Traits:\n`;
                traitsText += currentChar.traits.map(trait => `  - ${trait}`).join('\n');
                await typeText(gameContentElem, traitsText, 30);

                nextButton.textContent = "Continue";
                nextButton.disabled = false; // Enable button
            } else {
                gameState.currentPage = 'missionBrief';
                displayPage(gameState.currentPage); // Recurse to display next page
                return; // Important: return here to prevent further execution in this case
            }
            break;

        case 'missionBrief':
            gameTitleElem.classList.remove('hidden');
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');

            await typeText(gameTitleElem, "Mission Brief", 50);
            await typeText(gameContentElem, staticGameNarrative.missionBrief.text, 30);
            nextButton.textContent = "Prepare for Adventure!";
            nextButton.disabled = false; // Enable button
            break;

        case 'actTitle':
            if (!gameData.acts) {
                console.error("Acts data not loaded yet!");
                return;
            }
            const currentActData = gameData.acts[gameState.currentAct];
            gameTitleElem.classList.remove('hidden');
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');

            await typeText(gameTitleElem, currentActData.title, 50);
            await typeText(gameContentElem, "Press continue to face your first encounter...", 30);
            nextButton.textContent = "Continue";
            nextButton.disabled = false; // Enable button
            break;

        case 'encounter':
            if (!gameData.acts) {
                console.error("Acts data not loaded yet!");
                return;
            }
            const act = gameData.acts[gameState.currentAct];
            const encounter = act.encounters[gameState.currentEncounter];

            if (!encounter) {
                gameState.currentPage = 'actSummary';
                displayPage(gameState.currentPage);
                return;
            }

            gameTitleElem.classList.remove('hidden');
            gameContentElem.classList.remove('hidden');
            gameTitleElem.textContent = `Act ${gameState.currentAct + 1} - Encounter ${gameState.currentEncounter + 1}`;

            // Logic to display encounter image
            if (encounter.image) {
                encounterImageElem.src = `assets/${encounter.image}`; // Assumes path like assets/encounters/image.png
                encounterImageElem.classList.remove('hidden'); // Show the image
            } else {
                encounterImageElem.classList.add('hidden'); // Hide if no image specified for this encounter
            }

            await typeText(gameContentElem, encounter.scenario);

            choicesContainerElem.classList.remove('hidden');
            updateStatusDisplay();

            // Create choice buttons
            encounter.options.forEach((option, index) => {
                const choiceButton = document.createElement('button');
                choiceButton.classList.add('game-button', 'choice-button');
                choiceButton.textContent = `${index + 1}. ${option.text}`;
                choiceButton.addEventListener('click', () => handleChoice(index + 1));
                choicesContainerElem.appendChild(choiceButton);
            });

            document.querySelectorAll('.choice-button').forEach(button => button.disabled = false);

            break;

        case 'results':
            if (!gameData.acts) {
                console.error("Acts data not loaded yet!");
                return;
            }
            const previousAct = gameData.acts[gameState.currentAct];
            const previousEncounter = previousAct.encounters[gameState.currentEncounter];
            const chosenOption = previousEncounter.options[gameState.lastChoice - 1];
            const outcome = chosenOption.outcome;

            gameTitleElem.classList.remove('hidden');
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            gameTitleElem.textContent = "Encounter Results";

            await typeText(gameContentElem, outcome.text);

            // Apply changes to game state
            gameState.shipHealth += outcome.shipHealthChange;
            gameState.crewHealth += outcome.crewHealthChange;
            gameState.treasure += outcome.treasureChange;

            // Ensure health doesn't go below zero
            gameState.shipHealth = Math.max(0, gameState.shipHealth);
            gameState.crewHealth = Math.max(0, gameState.crewHealth);

            if (outcome.specialEffect) {
                console.log("Applying special effect:", outcome.specialEffect);
            }

            updateStatusDisplay();

            // NEW: Check for Game Over conditions immediately after health updates
            if (gameState.shipHealth <= 0) {
                gameState.gameOverReason = 'shipDestroyed';
                gameState.currentPage = 'gameOver';
                // Important: Immediately display game over, don't wait for nextButton
                displayPage(gameState.currentPage);
                return; // Stop further execution in this case
            } else if (gameState.crewHealth <= 0) {
                gameState.gameOverReason = 'crewPerished';
                gameState.currentPage = 'gameOver';
                displayPage(gameState.currentPage);
                return; // Stop further execution in this case
            }

            nextButton.textContent = "Continue";
            nextButton.disabled = false;

            break;

        case 'actSummary':
            if (!gameData.acts) {
                console.error("Acts data not loaded yet!");
                return;
            }
            const currentActSummary = gameData.acts[gameState.currentAct].summary;
            gameTitleElem.classList.remove('hidden');
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');

            await typeText(gameTitleElem, `Act ${gameState.currentAct + 1} Summary`, 50);
            await typeText(gameContentElem, currentActSummary, 30);
            nextButton.textContent = "Proceed to Next Act";
            updateStatusDisplay();
            nextButton.disabled = false; // Enable button
            break;

        case 'conclusion':
            gameTitleElem.classList.remove('hidden');
            gameContentElem.classList.remove('hidden');

            await typeText(gameTitleElem, "The Space Adventure Concludes!", 50);

            let conclusionText = staticGameNarrative.conclusion + "\n\n";
            conclusionText += `Final Ship Health: ${gameState.shipHealth}\n`;
            conclusionText += `Final Crew Health: ${gameState.crewHealth}\n`;
            conclusionText += `Final Treasure: ${gameState.treasure} credits\n\n`;

            if (gameState.treasure >= 500 && gameState.shipHealth > 20 && gameState.crewHealth > 20) {
                conclusionText += "Congratulations, Captain! You achieved a great success!";
            } else if (gameState.treasure >= 200 && gameState.shipHealth > 0 && gameState.crewHealth > 0) {
                conclusionText += "You survived and found some treasure. A challenging but successful journey!";
            } else {
                conclusionText += "A difficult journey, but you made it through. Perhaps next time, greater fortunes await.";
            }

            await typeText(gameContentElem, conclusionText, 30);
            // No next button or choices for conclusion, so no enable needed
            break;

        // NEW: Game Over case
        case 'gameOver':
            gameTitleElem.classList.remove('hidden');
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden'); // We'll repurpose this for restart

            let gameOverTitle = "Game Over!";
            let gameOverMessage = "";

            if (gameState.gameOverReason === 'shipDestroyed') {
                gameOverMessage = "Your ship sustained critical damage and was destroyed. The mission is a failure.";
            } else if (gameState.gameOverReason === 'crewPerished') {
                gameOverMessage = "Your crew suffered catastrophic losses. With no one left to pilot the ship, your adventure ends here.";
            } else {
                gameOverMessage = "An unforeseen anomaly has ended your journey."; // Generic fallback
            }

            gameOverMessage += `\n\nFinal Ship Health: ${gameState.shipHealth}`;
            gameOverMessage += `\nFinal Crew Health: ${gameState.crewHealth}`;
            gameOverMessage += `\nFinal Treasure: ${gameState.treasure} credits`;


            await typeText(gameTitleElem, gameOverTitle, 50);
            await typeText(gameContentElem, gameOverMessage, 30);

            nextButton.textContent = "Restart Game";
            nextButton.disabled = false;
            break;

        default:
            gameTitleElem.classList.remove('hidden');
            gameContentElem.classList.remove('hidden');
            await typeText(gameTitleElem, "Error", 50);
            await typeText(gameContentElem, "An unknown game state occurred.", 30);
            break;
    }
}

// --- Event Handlers ---

// Handler for the main "Continue" button
// UPDATED: Now plays button SFX and handles game over restart
nextButton.addEventListener('click', () => {
    playSfx(sfxButtonClick); // NEW: Play button click sound for all clicks

    // NEW: Handle starting background music on first click from splash screen
    if (gameState.currentPage === 'splashScreen') {
        playBgMusic();
    }

    // NEW: Handle restart from Game Over screen
    if (gameState.currentPage === 'gameOver') {
        // Reset game state to initial values
        gameState = {
            currentPage: 'splashScreen', // Start from splash screen
            shipHealth: 100,
            crewHealth: 100,
            treasure: 0,
            currentAct: 0,
            currentEncounter: 0,
            lastChoice: 0,
            rivalFactionEncountered: false,
            gameOverReason: null // Clear the game over reason
        };
        displayPage(gameState.currentPage);
        return; // Important: Stop here if it's a restart
    }

    // Logic to transition to the next page
    switch (gameState.currentPage) {
        case 'splashScreen':
            gameState.currentPage = 'introGame';
            break;
        case 'introGame':
            gameState.currentPage = 'introCrewDynamics';
            break;
        case 'introCrewDynamics':
            gameState.currentEncounter = 1; // Start character intros (first character, index 0)
            gameState.currentPage = 'characterIntro';
            break;
        case 'characterIntro':
            gameState.currentEncounter++; // Move to the next character index
            // displayPage will handle the transition to missionBrief if all chars are done
            break;
        case 'missionBrief':
            gameState.currentPage = 'actTitle';
            gameState.currentAct = 0; // Start with Act 1 (index 0)
            gameState.currentEncounter = 0; // Reset encounter for the new act (index 0 for first encounter)
            break;
        case 'actTitle':
            gameState.currentPage = 'encounter';
            break;
        case 'results':
            gameState.currentEncounter++; // Increment AFTER results are processed, just before next page
            const currentActData = gameData.acts[gameState.currentAct];
            if (gameState.currentEncounter < currentActData.encounters.length) {
                gameState.currentPage = 'encounter'; // More encounters in this act
            } else {
                gameState.currentPage = 'actSummary'; // All encounters done for this act
            }
            break;
        case 'actSummary':
            gameState.currentAct++; // Move to the next act
            if (gameState.currentAct < gameData.acts.length) {
                gameState.currentPage = 'actTitle'; // Go to the title page of the next act
                gameState.currentEncounter = 0; // Reset encounter index for the new act
            } else {
                gameState.currentPage = 'conclusion'; // All acts done, move to conclusion
            }
            break;
    }
    displayPage(gameState.currentPage); // Render the new page
});

// Handler for choice buttons (dynamically created)
// UPDATED: Now plays button SFX
function handleChoice(choice) {
    playSfx(sfxButtonClick); // NEW: Play button click sound
    gameState.lastChoice = choice;
    gameState.currentPage = 'results';
    displayPage(gameState.currentPage);
}

// --- INITIALIZATION ---
// New async function to load data and start the game
async function initializeGame() {
    displayPage('loading'); // Show loading screen immediately

    try {
        // Fetch characters data
        const charactersResponse = await fetch('data/characters.json');
        const charactersData = await charactersResponse.json();

        // Fetch encounters data
        const encountersResponse = await fetch('data/encounters.json');
        const encountersData = await encountersResponse.json();

        // Combine all game data
        gameData = {
            ...staticGameNarrative, // Include static narrative data
            characters: charactersData,
            acts: encountersData
        };

        console.log("Game data loaded successfully:", gameData);

        // Once data is loaded, set the initial page and display it
        gameState.currentPage = 'splashScreen';
        displayPage(gameState.currentPage);
        // playBgMusic(); // REMOVED: Now plays on first user interaction (splash screen click)

    } catch (error) {
        console.error("Failed to load game data:", error);
        gameTitleElem.textContent = "Error Loading Game!";
        gameContentElem.textContent = "Please check your network connection or file paths. (See console for details)";
        gameTitleElem.classList.remove('hidden');
        gameContentElem.classList.remove('hidden');
    }
}

// Call the async initialization function when the script loads
initializeGame();