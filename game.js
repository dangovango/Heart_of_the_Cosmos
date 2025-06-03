let gameData = {}; // This will hold all parsed data (characters, acts, encounters lookup)
const staticGameNarrative = {
    splashScreen: {
        title: "Heart of the Cosmos",
        subtitle: "Treasure hidden in the void",
        image: "splash_screen_cover.png"
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
    conclusion: "Your crew has faced incredible challenges, made difficult decisions, and forged an unforgettable story. The Star-Heart Gem is now in good hands!"
};

const pageTitles = {
    'introGame': 'Introduction',
    'introCrewDynamics': 'Your Crew',
    'missionBrief': 'Mission Brief',
    'results': 'Encounter Results', // This page will now display outcome text
    'conclusion': 'You Have Completed Your Quest!',
    'gameOver': 'Game Over!',
    'error': 'Error'
};

// --- UPDATED: Initial gameState with new flags for special effects ---
let gameState = {
    currentPage: 'loading',
    shipHealth: 100,
    crewHealth: 100,
    treasure: 0,
    currentAct: 0, // Index of the current act in the 'acts' array
    currentEncounterId: null, // NOW STORES THE ID OF THE CURRENT ENCOUNTER
    lastChoiceOutcome: null, // Stores the full outcome object of the last choice made
    rivalFactionEncountered: false, // Flag for rival faction encounters
    shipShieldBoostActive: false, // Flag for the 'shipShieldBoost' special effect
    specialEffects: [], // An array to hold other active special effects (e.g., 'nebulaShortcutUnlocked', 'jaxEfficiencyBoost')
    gameOverReason: null
};

// --- DOM Elements ---
const gameTitleElem = document.getElementById('game-title');
const gameSubtitleElem = document.getElementById('game-subtitle');
const characterPortraitElem = document.getElementById('character-portrait');
const encounterImageElem = document.getElementById('encounter-image');
const gameContentElem = document.getElementById('game-content');
const choicesContainerElem = document.getElementById('choices-container');
const statusDisplayElem = document.getElementById('status-display');
const nextButton = document.getElementById('next-button');
const splashImageElem = document.getElementById('splash-image');

const bgMusic = document.getElementById('bg-music');
const sfxButtonClick = document.getElementById('sfx-button-click');
const sfxTyping = document.getElementById('sfx-typing');

let typingInterval = null;
let currentTypingResolve = null;
let isTypingActive = false;
let currentlyTypingElement = null;

// --- Helper Functions ---

/**
 * Determines the title for the current page based on its ID and game state.
 * @param {string} pageId - The ID of the current page.
 * @returns {string} The formatted page title.
 */
function getPageTitle(pageId) {
    if (pageTitles[pageId]) {
        return pageTitles[pageId];
    }
    if (pageId === 'splashScreen') {
        return staticGameNarrative.splashScreen.title;
    }
    // Updated: For 'actTitle', use the act's title from gameData
    if (pageId === 'actTitle' && gameData.acts && gameData.acts[gameState.currentAct]) {
        return gameData.acts[gameState.currentAct].title;
    }
    if (pageId === 'actSummary' && gameData.acts && gameData.acts[gameState.currentAct]) {
        return `Act ${gameState.currentAct + 1} Summary`;
    }
    // Updated: For 'encounter', use the Act's title and the Encounter's displayName
    if (pageId === 'encounter' && gameData.acts && gameData.acts[gameState.currentAct] && gameState.currentEncounterId) {
        const currentAct = gameData.acts[gameState.currentAct];
        const currentEncounter = gameData.encounterLookup[gameState.currentEncounterId];
        if (currentEncounter && currentAct) {
            // Split "Act 1: The Nebula's Embrace" to get just "Act 1" and combine with displayName
            return `${currentAct.title.split(':')[0]}: ${currentEncounter.displayName}`;
        }
    }
    if (pageId === 'characterIntro' && gameData.characters) {
        // This logic remains the same for character intros
        const charKeys = Object.keys(gameData.characters);
        // currentEncounter is used here to cycle through characters (assuming it's 1-indexed for chars)
        const currentCharIndex = gameState.currentEncounter - 1;
        const currentChar = gameData.characters[charKeys[currentCharIndex]];
        if (currentChar) {
            return `Meet ${currentChar.name}`;
        }
    }
    return `Page: ${pageId}`;
}

/**
 * Retrieves an encounter object by its ID from the global encounter lookup table.
 * @param {string} encounterId - The ID of the encounter to find.
 * @returns {object|null} The encounter object or null if not found.
 */
function getEncounterById(encounterId) {
    if (gameData.encounterLookup && gameData.encounterLookup[encounterId]) {
        return gameData.encounterLookup[encounterId];
    }
    console.error(`Encounter with ID "${encounterId}" not found in lookup table.`);
    return null;
}


function playBgMusic() {
    bgMusic.volume = 0.3;
    bgMusic.play().catch(e => console.log("Background music play failed:", e));
}

function stopBgMusic() {
    bgMusic.pause();
    bgMusic.currentTime = 0;
}

function playSfx(audioElement, volume = 0.7) {
    audioElement.currentTime = 0;
    audioElement.volume = volume;
    audioElement.play().catch(e => console.log("SFX play failed:", e));
}

function startTypingSfx() {
    if (sfxTyping.paused || sfxTyping.ended) {
        playSfx(sfxTyping, 0.4);
    }
}

function stopTypingSfx() {
    sfxTyping.pause();
    sfxTyping.currentTime = 0;
}

function updateStatusDisplay() {
    statusDisplayElem.innerHTML = `
        <strong>Ship Health:</strong> ${gameState.shipHealth}<br>
        <strong>Crew Morale:</strong> ${gameState.crewHealth}<br>
        <strong>Treasure:</strong> ${gameState.treasure} credits
    `;
    statusDisplayElem.classList.remove('hidden');
}

async function typeText(element, text, speed = 30) {
    return new Promise(resolve => {
        if (typingInterval) {
            clearInterval(typingInterval);
        }
        stopTypingSfx();

        element.textContent = '';
        let i = 0;

        currentTypingResolve = resolve;
        currentlyTypingElement = element;
        isTypingActive = true;

        startTypingSfx();

        typingInterval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(typingInterval);
                stopTypingSfx();
                isTypingActive = false;
                currentTypingResolve();
                currentTypingResolve = null;
                currentlyTypingElement = null;
            }
        }, speed);
    });
}

