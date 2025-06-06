let gameData = {};
const staticGameNarrative = {
    splashScreen: {
        title: " ",
        subtitle: "Treasure hidden in the void",
        image: "splash_screen_cover.png"
    },
    introGame: {
        text: "Welcome, brave spacefarers! Across the cosmos, legends whisper of the STAR-HEART GEM, a treasure beyond imagination hidden deep within the treacherous Cygnus Nebula. You are the Captain of a renowned crew, charting a course toward this fabled prize. But be warned: every decision you make will echo through the void. Prepare for adventure, danger, and glory!"
    },
    introCrewDynamics: {
        text: "Your crew is your greatest asset: a diverse team, each member bringing unique skills, experiences, and perspectives to the table. As you face the cosmos' trials, their strengths will be tested, and your bonds forged in the fires of space. Your survival and success depend on your collective wisdom.<br><br>Before every critical choice, engage with your crew: discuss the situation, debate the options, and collaboratively decide on the best course of action. Your unity is your power."
    },
    missionBrief: {
        text: "The coordinates are set. Your mission: penetrate the treacherous Cygnus Nebula and locate the fabled Star-Heart Gem. This perilous quest demands more than just courage; it demands cunning, foresight, and a united front.<br><br>At each encounter, you will face critical decisions. Remember to first assess the situation and understand the challenges. Then, consult your crew, leveraging their unique insights through discussion. Finally, make your collective decision, as every choice has a profound impact on your ship, your crew, and your ultimate success.<br><br>Your ultimate objective is clear: Secure the Star-Heart Gem, preserve your crew, and return a legend!"
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
    'error': 'Error',
    'endOfActSummary': 'Act Summary', // NEW: For summary of the completed act
    'newActTitle': 'Act Introduction' // Renamed from actSummary to be clearer
};

let gameState = {
    currentPage: 'loading',
    shipHealth: 100,
    crewHealth: 100,
    treasure: 0,
    currentAct: 0,
    currentEncounterId: null,
    lastChoiceOutcome: null,
    lastEncounterId: null, // NEW: Store the ID of the encounter just completed
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

// Act Indicator DOM element (will be permanently hidden)
const actIndicatorElem = document.getElementById('act-indicator'); 

// Act Progress Bar DOM elements (will be managed dynamically)
const actProgressBarElem = document.getElementById('act-progress-bar');
const actProgressItems = [ // Array to easily access each act span
    document.getElementById('act-progress-1'),
    document.getElementById('act-progress-2'),
    document.getElementById('act-progress-3')
];

const bgMusic = document.getElementById('bg-music');
const sfxButtonClick = document.getElementById('sfx-button-click');
const sfxTyping = document.getElementById('sfx-typing');

let typingInterval = null;
let currentTypingResolve = null;
let isTypingActive = false;
let currentlyTypingElement = null;

function getPageTitle(pageId) {
    if (pageTitles[pageId]) {
        if (pageId === 'endOfActSummary' && gameData.acts && gameData.acts[gameState.currentAct]) {
            return `Act ${gameState.currentAct + 1} Summary`; // Summarizing the act just finished
        }
        if (pageId === 'newActTitle' && gameData.acts && gameData.acts[gameState.currentAct]) {
            return gameData.acts[gameState.currentAct].title; // Title of the new act
        }
        return pageTitles[pageId]; // This returns "Encounter Results" for pageId 'results'
    }
    if (pageId === 'splashScreen') {
        return staticGameNarrative.splashScreen.title;
    }
    if (pageId === 'encounter' && gameData.acts && gameData.acts[gameState.currentAct] && gameState.currentEncounterId) {
        // MODIFIED: This line now only returns the encounter's display name
        const currentEncounter = gameData.encounterLookup[gameState.currentEncounterId];
        if (currentEncounter) {
            return currentEncounter.displayName; 
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
    const shipHealthElem = document.getElementById('shipHealth');
    const crewHealthElem = document.getElementById('crewHealth');
    const treasureElem = document.getElementById('treasure');

    if (shipHealthElem && shipHealthElem.firstChild) {
        shipHealthElem.firstChild.nodeValue = gameState.shipHealth;
    }
    if (crewHealthElem && crewHealthElem.firstChild) {
        crewHealthElem.firstChild.nodeValue = gameState.crewHealth;
    }
    if (treasureElem && treasureElem.firstChild) {
        treasureElem.firstChild.nodeValue = gameState.treasure;
    }

    statusDisplayElem.classList.remove('hidden');
}

function animateStatChange(statElementId, changeAmount) {
    const statElement = document.getElementById(statElementId); // This is the <span> with id 'shipHealth', 'crewHealth', or 'treasure'
    if (!statElement) {
        console.error(`Stat element with ID '${statElementId}' not found.`);
        return;
    }

    // MODIFIED: Find the .stat-indicator span as a CHILD of the statElement
    const statIndicatorSpan = statElement.querySelector('.stat-indicator'); 

    if (!statIndicatorSpan) { // Removed statValueSpan check, as statElement is already statValueSpan
        console.error(`Could not find .stat-indicator span inside #${statElementId}. Check your index.html structure.`);
        return;
    }

    statElement.classList.remove('gain', 'loss'); // Apply to the main stat span
    statIndicatorSpan.classList.remove('show', 'gain', 'loss');
    statIndicatorSpan.textContent = '';

    if (changeAmount > 0) {
        statElement.classList.add('gain');
        statIndicatorSpan.classList.add('gain');
        statIndicatorSpan.textContent = `+${changeAmount}`;
    } else if (changeAmount < 0) {
        statElement.classList.add('loss');
        statIndicatorSpan.classList.add('loss');
        statIndicatorSpan.textContent = `${changeAmount}`;
    } else {
        return;
    }

    statIndicatorSpan.classList.add('show');

    setTimeout(() => {
        statElement.classList.remove('gain', 'loss');
        statIndicatorSpan.classList.remove('show', 'gain', 'loss');
        statIndicatorSpan.textContent = '';
    }, 700);
}

async function typeText(element, text, speed = 30) {
    return new Promise(resolve => {
        if (typingInterval) {
            clearInterval(typingInterval);
        }
        stopTypingSfx();

        element.textContent = '';
        element.removeAttribute('data-full-text-html');

        let i = 0;

        currentTypingResolve = resolve;
        currentlyTypingElement = element;
        isTypingActive = true;

        element.setAttribute('data-full-text-html', text);

        startTypingSfx();

        typingInterval = setInterval(() => {
            if (i < text.length) {
                if (text.substring(i, i + 4) === '<br>') {
                    element.innerHTML += '<br>';
                    i += 4;
                } else {
                    element.innerHTML += text.charAt(i);
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

function handleGlobalInteractionToSkip(event) {
    if (event.type === 'keydown' && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
    }

    if (isTypingActive && currentTypingResolve && currentlyTypingElement) {
        clearInterval(typingInterval);
        stopTypingSfx();

        const fullHtml = currentlyTypingElement.getAttribute('data-full-text-html');
        if (fullHtml) {
            currentlyTypingElement.innerHTML = fullHtml;
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
    gameSubtitleElem.classList.add('hidden'); // Ensure subtitle is hidden by default for ALL pages
    gameContentElem.classList.add('hidden');
    choicesContainerElem.classList.add('hidden');
    nextButton.classList.add('hidden');
    splashImageElem.classList.add('hidden');
    characterPortraitElem.classList.add('hidden');
    encounterImageElem.classList.add('hidden');

    // Permanently hide the Act Indicator
    if (actIndicatorElem) {
        actIndicatorElem.classList.add('hidden');
    }

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

    gameTitleElem.removeAttribute('data-full-text');
    gameSubtitleElem.removeAttribute('data-full-text');
    gameContentElem.removeAttribute('data-full-text');


    const titleText = getPageTitle(pageId);
    if (titleText) {
        gameTitleElem.classList.remove('hidden');
    }

    switch (pageId) {
        case 'loading':
            gameTitleElem.textContent = "Loading Game Data...";
            gameContentElem.textContent = "Please wait.";
            gameContentElem.classList.remove('hidden');
            statusDisplayElem.classList.add('hidden');
            break;

        case 'splashScreen':
            gameSubtitleElem.classList.remove('hidden'); // ONLY unhide for splash screen
            nextButton.classList.remove('hidden');
            if (staticGameNarrative.splashScreen.image) {
                splashImageElem.src = `assets/${staticGameNarrative.splashScreen.image}`;
                splashImageElem.classList.remove('hidden');
            }
            statusDisplayElem.classList.add('hidden');
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
            statusDisplayElem.classList.add('hidden');

            await typeText(gameTitleElem, titleText, 50);
            let contentText = '';
            if (pageId === 'introGame') contentText = staticGameNarrative.introGame.text;
            if (pageId === 'introCrewDynamics') contentText = staticGameNarrative.introCrewDynamics.text;
            if (pageId === 'missionBrief') contentText = staticGameNarrative.missionBrief.text;

            // gameSubtitleElem remains hidden due to default at top of function.
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
                statusDisplayElem.classList.add('hidden');

                await typeText(gameTitleElem, titleText, 50);

                const imagePath = `assets/${currentChar.portrait}`;
                characterPortraitElem.src = imagePath;

                let traitsText = `Traits:<br>`;
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

        case 'newActTitle': // RENAMED from 'actTitle'
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

            console.log("DEBUG: Current encounter ID before choice:", gameState.currentEncounterId);

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
            statusDisplayElem.classList.remove('hidden');
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
                        handleChoice(option.outcome, encounter.id); // Pass current encounter ID here
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
            // gameSubtitleElem remains hidden due to default at top of function.
            gameContentElem.classList.remove('hidden'); 
            nextButton.classList.remove('hidden'); 

            await typeText(gameTitleElem, getPageTitle('results'), 50);

            if (gameState.lastChoiceOutcome.image) {
                encounterImageElem.src = `assets/${gameState.lastChoiceOutcome.image}`;
                encounterImageElem.classList.remove('hidden');
            } else {
                encounterImageElem.classList.add('hidden');
            }

            // Display the outcome text
            await typeText(gameContentElem, gameState.lastChoiceOutcome.text);

            console.log("DEBUG: Next encounter ID from outcome (on results screen):", gameState.currentEncounterId);


            nextButton.textContent = "Continue";
            nextButton.disabled = false;
            break;

        case 'endOfActSummary': // NEW: Page to display summary of the *completed* act
            if (!gameData.acts || !gameData.acts[gameState.currentAct]) {
                console.error("Act data missing for end-of-act summary!");
                endGame("error");
                return;
            }
            const completedActSummaryText = gameData.acts[gameState.currentAct].summary;
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            statusDisplayElem.classList.remove('hidden');

            await typeText(gameTitleElem, getPageTitle('endOfActSummary'), 50); // Get title like "Act X Summary"
            await typeText(gameContentElem, completedActSummaryText, 30);
            nextButton.textContent = "Proceed to Next Act";
            nextButton.disabled = false;
            break;


        case 'conclusion':
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            stopBgMusic();
            statusDisplayElem.classList.remove('hidden'); // Status display should still be visible for final stats

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
            statusDisplayElem.classList.remove('hidden'); // Status display should still be visible for final stats

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
            statusDisplayElem.classList.add('hidden');
            break;
    }
    // Re-add the call to updateActProgressBar()
    updateActProgressBar();
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
            lastEncounterId: null, // Reset this
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
                gameState.currentPage = 'newActTitle'; // Start with Act 1 Title
            } else {
                console.error("No first act or encounter to start the game!");
                endGame("error");
                return;
            }
            break;
        case 'newActTitle': // RENAMED from 'actTitle'
            gameState.currentPage = 'encounter';
            break;

        case 'results':
            const targetEncounterId = gameState.currentEncounterId;
            const currentActData = gameData.acts[gameState.currentAct];

            // Determine if the encounter we just came from was the last in its current act
            let wasLastEncounterInCurrentAct = false;
            if (currentActData && gameState.lastEncounterId) {
                const lastEncounterOfCurrentAct = currentActData.encounters[currentActData.encounters.length - 1];
                if (lastEncounterOfCurrentAct && lastEncounterOfCurrentAct.id === gameState.lastEncounterId) {
                    wasLastEncounterInCurrentAct = true;
                }
            }
            
            // Determine which act the targetEncounterId belongs to
            let nextActIndexForTarget = -1;
            if (targetEncounterId !== null) {
                for (let i = 0; i < gameData.acts.length; i++) {
                    if (gameData.acts[i].encounters.some(enc => enc.id === targetEncounterId)) {
                        nextActIndexForTarget = i;
                        break;
                    }
                }
            }


            if (targetEncounterId === null) {
                // If nextId is null, always go to conclusion
                gameState.currentPage = 'conclusion';
            } else if (wasLastEncounterInCurrentAct &&
                       nextActIndexForTarget === gameState.currentAct + 1 && // Check if target is in the *next* act
                       gameData.acts[nextActIndexForTarget] &&
                       gameData.acts[nextActIndexForTarget].encounters[0].id === targetEncounterId) {
                // This is the condition for an end-of-act transition
                gameState.currentPage = 'endOfActSummary';
                // gameState.currentAct remains the same here (it's the act that just finished)
            } else {
                // Regular transition: either within the same act, or branching to a non-first encounter in another act, or error
                if (nextActIndexForTarget === -1) {
                     console.error(`Outcome.nextId "${targetEncounterId}" does not point to a valid encounter.`);
                     endGame("error");
                     return;
                }
                gameState.currentPage = 'encounter';
                gameState.currentAct = nextActIndexForTarget; // Update currentAct if jumping to a different act's encounter
            }
            break;

        case 'endOfActSummary': // NEW: Handle navigation from end-of-act summary
            gameState.currentAct++; // Now increment to the next act
            if (gameState.currentAct < gameData.acts.length) {
                if (gameData.acts[gameState.currentAct] && gameData.acts[gameState.currentAct].encounters[0]) {
                    gameState.currentEncounterId = gameData.acts[gameState.currentAct].encounters[0].id;
                    gameState.currentPage = 'newActTitle'; // Go to the new act's title page
                } else {
                    console.error(`Act ${gameState.currentAct} has no encounters defined!`);
                    endGame("error");
                    return;
                }
            } else {
                gameState.currentPage = 'conclusion'; // No more acts, go to conclusion
            }
            break;

        // The old 'actSummary' case is now 'newActTitle' and goes directly to encounter
        // No need for a separate 'actSummary' case here anymore since it's split into endOfActSummary and newActTitle
    }
    console.log("DEBUG: Encounter ID after continue click (after next button logic):", gameState.currentEncounterId, "Setting page to:", gameState.currentPage, "Current Act:", gameState.currentAct);

    displayPage(gameState.currentPage);
});

// Function to update the horizontal Act Progress Bar (managed dynamically)
function updateActProgressBar() {
    if (!actProgressBarElem || !actProgressItems || actProgressItems.length === 0) {
        return; // Exit if elements aren't loaded yet
    }

    // Determine when to show/hide the progress bar
    if (gameState.currentPage === 'splashScreen' ||
        gameState.currentPage === 'introGame' ||
        gameState.currentPage === 'introCrewDynamics' ||
        gameState.currentPage === 'characterIntro' ||
        gameState.currentPage === 'missionBrief' ||
        gameState.currentPage === 'gameOver' ||
        gameState.currentPage === 'conclusion' ||
        gameState.currentPage === 'loading' ||
        !gameData.acts || gameData.acts.length === 0) {
        actProgressBarElem.classList.add('hidden');
        return;
    }

    actProgressBarElem.classList.remove('hidden'); // Show the bar during active acts

    // Loop through each act item and apply 'bright-act' or 'dim-act' class
    actProgressItems.forEach((item, index) => {
        // 'index' is 0-based, so Act 1 is index 0, Act 2 is index 1, etc.
        // gameState.currentAct is also 0-based.
        if (index <= gameState.currentAct) {
            // Current act or a previous act
            item.classList.add('bright-act');
            item.classList.remove('dim-act');
        } else {
            // Future acts
            item.classList.add('dim-act');
            item.classList.remove('bright-act');
        }
    });
}


function handleChoice(outcome, currentEncounterId) { // Added currentEncounterId parameter
    playSfx(sfxButtonClick);

    document.querySelectorAll('.choice-button').forEach(button => button.disabled = true);
    nextButton.disabled = true;

    if (outcome.specialEffect) {
        if (!gameState.specialEffects.includes(outcome.specialEffect)) {
            gameState.specialEffects.push(outcome.specialEffect);
        }
    }
    if (outcome.milestone) {
    }
    if (outcome.startQuest) {
    }
    if (outcome.completeQuest) {
    }

    gameState.lastChoiceOutcome = outcome;
    gameState.lastEncounterId = currentEncounterId; // NEW: Store the ID of the encounter that was just completed

    if (outcome.shipHealthChange !== undefined) {
        gameState.shipHealth += outcome.shipHealthChange;
        if (gameState.shipHealth < 0) gameState.shipHealth = 0;
        animateStatChange('shipHealth', outcome.shipHealthChange);
    }

    if (outcome.crewHealthChange !== undefined) {
        gameState.crewHealth += outcome.crewHealthChange;
        if (gameState.crewHealth < 0) gameState.crewHealth = 0;
        animateStatChange('crewHealth', outcome.crewHealthChange);
    }

    if (outcome.treasureChange !== undefined) {
        gameState.treasure += outcome.treasureChange;
        if (gameState.treasure < 0) gameState.treasure = 0;
        animateStatChange('treasure', outcome.treasureChange);
    }

    updateStatusDisplay();


    if (gameState.shipHealth <= 0 || gameState.crewHealth <= 0) {
        if (gameState.shipHealth <= 0) gameState.gameOverReason = "shipDestroyed";
        else if (gameState.crewHealth <= 0) gameState.gameOverReason = "crewPerished";
        endGame('gameOver');
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
            acts: actsData, // This is where gameData.acts gets populated
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