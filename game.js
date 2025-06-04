let gameData = {};
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
    'results': 'Encounter Results',
    'conclusion': 'You Have Completed Your Quest!',
    'gameOver': 'Game Over!',
    'error': 'Error'
};

let gameState = {
    currentPage: 'loading',
    shipHealth: 100,
    crewHealth: 100,
    treasure: 0,
    currentAct: 0,
    currentEncounterId: null,
    lastChoiceOutcome: null,
    rivalFactionEncountered: false,
    shipShieldBoostActive: false,
    specialEffects: [],
    gameOverReason: null
};

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

function getPageTitle(pageId) {
    if (pageTitles[pageId]) {
        return pageTitles[pageId];
    }
    if (pageId === 'splashScreen') {
        return staticGameNarrative.splashScreen.title;
    }
    if (pageId === 'actTitle' && gameData.acts && gameData.acts[gameState.currentAct]) {
        return gameData.acts[gameState.currentAct].title;
    }
    if (pageId === 'actSummary' && gameData.acts && gameData.acts[gameState.currentAct]) {
        return `Act ${gameState.currentAct + 1} Summary`;
    }
    if (pageId === 'encounter' && gameData.acts && gameData.acts[gameState.currentAct] && gameState.currentEncounterId) {
        const currentAct = gameData.acts[gameState.currentAct];
        const currentEncounter = gameData.encounterLookup[gameState.currentEncounterId];
        if (currentEncounter && currentAct) {
            return `${currentAct.title.split(':')[0]}: ${currentEncounter.displayName}`;
        }
    }
    if (pageId === 'characterIntro' && gameData.characters) {
        const charKeys = Object.keys(gameData.characters);
        const currentCharIndex = gameState.currentEncounter - 1;
        const currentChar = gameData.characters[charKeys[currentCharIndex]];
        if (currentChar) {
            return `Meet ${currentChar.name}`;
        }
    }
    return `Page: ${pageId}`;
}

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