function handleGlobalInteractionToSkip(event) {
    if (event.type === 'keydown' && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
    }

    if (isTypingActive && currentTypingResolve && currentlyTypingElement) {
        clearInterval(typingInterval);
        stopTypingSfx();

        const fullText = currentlyTypingElement.getAttribute('data-full-text');
        if (fullText) {
            currentlyTypingElement.textContent = fullText;
        }

        isTypingActive = false;
        currentTypingResolve();
        currentTypingResolve = null;
        currentlyTypingElement = null;

        event.stopPropagation();
    }
}

/**
 * Main function to display different game pages based on gameState.currentPage.
 * @param {string} pageId - The ID of the page to display.
 */
async function displayPage(pageId) {
    // Hide all major containers initially
    gameTitleElem.classList.add('hidden');
    gameSubtitleElem.classList.add('hidden');
    gameContentElem.classList.add('hidden');
    choicesContainerElem.classList.add('hidden');
    statusDisplayElem.classList.add('hidden');
    nextButton.classList.add('hidden');
    splashImageElem.classList.add('hidden');
    characterPortraitElem.classList.add('hidden');
    encounterImageElem.classList.add('hidden');

    // Clear previous content
    gameTitleElem.textContent = '';
    gameSubtitleElem.textContent = '';
    gameContentElem.textContent = '';
    choicesContainerElem.innerHTML = '';

    // Stop any active typing
    if (isTypingActive) {
        clearInterval(typingInterval);
        stopTypingSfx();
        isTypingActive = false;
        if (currentTypingResolve) {
            currentTypingResolve();
            currentTypingResolve = null;
        }
        currentlyTypingElement = null;
    }

    // Disable buttons while typing/loading
    nextButton.disabled = true;
    // Don't disable choicesContainerElem directly, but the buttons inside it
    document.querySelectorAll('.choice-button').forEach(button => button.disabled = true);


    // Set data-full-text attribute for typing skip functionality
    gameTitleElem.removeAttribute('data-full-text');
    gameSubtitleElem.removeAttribute('data-full-text');
    gameContentElem.removeAttribute('data-full-text');

    const titleText = getPageTitle(pageId);
    if (titleText) {
        gameTitleElem.classList.remove('hidden');
        gameTitleElem.setAttribute('data-full-text', titleText);
    }

    // --- Page Specific Logic ---
    switch (pageId) {
        case 'loading':
            gameTitleElem.textContent = "Loading Game Data...";
            gameContentElem.textContent = "Please wait.";
            gameContentElem.classList.remove('hidden');
            break;

        case 'splashScreen':
            gameSubtitleElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            if (staticGameNarrative.splashScreen.image) {
                splashImageElem.src = `assets/${staticGameNarrative.splashScreen.image}`;
                splashImageElem.classList.remove('hidden');
            }

            await typeText(gameTitleElem, titleText, 50);
            gameSubtitleElem.setAttribute('data-full-text', staticGameNarrative.splashScreen.subtitle);
            await typeText(gameSubtitleElem, staticGameNarrative.splashScreen.subtitle, 40);
            nextButton.textContent = "Launch Into the Unknown";
            nextButton.disabled = false;
            break;

        case 'introGame':
        case 'introCrewDynamics':
        case 'missionBrief':
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');

            await typeText(gameTitleElem, titleText, 50);
            let contentText = '';
            if (pageId === 'introGame') contentText = staticGameNarrative.introGame.text;
            if (pageId === 'introCrewDynamics') contentText = staticGameNarrative.introCrewDynamics.text;
            if (pageId === 'missionBrief') contentText = staticGameNarrative.missionBrief.text;

            gameContentElem.setAttribute('data-full-text', contentText);
            await typeText(gameContentElem, contentText, 30);
            nextButton.textContent = "Continue";
            nextButton.disabled = false;
            break;

        case 'characterIntro':
            if (!gameData.characters) {
                console.error("Characters data not loaded yet!");
                // Fallback to mission brief if characters don't load or all intros are done
                gameState.currentPage = 'missionBrief';
                displayPage(gameState.currentPage);
                return;
            }
            const charKeys = Object.keys(gameData.characters);
            // currentEncounter is used here to cycle through characters (1-indexed)
            const currentCharIndex = gameState.currentEncounter - 1;
            const currentChar = gameData.characters[charKeys[currentCharIndex]];

            if (currentChar) {
                gameContentElem.classList.remove('hidden');
                nextButton.classList.remove('hidden');
                characterPortraitElem.classList.remove('hidden');

                await typeText(gameTitleElem, titleText, 50);

                const imagePath = `assets/${currentChar.portrait}`;
                characterPortraitElem.src = imagePath;

                let traitsText = `Traits:\n`;
                traitsText += currentChar.traits.map(trait => `  - ${trait}`).join('\n');
                gameContentElem.setAttribute('data-full-text', traitsText);
                await typeText(gameContentElem, traitsText, 30);

                nextButton.textContent = "Continue";
                nextButton.disabled = false;
            } else {
                // No more characters to introduce, move to mission brief
                gameState.currentPage = 'missionBrief';
                displayPage(gameState.currentPage);
                return;
            }
            break;

        case 'actTitle':
            if (!gameData.acts) {
                console.error("Acts data not loaded yet!");
                endGame("error");
                return;
            }
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');

            const currentAct = gameData.acts[gameState.currentAct];
            const actDescriptionText = currentAct.actDescription || "Press continue to face your first encounter...";

            await typeText(gameTitleElem, titleText, 50);
            gameContentElem.setAttribute('data-full-text', actDescriptionText);
            await typeText(gameContentElem, actDescriptionText, 30);
            nextButton.textContent = "Continue";
            nextButton.disabled = false;
            break;

        case 'encounter':
            if (!gameData.acts || !gameState.currentEncounterId) {
                console.error("Game data or current encounter ID missing for 'encounter' page!");
                endGame("error");
                return;
            }
            // Get the current encounter using its ID
            const encounter = getEncounterById(gameState.currentEncounterId);

            if (!encounter) {
                console.error("Could not find encounter for currentEncounterId:", gameState.currentEncounterId);
                endGame("error"); // Handle case where ID is invalid
                return;
            }

            // Title is handled by getPageTitle for 'encounter'
            await typeText(gameTitleElem, getPageTitle('encounter'), 50); // Type the dynamic title

            gameContentElem.classList.remove('hidden');

            if (encounter.image) {
                encounterImageElem.src = `assets/${encounter.image}`; // Make sure image path is correct
                encounterImageElem.classList.remove('hidden');
            } else {
                encounterImageElem.classList.add('hidden');
            }

            gameContentElem.setAttribute('data-full-text', encounter.scenario);
            await typeText(gameContentElem, encounter.scenario);

            choicesContainerElem.classList.remove('hidden');
            updateStatusDisplay();

            // --- UPDATED: Create and append option buttons with condition checks ---
            encounter.options.forEach((option) => {
                let showOption = true; // Assume option is shown by default

                if (option.condition) {
                    const conditionType = option.condition.type;
                    const conditionValue = option.condition.value;
                    const conditionFlag = option.condition.flag; // For specialEffect type
                    const comparison = option.condition.comparison;

                    switch (conditionType) {
                        case "treasure":
                            if (comparison === "greaterThanOrEqual") {
                                showOption = gameState.treasure >= conditionValue;
                            } else if (comparison === "lessThan") {
                                showOption = gameState.treasure < conditionValue;
                            }
                            break;
                        case "shipHealth":
                            if (comparison === "greaterThanOrEqual") {
                                showOption = gameState.shipHealth >= conditionValue;
                            } else if (comparison === "lessThan") {
                                showOption = gameState.shipHealth < conditionValue;
                            }
                            break;
                        case "crewHealth":
                            if (comparison === "greaterThanOrEqual") {
                                showOption = gameState.crewHealth >= conditionValue;
                            } else if (comparison === "lessThan") {
                                showOption = gameState.crewHealth < conditionValue;
                            }
                            break;
                        case "specialEffect":
                            if (conditionFlag === "rivalFactionEncountered") {
                                if (comparison === "set") {
                                    showOption = gameState.rivalFactionEncountered;
                                } else if (comparison === "not_set") {
                                    showOption = !gameState.rivalFactionEncountered;
                                }
                            } else if (conditionFlag === "shipShieldBoost") {
                                if (comparison === "set") {
                                    showOption = gameState.shipShieldBoostActive;
                                } else if (comparison === "not_set") {
                                    showOption = !gameState.shipShieldBoostActive;
                                }
                            } else {
                                // For generic specialEffects array
                                if (comparison === "set") {
                                    showOption = gameState.specialEffects.includes(conditionFlag);
                                } else if (comparison === "not_set") {
                                    showOption = !gameState.specialEffects.includes(conditionFlag);
                                }
                            }
                            break;
                    }
                }

                // Only create the button if the condition is met (or if there's no condition)
                if (showOption) {
                    const choiceButton = document.createElement('button');
                    choiceButton.classList.add('game-button', 'choice-button');
                    choiceButton.textContent = option.text;
                    choiceButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Pass the entire outcome object to handleChoice
                        handleChoice(option.outcome);
                    });
                    choicesContainerElem.appendChild(choiceButton);
                }
            });
            // --- END UPDATED ---

            document.querySelectorAll('.choice-button').forEach(button => button.disabled = false); // Enable choice buttons
            break;

        case 'results':
            if (!gameState.lastChoiceOutcome) {
                console.error("No last choice outcome to display results for!");
                endGame("error");
                return;
            }

            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');

            await typeText(gameTitleElem, titleText, 50); // "Encounter Results"

            // Display the outcome text
            gameContentElem.setAttribute('data-full-text', gameState.lastChoiceOutcome.text);
            await typeText(gameContentElem, gameState.lastChoiceOutcome.text);

            if (gameState.lastChoiceOutcome.image) {
                encounterImageElem.src = `assets/${gameState.lastChoiceOutcome.image}`;
                encounterImageElem.classList.remove('hidden');
            } else {
                encounterImageElem.classList.add('hidden');
            }

            // Stats already updated in handleChoice, just refresh display
            updateStatusDisplay();

            nextButton.textContent = "Continue";
            nextButton.disabled = false;
            break;

        case 'actSummary':
            if (!gameData.acts || !gameData.acts[gameState.currentAct]) {
                console.error("Act data missing for act summary!");
                endGame("error");
                return;
            }
            const currentActSummaryText = gameData.acts[gameState.currentAct].summary;
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');

            await typeText(gameTitleElem, titleText, 50); // "Act X Summary"
            gameContentElem.setAttribute('data-full-text', currentActSummaryText);
            await typeText(gameContentElem, currentActSummaryText, 30);
            nextButton.textContent = "Proceed to Next Act";
            updateStatusDisplay();
            nextButton.disabled = false;
            break;

        case 'conclusion':
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            stopBgMusic(); // Stop music at conclusion

            await typeText(gameTitleElem, titleText, 50);

            let conclusionText = staticGameNarrative.conclusion + "\n\n";
            conclusionText += `Final Ship Health: ${gameState.shipHealth}<br>`;
            conclusionText += `Final Crew Morale: ${gameState.crewHealth}<br>`;
            conclusionText += `Final Treasure: ${gameState.treasure} credits<br><br>`;

            let outcomeMessage = "";

            if (gameState.treasure <= 591) {
                outcomeMessage += "Your treasure haul is minimal. While not entirely empty, the cosmos holds far greater riches. Perhaps next time, aim higher than mere scraps.<br>";
            } else if (gameState.treasure <= 783) {
                outcomeMessage += "A respectable amount of treasure was secured, proving your efforts were not entirely in vain.<br>";
            } else {
                outcomeMessage += "Your treasure haul is legendary! You've plundered the cosmos with remarkable efficiency and daring.<br>";
            }

            if (gameState.shipHealth <= 20) {
                outcomeMessage += "Your ship barely clings to existence, a crumpled hulk limping home. Such disregard for your vessel's integrity is truly regrettable.<br>";
            } else if (gameState.shipHealth <= 40) {
                outcomeMessage += "Your ship shows the scars of many skirmishes. While it survived, one wonders if more prudent navigation could have preserved its integrity.<br>";
            } else {
                outcomeMessage += "Your vessel returns pristine, a testament to your masterful piloting and tactical prowess. Truly, a magnificent ship guided by a magnificent captain.<br>";
            }

            if (gameState.crewHealth <= 70) {
                outcomeMessage += "Your crew is decimated, barely a whisper of their former selves. Their sacrifices weigh heavily on your conscience. Perhaps leadership isn't your forte.<br>";
            } else if (gameState.crewHealth <= 80) {
                outcomeMessage += "Your crew is weary and bruised, but their spirit remains. They've endured much under your command.<br>";
            } else {
                outcomeMessage += "Your crew stands tall, vibrant and unyielding. Their health and morale are a testament to your exemplary leadership and care.<br>";
            }

            conclusionText += outcomeMessage + "<br>";

            if (gameState.treasure >= 784 && gameState.shipHealth >= 41 && gameState.crewHealth >= 81) {
                conclusionText += "Captain, your performance was exemplary. A legendary journey indeed!";
            } else if (gameState.treasure >= 592 || gameState.shipHealth >= 21 || gameState.crewHealth >= 71) {
                conclusionText += "A challenging journey, but you guided your crew through to a respectable conclusion.";
            } else {
                conclusionText += "Though your journey concluded, it was fraught with struggle. Perhaps next time, greater fortunes await.";
            }

            gameContentElem.setAttribute('data-full-text', conclusionText);
            await typeText(gameContentElem, conclusionText, 30);

            nextButton.textContent = "Restart Game";
            nextButton.disabled = false;
            break;

        case 'gameOver':
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            stopBgMusic(); // Stop music on game over

            await typeText(gameTitleElem, titleText, 50);

            let gameOverMessage = "";
            if (gameState.gameOverReason === 'shipDestroyed') {
                gameOverMessage = "Your ship sustained critical damage and was destroyed. The mission is a failure.";
            } else if (gameState.gameOverReason === 'crewPerished') {
                gameOverMessage = "Your crew suffered catastrophic losses. With no one left to pilot the ship, your adventure ends here.";
            } else {
                gameOverMessage = "An unforeseen anomaly has ended your journey.";
            }

            gameOverMessage += `<br><br>Final Ship Health: ${gameState.shipHealth}`;
            gameOverMessage += `<br>Final Crew Morale: ${gameState.crewHealth}`;
            gameOverMessage += `<br>Final Treasure: ${gameState.treasure} credits`;

            gameContentElem.setAttribute('data-full-text', gameOverMessage);
            await typeText(gameContentElem, gameOverMessage, 30);

            nextButton.textContent = "Restart Game";
            nextButton.disabled = false;
            break;

        default:
            gameContentElem.classList.remove('hidden');
            await typeText(gameTitleElem, titleText, 50);
            gameContentElem.setAttribute('data-full-text', "An unknown game state occurred.");
            await typeText(gameContentElem, "An unknown game state occurred.", 30);
            break;
    }
}

// --- Event Handlers ---
nextButton.addEventListener('click', (e) => {
    e.stopPropagation();

    playSfx(sfxButtonClick);

    // If typing is active, skip it
    if (isTypingActive && currentTypingResolve) {
        handleGlobalInteractionToSkip(e);
        return;
    }

    if (gameState.currentPage === 'splashScreen') {
        playBgMusic(); // Start background music after splash
    }

    // Handles restart from game over/conclusion
    if (gameState.currentPage === 'gameOver' || gameState.currentPage === 'conclusion') {
        // Reset game state to initial values
        gameState = {
            currentPage: 'splashScreen',
            shipHealth: 100,
            crewHealth: 100,
            treasure: 0,
            currentAct: 0,
            currentEncounterId: null, // Reset to null as we're going back to splash
            lastChoiceOutcome: null,
            rivalFactionEncountered: false,
            shipShieldBoostActive: false, // Reset this flag too
            specialEffects: [], // Reset this array
            gameOverReason: null
        };
        displayPage(gameState.currentPage);
        return;
    }

    // --- Page Progression Logic ---
    switch (gameState.currentPage) {
        case 'splashScreen':
            gameState.currentPage = 'introGame';
            break;
        case 'introGame':
            gameState.currentPage = 'introCrewDynamics';
            break;
        case 'introCrewDynamics':
            // Start character intros from the first character (currentEncounter as a character index)
            gameState.currentEncounter = 1; // 1-indexed for character intros
            gameState.currentPage = 'characterIntro';
            break;
        case 'characterIntro':
            gameState.currentEncounter++; // Move to next character
            // Check if all characters have been introduced
            if (gameState.currentEncounter > Object.keys(gameData.characters).length) {
                gameState.currentPage = 'missionBrief'; // All characters done, move to mission brief
                gameState.currentEncounter = 0; // Reset for actual encounter tracking
            }
            break;
        case 'missionBrief':
            gameState.currentAct = 0; // Start at the first act (index 0)
            // Set the current encounter ID to the first encounter of the first act
            if (gameData.acts[0] && gameData.acts[0].encounters[0]) {
                gameState.currentEncounterId = gameData.acts[0].encounters[0].id;
                gameState.currentPage = 'actTitle'; // Go to act title screen first
            } else {
                console.error("No first act or encounter to start the game!");
                endGame("error");
                return;
            }
            break;
        case 'actTitle':
            gameState.currentPage = 'encounter'; // After act title, go to the first encounter of that act
            break;

        // --- MODIFIED LOGIC FOR 'results' PAGE TRANSITION ---
        case 'results':
            // After displaying results, determine the next step based on the outcome's nextId.
            // gameState.currentEncounterId was already set by handleChoice to the intended next encounter ID.
            const targetEncounterId = gameState.currentEncounterId;

            if (targetEncounterId === null) {
                // If nextId was null, it means the game should conclude
                gameState.currentPage = 'conclusion';
            } else {
                // Find which act this targetEncounterId belongs to
                let newActIndex = -1;
                for (let i = 0; i < gameData.acts.length; i++) {
                    if (gameData.acts[i].encounters.some(enc => enc.id === targetEncounterId)) {
                        newActIndex = i;
                        break;
                    }
                }

                if (newActIndex === -1) {
                    console.error(`Outcome.nextId "${targetEncounterId}" does not point to a valid encounter.`);
                    endGame("error"); // Critical error: invalid nextId
                    return;
                }

                // Check if the target is the first encounter of a *new* act
                const isFirstEncounterOfNewAct = (newActIndex > gameState.currentAct) &&
                                                gameData.acts[newActIndex] &&
                                                gameData.acts[newActIndex].encounters.length > 0 &&
                                                gameData.acts[newActIndex].encounters[0].id === targetEncounterId;

                if (isFirstEncounterOfNewAct) {
                    // It's the end of the current act, show summary for the current act
                    gameState.currentPage = 'actSummary';
                    // gameState.currentAct is already set to the *previous* act for the summary display
                    // It will be incremented AFTER the summary page is displayed
                } else {
                    // It's an encounter within the current act or a jump to an encounter in a previous act
                    gameState.currentPage = 'encounter';
                    gameState.currentAct = newActIndex; // Update currentAct if the next encounter is in a different act
                    // gameState.currentEncounterId is already set to targetEncounterId
                }
            }
            break;
        // --- END MODIFIED LOGIC ---

        case 'actSummary':
            gameState.currentAct++; // Move to the next act index
            if (gameState.currentAct < gameData.acts.length) {
                // If there's a next act, set the currentEncounterId to its first encounter
                if (gameData.acts[gameState.currentAct] && gameData.acts[gameState.currentAct].encounters[0]) {
                    gameState.currentEncounterId = gameData.acts[gameState.currentAct].encounters[0].id;
                    gameState.currentPage = 'actTitle'; // Show the next act's title screen
                } else {
                    console.error(`Act ${gameState.currentAct} has no encounters defined!`);
                    endGame("error");
                    return;
                }
            } else {
                // All acts completed, move to the conclusion
                gameState.currentPage = 'conclusion';
            }
            break;
    }
    displayPage(gameState.currentPage);
});