// MODIFIED: typeText function to handle HTML tags
async function typeText(element, text, speed = 30) {
    return new Promise(resolve => {
        if (typingInterval) {
            clearInterval(typingInterval);
        }
        stopTypingSfx();

        element.textContent = ''; // Clear text content initially
        element.removeAttribute('data-full-text-html'); // Clear previous HTML data

        let i = 0;

        currentTypingResolve = resolve;
        currentlyTypingElement = element;
        isTypingActive = true;

        // Store the original text with HTML for when typing is skipped
        element.setAttribute('data-full-text-html', text);

        startTypingSfx();

        typingInterval = setInterval(() => {
            if (i < text.length) {
                // Check if the current characters form a <br> tag
                if (text.substring(i, i + 4) === '<br>') {
                    element.innerHTML += '<br>'; // Append the actual line break
                    i += 4; // Advance index past the entire <br> tag
                } else {
                    element.innerHTML += text.charAt(i); // Append character using innerHTML
                    i++;
                }
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

// MODIFIED: handleGlobalInteractionToSkip function to use innerHTML
function handleGlobalInteractionToSkip(event) {
    if (event.type === 'keydown' && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
    }

    if (isTypingActive && currentTypingResolve && currentlyTypingElement) {
        clearInterval(typingInterval);
        stopTypingSfx();

        // Retrieve the full text with HTML
        const fullHtml = currentlyTypingElement.getAttribute('data-full-text-html');
        if (fullHtml) {
            currentlyTypingElement.innerHTML = fullHtml; // Set as innerHTML
        }

        isTypingActive = false;
        currentTypingResolve();
        currentTypingResolve = null;
        currentlyTypingElement = null;

        event.stopPropagation();
    }
}

async function displayPage(pageId) {
    gameTitleElem.classList.add('hidden');
    gameSubtitleElem.classList.add('hidden');
    gameContentElem.classList.add('hidden');
    choicesContainerElem.classList.add('hidden');
    statusDisplayElem.classList.add('hidden');
    nextButton.classList.add('hidden');
    splashImageElem.classList.add('hidden');
    characterPortraitElem.classList.add('hidden');
    encounterImageElem.classList.add('hidden');

    gameTitleElem.textContent = '';
    gameSubtitleElem.textContent = '';
    gameContentElem.textContent = '';
    choicesContainerElem.innerHTML = '';

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

    nextButton.disabled = true;
    document.querySelectorAll('.choice-button').forEach(button => button.disabled = true);

    // Removed data-full-text as it's replaced by data-full-text-html in typeText
    gameTitleElem.removeAttribute('data-full-text');
    gameSubtitleElem.removeAttribute('data-full-text');
    gameContentElem.removeAttribute('data-full-text');


    const titleText = getPageTitle(pageId);
    if (titleText) {
        gameTitleElem.classList.remove('hidden');
        // Now typeText internally manages setting 'data-full-text-html'
    }

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

            await typeText(gameContentElem, contentText, 30);
            nextButton.textContent = "Continue";
            nextButton.disabled = false;
            break;

        case 'characterIntro':
            if (!gameData.characters) {
                console.error("Characters data not loaded yet!");
                gameState.currentPage = 'missionBrief';
                displayPage(gameState.currentPage);
                return;
            }
            const charKeys = Object.keys(gameData.characters);
            const currentCharIndex = gameState.currentEncounter - 1;
            const currentChar = gameData.characters[charKeys[currentCharIndex]];

            if (currentChar) {
                gameContentElem.classList.remove('hidden');
                nextButton.classList.remove('hidden');
                characterPortraitElem.classList.remove('hidden');

                await typeText(gameTitleElem, titleText, 50);

                const imagePath = `assets/${currentChar.portrait}`;
                characterPortraitElem.src = imagePath;

                let traitsText = `Traits:<br>`; // Changed to <br> for consistency if desired
                traitsText += currentChar.traits.map(trait => `  - ${trait}`).join('<br>');
                await typeText(gameContentElem, traitsText, 30);

                nextButton.textContent = "Continue";
                nextButton.disabled = false;
            } else {
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
            const encounter = getEncounterById(gameState.currentEncounterId);

            if (!encounter) {
                console.error("Could not find encounter for currentEncounterId:", gameState.currentEncounterId);
                endGame("error");
                return;
            }

            await typeText(gameTitleElem, getPageTitle('encounter'), 50);

            gameContentElem.classList.remove('hidden');

            if (encounter.image) {
                encounterImageElem.src = `assets/${encounter.image}`;
                encounterImageElem.classList.remove('hidden');
            } else {
                encounterImageElem.classList.add('hidden');
            }

            await typeText(gameContentElem, encounter.scenario);

            choicesContainerElem.classList.remove('hidden');
            updateStatusDisplay();

            encounter.options.forEach((option) => {
                let showOption = true;

                if (option.condition) {
                    const conditionType = option.condition.type;
                    const conditionValue = option.condition.value;
                    const conditionFlag = option.condition.flag;
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
                                if (comparison === "set") {
                                    showOption = gameState.specialEffects.includes(conditionFlag);
                                } else if (comparison === "not_set") {
                                    showOption = !gameState.specialEffects.includes(conditionFlag);
                                }
                            }
                            break;
                    }
                }

                if (showOption) {
                    const choiceButton = document.createElement('button');
                    choiceButton.classList.add('game-button', 'choice-button');
                    choiceButton.textContent = option.text;
                    choiceButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        handleChoice(option.outcome);
                    });
                    choicesContainerElem.appendChild(choiceButton);
                }
            });
            document.querySelectorAll('.choice-button').forEach(button => button.disabled = false);
            break;

        case 'results':
            if (!gameState.lastChoiceOutcome) {
                console.error("No last choice outcome to display results for!");
                endGame("error");
                return;
            }

            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');

            await typeText(gameTitleElem, titleText, 50);

            await typeText(gameContentElem, gameState.lastChoiceOutcome.text);

            if (gameState.lastChoiceOutcome.image) {
                encounterImageElem.src = `assets/${gameState.lastChoiceOutcome.image}`;
                encounterImageElem.classList.remove('hidden');
            } else {
                encounterImageElem.classList.add('hidden');
            }

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

            await typeText(gameTitleElem, titleText, 50);
            await typeText(gameContentElem, currentActSummaryText, 30);
            nextButton.textContent = "Proceed to Next Act";
            updateStatusDisplay();
            nextButton.disabled = false;
            break;

        case 'conclusion':
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            stopBgMusic();

            await typeText(gameTitleElem, titleText, 50);

            let conclusionText = staticGameNarrative.conclusion + "<br><br>";
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

            await typeText(gameContentElem, conclusionText, 30);

            nextButton.textContent = "Restart Game";
            nextButton.disabled = false;
            break;

        case 'gameOver':
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            stopBgMusic();

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

            await typeText(gameContentElem, gameOverMessage, 30);

            nextButton.textContent = "Restart Game";
            nextButton.disabled = false;
            break;

        default:
            gameContentElem.classList.remove('hidden');
            await typeText(gameTitleElem, titleText, 50);
            await typeText(gameContentElem, "An unknown game state occurred.", 30);
            break;
    }
}

nextButton.addEventListener('click', (e) => {
    e.stopPropagation();

    playSfx(sfxButtonClick);

    if (isTypingActive && currentTypingResolve) {
        handleGlobalInteractionToSkip(e);
        return;
    }

    if (gameState.currentPage === 'splashScreen') {
        playBgMusic();
    }

    if (gameState.currentPage === 'gameOver' || gameState.currentPage === 'conclusion') {
        gameState = {
            currentPage: 'splashScreen',
            shipHealth: 100,
            crewHealth: 100,
            treasure: 0,
            currentAct: 0,
            currentEncounterId: null,
            lastChoiceOutcome: null,
            rivalFactionEncountered: false,
            shipShieldBoostActive: false,
            specialEffects: [],
            gameOverReason: null
        };
        displayPage(gameState.currentPage);
        return;
    }

    switch (gameState.currentPage) {
        case 'splashScreen':
            gameState.currentPage = 'introGame';
            break;
        case 'introGame':
            gameState.currentPage = 'introCrewDynamics';
            break;
        case 'introCrewDynamics':
            gameState.currentEncounter = 1;
            gameState.currentPage = 'characterIntro';
            break;
        case 'characterIntro':
            gameState.currentEncounter++;
            if (gameState.currentEncounter > Object.keys(gameData.characters).length) {
                gameState.currentPage = 'missionBrief';
                gameState.currentEncounter = 0;
            }
            break;
        case 'missionBrief':
            gameState.currentAct = 0;
            if (gameData.acts[0] && gameData.acts[0].encounters[0]) {
                gameState.currentEncounterId = gameData.acts[0].encounters[0].id;
                gameState.currentPage = 'actTitle';
            } else {
                console.error("No first act or encounter to start the game!");
                endGame("error");
                return;
            }
            break;
        case 'actTitle':
            gameState.currentPage = 'encounter';
            break;

        case 'results':
            const targetEncounterId = gameState.currentEncounterId;

            if (targetEncounterId === null) {
                gameState.currentPage = 'conclusion';
            } else {
                let newActIndex = -1;
                for (let i = 0; i < gameData.acts.length; i++) {
                    if (gameData.acts[i].encounters.some(enc => enc.id === targetEncounterId)) {
                        newActIndex = i;
                        break;
                    }
                }

                if (newActIndex === -1) {
                    console.error(`Outcome.nextId "${targetEncounterId}" does not point to a valid encounter.`);
                    endGame("error");
                    return;
                }

                const isFirstEncounterOfNewAct = (newActIndex > gameState.currentAct) &&
                                                gameData.acts[newActIndex] &&
                                                gameData.acts[newActIndex].encounters.length > 0 &&
                                                gameData.acts[newActIndex].encounters[0].id === targetEncounterId;

                if (isFirstEncounterOfNewAct) {
                    gameState.currentPage = 'actSummary';
                } else {
                    gameState.currentPage = 'encounter';
                    gameState.currentAct = newActIndex;
                }
            }
            break;

        case 'actSummary':
            gameState.currentAct++;
            if (gameState.currentAct < gameData.acts.length) {
                if (gameData.acts[gameState.currentAct] && gameData.acts[gameState.currentAct].encounters[0]) {
                    gameState.currentEncounterId = gameData.acts[gameState.currentAct].encounters[0].id;
                    gameState.currentPage = 'actTitle';
                } else {
                    console.error(`Act ${gameState.currentAct} has no encounters defined!`);
                    endGame("error");
                    return;
                }
            } else {
                gameState.currentPage = 'conclusion';
            }
            break;
    }
    displayPage(gameState.currentPage);
});

function handleChoice(outcome) {
    playSfx(sfxButtonClick);
    gameState.lastChoiceOutcome = outcome;

    gameState.shipHealth += outcome.shipHealthChange || 0;
    gameState.crewHealth += outcome.crewHealthChange || 0;
    gameState.treasure += outcome.treasureChange || 0;

    gameState.shipHealth = Math.max(0, gameState.shipHealth);
    gameState.crewHealth = Math.max(0, gameState.crewHealth);

    if (outcome.specialEffect) {
        if (outcome.specialEffect === "rivalFactionEncountered") {
            gameState.rivalFactionEncountered = true;
        } else if (outcome.specialEffect === "shipShieldBoost") {
            gameState.shipShieldBoostActive = true;
        } else if (outcome.specialEffect === "temporaryShieldBoost") {
            console.log("Temporary Shield Boost acquired!");
        }
        else {
            if (!gameState.specialEffects.includes(outcome.specialEffect)) {
                gameState.specialEffects.push(outcome.specialEffect);
            }
        }
        console.log("Applied special effect:", outcome.specialEffect);
    }

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

    gameState.currentEncounterId = outcome.nextId;

    if (outcome.nextId === null) {
        gameState.currentPage = 'conclusion';
    } else {
        gameState.currentPage = 'results';
    }
    displayPage(gameState.currentPage);
}

document.addEventListener('click', handleGlobalInteractionToSkip);
document.addEventListener('keydown', handleGlobalInteractionToSkip);

async function initializeGame() {
    displayPage('loading');

    try {
        const charactersResponse = await fetch('data/characters.json');
        const charactersData = await charactersResponse.json();

        const encountersResponse = await fetch('data/encounters.json');
        const actsData = await encountersResponse.json();

        const encounterLookup = {};
        actsData.forEach(act => {
            act.encounters.forEach(encounter => {
                if (encounterLookup[encounter.id]) {
                    console.warn(`Duplicate encounter ID found: ${encounter.id}. This will cause issues with branching.`);
                }
                encounterLookup[encounter.id] = encounter;
            });
        });

        gameData = {
            ...staticGameNarrative,
            characters: charactersData,
            acts: actsData,
            encounterLookup: encounterLookup
        };

        console.log("Game data loaded successfully:", gameData);
        console.log("Encounter Lookup Table:", gameData.encounterLookup);

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

function endGame(reason = "unknown") {
    gameState.gameOverReason = reason;
    gameState.currentPage = 'gameOver';
    displayPage(gameState.currentPage);
}

document.addEventListener('DOMContentLoaded', initializeGame);