/**
 * Handles a player's choice by applying the outcome and navigating to the next page.
 * This is the central function for branching.
 * @param {object} outcome - The outcome object from the chosen option in encounters.json.
 */
function handleChoice(outcome) {
    playSfx(sfxButtonClick);
    gameState.lastChoiceOutcome = outcome; // Store the outcome for the 'results' page display

    // Apply health and treasure changes
    gameState.shipHealth += outcome.shipHealthChange || 0;
    gameState.crewHealth += outcome.crewHealthChange || 0;
    gameState.treasure += outcome.treasureChange || 0;

    // Clamp health values
    gameState.shipHealth = Math.max(0, gameState.shipHealth);
    gameState.crewHealth = Math.max(0, gameState.crewHealth);

    // Apply special effects based on the outcome
    if (outcome.specialEffect) {
        if (outcome.specialEffect === "rivalFactionEncountered") {
            gameState.rivalFactionEncountered = true;
        } else if (outcome.specialEffect === "shipShieldBoost") {
            gameState.shipShieldBoostActive = true;
        } else if (outcome.specialEffect === "temporaryShieldBoost") {
            console.log("Temporary Shield Boost acquired!"); // Example, actual temp effect logic needed
        }
        else {
            if (!gameState.specialEffects.includes(outcome.specialEffect)) {
                gameState.specialEffects.push(outcome.specialEffect);
            }
        }
        console.log("Applied special effect:", outcome.specialEffect);
    }

    // Check for game over conditions immediately after applying outcome
    if (gameState.shipHealth <= 0) {
        gameState.gameOverReason = 'shipDestroyed';
        gameState.currentPage = 'gameOver';
        displayPage(gameState.currentPage);
        return;
    }
    if (gameState.crewHealth <= 0) {
        gameState.gameOverReason = 'crewPerished';
        gameState.currentPage = 'gameOver';
        displayPage(gameState.currentPage);
        return;
    }

    // --- MODIFIED LOGIC FOR handleChoice: Always go to 'results' first ---
    // Store the nextId in gameState.currentEncounterId for the nextButton to process.
    // The determination of 'actSummary' vs 'encounter' will now happen in nextButton.
    gameState.currentEncounterId = outcome.nextId;

    if (outcome.nextId === null) {
        // If the outcome explicitly ends the game path
        gameState.currentPage = 'conclusion';
    } else {
        // Otherwise, always go to the 'results' page first to show the outcome text
        gameState.currentPage = 'results';
    }
    displayPage(gameState.currentPage);
    // --- END MODIFIED LOGIC ---
}

// --- Global Event Listeners ---
document.addEventListener('click', handleGlobalInteractionToSkip);
document.addEventListener('keydown', handleGlobalInteractionToSkip);

// --- Initialization ---
async function initializeGame() {
    displayPage('loading'); // Show loading screen

    try {
        // Fetch characters data
        const charactersResponse = await fetch('data/characters.json');
        const charactersData = await charactersResponse.json();

        // Fetch encounters data (acts)
        const encountersResponse = await fetch('data/encounters.json');
        const actsData = await encountersResponse.json();

        // Build a lookup table for encounters by ID for quick access
        const encounterLookup = {};
        actsData.forEach(act => {
            act.encounters.forEach(encounter => {
                if (encounterLookup[encounter.id]) {
                    console.warn(`Duplicate encounter ID found: ${encounter.id}. This will cause issues with branching.`);
                }
                encounterLookup[encounter.id] = encounter;
            });
        });

        // Populate gameData object
        gameData = {
            ...staticGameNarrative, // Include your static narrative pieces
            characters: charactersData,
            acts: actsData, // Keep the structured acts array for act titles/summaries
            encounterLookup: encounterLookup // The new lookup table for direct ID access
        };

        console.log("Game data loaded successfully:", gameData);
        console.log("Encounter Lookup Table:", gameData.encounterLookup); // Verify in console

        // Set initial game state and display splash screen
        gameState.currentPage = 'splashScreen';
        displayPage(gameState.currentPage);

    } catch (error) {
        console.error("Failed to load game data:", error);
        gameTitleElem.textContent = "Error Loading Game!";
        gameContentElem.textContent = "Please check your network connection or file paths. (See console for details)";
        gameTitleElem.classList.remove('hidden');
        gameContentElem.classList.remove('hidden');
    }
}

// Function to handle critical errors that halt the game
function endGame(reason = "unknown") {
    gameState.gameOverReason = reason;
    gameState.currentPage = 'gameOver';
    displayPage(gameState.currentPage);
}


// Start the game initialization when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeGame);