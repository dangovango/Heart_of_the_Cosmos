let gameData = {};
const staticGameNarrative = {
    splashScreen: {
        title: " ",
        subtitle: "Treasure hidden in the void",
        image: "splash_screen_cover.png"
    },
    introGame: {
        text: "Welcome, brave spacefarers! Across the cosmos, legends whisper of the STAR-HEART GEM, a treasure beyond imagination hidden deep within the treacherous Cygnus Nebula. You are the Captain of a renowned crew, charting a course toward this fabled prize. <br><br>* But be warned: every decision you make only takes you deeper into the unknown. There is no turning back."
    },
    introCrewDynamics: {
        text: "Your crew is your greatest asset: a diverse team, each member bringing unique skills, experiences, and perspectives to the table. <br><br>As you face the cosmos' trials, their strengths will be tested, and your bonds forged in the fires of space. Your survival and success depend on your collective wisdom."
    },
    missionBrief: {
        text: "The coordinates are set. Your mission: penetrate the treacherous Cygnus Nebula and locate the fabled STAR-HEART GEM.<br><br>Your ship, the *Star-Seeker*, is equipped with advanced technology and a loyal crew. But the journey will not be easy. The nebula is fraught with dangers: hostile factions, cosmic anomalies, and the ever-present threat of the unknown.<br><br>Prepare your ship, gather your crew, and brace for the challenges ahead. The STAR-HEART GEM awaits!"
    },
    conclusion: "Your crew has faced incredible challenges, made difficult decisions, and forged an unforgettable story.",
    gameOver: {
        shipDestroyed: "Your ship sustained critical damage and was destroyed. The mission is a failure.",
        crewPerished: "Your crew suffered catastrophic losses. With no one left to pilot the ship, your adventure ends here.",
        generic: "An unforeseen anomaly has ended your journey."
    }
};

const pageTitles = {
    'introGame': 'Introduction',
    'introCrewDynamics': 'Your Crew',
    'missionBrief': 'Mission Brief',
    'results': 'Encounter Results',
    'conclusion': 'Journey\'s End', // Changed for flexibility
    'gameOver': 'Game Over!', // This will technically still exist but will not be a direct page ID
    'error': 'Error',
    'endOfActSummary': 'Act Summary',
    'newActTitle': 'Act Introduction'
};

let gameState = {
    currentPage: 'loading',
    shipHealth: 100,
    crewHealth: 100,
    treasure: 0,
    currentAct: 0,
    currentEncounterId: null,
    lastChoiceOutcome: null,
    lastEncounterId: null,
    rivalFactionEncountered: false,
    shipShieldBoostActive: false,
    specialEffects: [],
    gameOverReason: null // New field to store if it was a game over and why
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

const actIndicatorElem = document.getElementById('act-indicator');
const actProgressBarElem = document.getElementById('act-progress-bar');
const actProgressItems = [
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
            return `Act ${gameState.currentAct + 1} Summary`;
        }
        if (pageId === 'newActTitle' && gameData.acts && gameData.acts[gameState.currentAct]) {
            return gameData.acts[gameState.currentAct].title;
        }
        // If it's the conclusion page, check if it's a game over
        if (pageId === 'conclusion' && gameState.gameOverReason) {
             return pageTitles['gameOver']; // Use the Game Over title if it's a game over
        }
        return pageTitles[pageId];
    }
    if (pageId === 'splashScreen') {
        return staticGameNarrative.splashScreen.title;
    }
    if (pageId === 'encounter' && gameData.acts && gameData.acts[gameState.currentAct] && gameState.currentEncounterId) {
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
    const statElement = document.getElementById(statElementId);
    if (!statElement) {
        console.error(`Stat element with ID '${statElementId}' not found.`);
        return;
    }

    const statIndicatorSpan = statElement.querySelector('.stat-indicator');

    if (!statIndicatorSpan) {
        console.error(`Could not find .stat-indicator span inside #${statElementId}. Check your index.html structure.`);
        return;
    }

    statElement.classList.remove('gain', 'loss');
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
    const elementId = element ? element.id : 'unknown_element';
    console.log(`DEBUG: typeText called for element ID: ${elementId}, text (full): "${text}"`);
    return new Promise(resolve => {
        if (typingInterval) {
            console.log(`DEBUG: Clearing previous typingInterval for ${elementId}.`);
            clearInterval(typingInterval);
        }
        stopTypingSfx();

        element.setAttribute('data-full-text-html', text);
        element.textContent = '';
        console.log(`DEBUG: Element ${elementId} content cleared by typeText. data-full-text-html set to: "${element.getAttribute('data-full-text-html')}"`);

        let i = 0;

        currentTypingResolve = resolve;
        currentlyTypingElement = element;
        isTypingActive = true;

        startTypingSfx();

        console.log(`DEBUG: Starting setInterval for ${elementId}. Initial i: ${i}, text.length: ${text.length}`);
        typingInterval = setInterval(() => {
            console.log(`DEBUG: setInterval tick for ${elementId}. Current i: ${i}, text.length: ${text.length}. isTypingActive: ${isTypingActive}`);
            if (i < text.length) {
                if (text.substring(i, i + 4) === '<br>') {
                    element.innerHTML += '<br>';
                    i += 4;
                    console.log(`DEBUG: Added <br> to ${elementId}. New i: ${i}`);
                } else {
                    element.innerHTML += text.charAt(i);
                    i++;
                    console.log(`DEBUG: Added char '${text.charAt(i-1)}' to ${elementId}. New i: ${i}`);
                }
            } else {
                console.log(`DEBUG: Typing complete for ${elementId}. Clearing interval.`);
                clearInterval(typingInterval);
                stopTypingSfx();
                isTypingActive = false;
                currentTypingResolve();
                currentTypingResolve = null;
                currentlyTypingElement = null;
                element.removeAttribute('data-full-text-html');
            }
        }, speed);
    });
}

function handleGlobalInteractionToSkip(event) {
    // Prevent default behavior for space/enter key presses, but allow them to skip typing
    if (event.type === 'keydown' && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault();
    }

    if (isTypingActive && currentTypingResolve && currentlyTypingElement) {
        clearInterval(typingInterval);
        stopTypingSfx();

        const fullHtml = currentlyTypingElement.getAttribute('data-full-text-html');
        if (fullHtml) {
            currentlyTypingElement.innerHTML = fullHtml; // Populate with full text if available
        }

        isTypingActive = false;
        currentTypingResolve();
        currentTypingResolve = null;
        // ONLY remove the attribute if currentlyTypingElement is NOT null
        if (currentlyTypingElement) {
            currentlyTypingElement.removeAttribute('data-full-text-html');
        }
        currentlyTypingElement = null; // Set to null *after* removing attribute

        event.stopPropagation(); // Stop event propagation if we handle it
    }
}

async function displayPage(pageId) {
    console.log(`DEBUG: displayPage called for pageId: ${pageId}`);

    console.log("DEBUG: gameTitleElem element reference:", gameTitleElem);

    // Initial hiding of all elements to ensure a clean slate
    gameTitleElem.classList.add('hidden');
    gameSubtitleElem.classList.add('hidden');
    gameContentElem.classList.add('hidden');
    choicesContainerElem.classList.add('hidden');
    nextButton.classList.add('hidden');
    splashImageElem.classList.add('hidden');
    characterPortraitElem.classList.add('hidden');
    encounterImageElem.classList.add('hidden');

    if (actIndicatorElem) {
        actIndicatorElem.classList.add('hidden');
    }

    // Clear content of main text elements
    gameTitleElem.textContent = '';
    gameSubtitleElem.textContent = '';
    gameContentElem.textContent = '';
    choicesContainerElem.innerHTML = '';

    // If typing is active, stop it before displaying a new page
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

    // Disable buttons until content is ready
    nextButton.disabled = true;
    document.querySelectorAll('.choice-button').forEach(button => button.disabled = true);

    // Ensure data-full-text-html attributes are clean
    gameTitleElem.removeAttribute('data-full-text-html');
    gameSubtitleElem.removeAttribute('data-full-text-html');
    gameContentElem.removeAttribute('data-full-text-html');

    const titleText = getPageTitle(pageId);

    // Remove 'zoomed' class from splash image when transitioning away from splash screen
    if (pageId !== 'splashScreen') {
        splashImageElem.classList.remove('zoomed');
    }

    // --- Start of Page-Specific Logic ---
    switch (pageId) {
        case 'loading':
            gameTitleElem.classList.remove('hidden');
            gameTitleElem.textContent = "Loading Game Data...";
            gameContentElem.textContent = "Please wait.";
            gameContentElem.classList.remove('hidden');
            statusDisplayElem.classList.add('hidden');
            break;

        case 'splashScreen':
            gameTitleElem.classList.remove('hidden');
            gameSubtitleElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            if (staticGameNarrative.splashScreen.image) {
                splashImageElem.src = `assets/${staticGameNarrative.splashScreen.image}`;
                splashImageElem.classList.remove('hidden');
                splashImageElem.classList.remove('zoomed');
                setTimeout(() => {
                    splashImageElem.classList.add('zoomed');
                }, 100);
            }
            statusDisplayElem.classList.add('hidden');
            gameTitleElem.textContent = titleText;
            await new Promise(resolve => setTimeout(async () => {
                await typeText(gameSubtitleElem, staticGameNarrative.splashScreen.subtitle, 40);
                resolve();
            }, 20));
            nextButton.textContent = "Launch Into the Unknown";
            nextButton.disabled = false;
            break;

        case 'introGame':
        case 'introCrewDynamics':
        case 'missionBrief':
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            statusDisplayElem.classList.add('hidden');

            gameTitleElem.classList.remove('hidden');
            gameTitleElem.textContent = titleText;
            let contentText = '';
            if (pageId === 'introGame') contentText = staticGameNarrative.introGame.text;
            if (pageId === 'introCrewDynamics') contentText = staticGameNarrative.introCrewDynamics.text;
            if (pageId === 'missionBrief') contentText = staticGameNarrative.missionBrief.text;

            await new Promise(resolve => setTimeout(async () => {
                await typeText(gameContentElem, contentText, 30);
                resolve();
            }, 20));
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

                gameTitleElem.classList.remove('hidden');
                gameTitleElem.textContent = titleText;

                const imagePath = `assets/${currentChar.portrait}`;
                characterPortraitElem.src = imagePath;

                let traitsText = `TRAITS:<br>`;
                traitsText += currentChar.traits.map(trait => `* ${trait}`).join('<br>');
                await new Promise(resolve => setTimeout(async () => {
                    await typeText(gameContentElem, traitsText, 30);
                    resolve();
                }, 20));
                nextButton.textContent = "Continue";
                nextButton.disabled = false;
            } else {
                gameState.currentPage = 'missionBrief';
                displayPage(gameState.currentPage);
                return;
            }
            break;

        case 'newActTitle':
            if (!gameData.acts) {
                console.error("Acts data not loaded yet!");
                // endGame("error"); // Removed endGame call
                gameState.gameOverReason = "error";
                gameState.currentPage = 'conclusion';
                displayPage(gameState.currentPage);
                return;
            }
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');

            const currentActData = gameData.acts[gameState.currentAct];
            const actDescriptionText = currentActData.actDescription || "Press continue to face your first encounter...";

            gameTitleElem.classList.remove('hidden');
            gameTitleElem.textContent = titleText;
            await new Promise(resolve => setTimeout(async () => {
                await typeText(gameContentElem, actDescriptionText, 30);
                resolve();
            }, 20));
            nextButton.textContent = "Continue";
            nextButton.disabled = false;
            break;

        case 'encounter':
            if (!gameData.acts || !gameState.currentEncounterId) {
                console.error("Game data or current encounter ID missing for 'encounter' page!");
                // endGame("error"); // Removed endGame call
                gameState.gameOverReason = "error";
                gameState.currentPage = 'conclusion';
                displayPage(gameState.currentPage);
                return;
            }
            const encounter = getEncounterById(gameState.currentEncounterId);

            if (!encounter) {
                console.error("Could not find encounter for currentEncounterId:", gameState.currentEncounterId);
                // endGame("error"); // Removed endGame call
                gameState.gameOverReason = "error";
                gameState.currentPage = 'conclusion';
                displayPage(gameState.currentPage);
                return;
            }

            gameContentElem.classList.remove('hidden');
            if (encounter.image) {
                encounterImageElem.src = `assets/${encounter.image}`;
                encounterImageElem.classList.remove('hidden');
            } else {
                encounterImageElem.classList.add('hidden');
            }
            choicesContainerElem.classList.remove('hidden');
            statusDisplayElem.classList.remove('hidden');
            updateStatusDisplay();
            updateActProgressBar();

            gameTitleElem.classList.remove('hidden');
            gameTitleElem.textContent = getPageTitle('encounter');
            await new Promise(resolve => setTimeout(async () => {
                await typeText(gameContentElem, encounter.scenario);
                resolve();
            }, 20));

            choicesContainerElem.innerHTML = '';
            encounter.options.forEach((option) => {
                let showOption = true;

                if (option.condition) {
                    showOption = checkCondition(option.condition);
                }

                if (showOption) {
                    const choiceButton = document.createElement('button');
                    choiceButton.classList.add('game-button', 'choice-button');
                    choiceButton.textContent = option.text;
                    choiceButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        handleChoice(option.outcome, encounter.id);
                    });
                    choicesContainerElem.appendChild(choiceButton);
                }
            });
            document.querySelectorAll('.choice-button').forEach(button => button.disabled = false);
            break;

        case 'results':
            if (!gameState.lastChoiceOutcome) {
                console.error("No last choice outcome to display results for!");
                // endGame("error"); // Removed endGame call
                gameState.gameOverReason = "error";
                gameState.currentPage = 'conclusion';
                displayPage(gameState.currentPage);
                return;
            }
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            if (gameState.lastChoiceOutcome.image) {
                encounterImageElem.src = `assets/${gameState.lastChoiceOutcome.image}`;
                encounterImageElem.classList.remove('hidden');
            } else {
                encounterImageElem.classList.add('hidden');
            }
            statusDisplayElem.classList.remove('hidden');
            updateStatusDisplay();

            gameTitleElem.classList.remove('hidden');
            gameTitleElem.textContent = getPageTitle('results');
            await new Promise(resolve => setTimeout(async () => {
                await typeText(gameContentElem, gameState.lastChoiceOutcome.text);
                resolve();
            }, 20));

            nextButton.textContent = "Continue";
            nextButton.disabled = false;
            break;

        case 'endOfActSummary':
            if (!gameData.acts || !gameData.acts[gameState.currentAct]) {
                console.error("Act data missing for end-of-act summary!");
                // endGame("error"); // Removed endGame call
                gameState.gameOverReason = "error";
                gameState.currentPage = 'conclusion';
                displayPage(gameState.currentPage);
                return;
            }
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            statusDisplayElem.classList.add('hidden');

            const actSummarized = gameData.acts[gameState.currentAct];
            let summaryContentText = actSummarized.summary || "You have completed this act!";

            if (gameState.currentAct === gameData.acts.length - 1) {
                if (gameState.treasure >= 784 && gameState.shipHealth >= 41 && gameState.crewHealth >= 81) {
                    summaryContentText += "<br><br>With the **Star-Heart Gem secured** and your crew triumphant, you return home a legend! The galaxy celebrates your success.";
                } else if (gameState.treasure >= 592 || gameState.shipHealth >= 21 || gameState.crewHealth >= 71) {
                    summaryContentText += "<br><br>Though you survived the cosmos, the **Star-Heart Gem remains elusive**. Your quest ends, but the void holds endless mysteries yet to be claimed.";
                } else {
                    summaryContentText += "<br><br>Your journey concluded, but it was fraught with struggle. The **Star-Heart Gem is lost**, and your crew barely endured. Perhaps next time, greater fortunes await.";
                }
            }

            gameTitleElem.classList.remove('hidden');
            gameTitleElem.textContent = getPageTitle('endOfActSummary');
            await new Promise(resolve => setTimeout(async () => {
                await typeText(gameContentElem, summaryContentText, 30);
                resolve();
            }, 20));
            nextButton.textContent = "Proceed";
            nextButton.disabled = false;
            break;

        case 'conclusion':
            gameContentElem.classList.remove('hidden');
            nextButton.classList.remove('hidden');
            stopBgMusic();
            statusDisplayElem.classList.remove('hidden');
            updateStatusDisplay();

            // Dynamic Title for Conclusion
            gameTitleElem.classList.remove('hidden');
            gameTitleElem.textContent = getPageTitle('conclusion'); // Use the new getPageTitle logic

            let finalScreenText = "";

            if (gameState.gameOverReason) {
                // If it's a game over, use the specific reason
                finalScreenText = staticGameNarrative.gameOver[gameState.gameOverReason] || staticGameNarrative.gameOver.generic;
                finalScreenText += `<br><br>Final Ship Health: ${gameState.shipHealth}`;
                finalScreenText += `<br>Final Crew Morale: ${gameState.crewHealth}`;
                finalScreenText += `<br>Final Treasure: ${gameState.treasure} credits`;
                finalScreenText += "<br><br>Your journey ended prematurely. Try again to overcome the void!";

            } else {
                // Otherwise, it's a regular conclusion
                finalScreenText = staticGameNarrative.conclusion + "<br><br>";
                finalScreenText += `Final Ship Health: ${gameState.shipHealth}<br>`;
                finalScreenText += `Final Crew Morale: ${gameState.crewHealth}<br>`;
                finalScreenText += `Final Treasure: ${gameState.treasure} credits<br><br>`;

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

                finalScreenText += outcomeMessage + "<br>";

                if (gameState.treasure >= 784 && gameState.shipHealth >= 41 && gameState.crewHealth >= 81) {
                    finalScreenText += "Captain, your performance was exemplary. A legendary journey indeed!";
                } else if (gameState.treasure >= 592 || gameState.shipHealth >= 21 || gameState.crewHealth >= 71) {
                    finalScreenText += "A challenging journey, but you guided your crew through to a respectable conclusion.";
                } else {
                    finalScreenText += "Though your journey concluded, it was fraught with struggle. Perhaps next time, greater fortunes await.";
                }
            }
            await new Promise(resolve => setTimeout(async () => {
                await typeText(gameContentElem, finalScreenText, 30);
                resolve();
            }, 20));

            nextButton.textContent = "Restart Game";
            nextButton.disabled = false;
            break;

        // case 'gameOver': // THIS CASE IS NOW REMOVED
        //     // Logic moved to 'conclusion' case
        //     break;

        default:
            console.log("Default case in displayPage");
            gameContentElem.classList.remove('hidden');
            gameTitleElem.classList.remove('hidden');
            gameTitleElem.textContent = titleText;
            await new Promise(resolve => setTimeout(async () => {
                await typeText(gameContentElem, "An unknown game state occurred.", 30);
                resolve();
            }, 20));
            statusDisplayElem.classList.add('hidden');
            break;
    }
    // --- End of Page-Specific Logic ---

    updateActProgressBar();

    // Keep the scrollIntoView call here as a final guarantee, with a slightly larger delay
    setTimeout(() => {
        if (gameTitleElem) {
            gameTitleElem.scrollIntoView({
                behavior: 'auto',
                block: 'start'
            });
            console.log("DEBUG: gameTitleElem.scrollIntoView executed at end of displayPage.");
        }
    }, 100);
}


function checkCondition(condition) {
    if (!condition) return true;

    switch (condition.type) {
        case "shipHealth":
        case "crewHealth":
        case "treasure":
            const currentValue = gameState[condition.type];
            switch (condition.comparison) {
                case "greaterThan": return currentValue > condition.value;
                case "greaterThanOrEqual": return currentValue >= condition.value;
                case "lessThan": return currentValue < condition.value;
                case "lessThanOrEqual": return currentValue <= condition.value;
                case "equalTo": return currentValue === condition.value;
                default: console.warn("Unknown comparison type:", condition.comparison); return false;
            }
        case "specialEffect":
            if (condition.comparison === "set") {
                return gameState.specialEffects.includes(condition.flag);
            }
            if (condition.comparison === "notSet") {
                return !gameState.specialEffects.includes(condition.flag);
            }
            console.warn("Unknown special effect comparison type:", condition.comparison);
            return false;
        default:
            console.warn("Unknown condition type:", condition.type);
            return true;
    }
}

// applyOutcome now returns true if game over, false otherwise
function applyOutcome(outcome) {
    if (outcome.shipHealthChange !== undefined) {
        gameState.shipHealth += outcome.shipHealthChange;
        if (outcome.shipHealthChange !== 0) {
            animateStatChange('shipHealth', outcome.shipHealthChange);
        }
    }
    if (outcome.crewHealthChange !== undefined) {
        gameState.crewHealth += outcome.crewHealthChange;
        if (outcome.crewHealthChange !== 0) {
            animateStatChange('crewHealth', outcome.crewHealthChange);
        }
    }
    if (outcome.treasureChange !== undefined) {
        gameState.treasure += outcome.treasureChange;
        if (outcome.treasureChange !== 0) {
            animateStatChange('treasure', outcome.treasureChange);
        }
    }

    if (outcome.specialEffect) {
        if (!gameState.specialEffects.includes(outcome.specialEffect)) {
            gameState.specialEffects.push(outcome.specialEffect);
            console.log(`Special effect added: ${outcome.specialEffect}`);
        }
    }

    gameState.shipHealth = Math.min(100, Math.max(0, gameState.shipHealth));
    gameState.crewHealth = Math.min(100, Math.max(0, gameState.crewHealth));
    gameState.treasure = Math.max(0, gameState.treasure);

    // Check for game over conditions and set reason
    if (gameState.shipHealth <= 0) {
        console.log("DEBUG: Ship health reached 0. Setting gameOverReason to 'shipDestroyed'.");
        gameState.gameOverReason = "shipDestroyed";
        gameState.currentPage = 'conclusion'; // Direct to conclusion
        stopBgMusic(); // Stop music immediately on game over
        return true; // Indicate game over
    }
    if (gameState.crewHealth <= 0) {
        console.log("DEBUG: Crew health reached 0. Setting gameOverReason to 'crewPerished'.");
        gameState.gameOverReason = "crewPerished";
        gameState.currentPage = 'conclusion'; // Direct to conclusion
        stopBgMusic(); // Stop music immediately on game over
        return true; // Indicate game over
    }
    return false; // Not a game over
}

function updateActProgressBar() {
    if (!actProgressBarElem || !actProgressItems || actProgressItems.length === 0) {
        return;
    }

    // Hide progress bar on specific pages or if no acts data
    if (gameState.currentPage === 'splashScreen' ||
        gameState.currentPage === 'introGame' ||
        gameState.currentPage === 'introCrewDynamics' ||
        gameState.currentPage === 'characterIntro' ||
        gameState.currentPage === 'missionBrief' ||
        gameState.currentPage === 'conclusion' || // Hide on conclusion (including game over)
        gameState.currentPage === 'loading' ||
        !gameData.acts || gameData.acts.length === 0) {
        actProgressBarElem.classList.add('hidden');
        return;
    }

    actProgressBarElem.classList.remove('hidden');

    actProgressItems.forEach((item, index) => {
        if (index <= gameState.currentAct) {
            item.classList.add('bright-act');
            item.classList.remove('dim-act');
        } else {
            item.classList.add('dim-act');
            item.classList.remove('bright-act');
        }
    });
}

function handleChoice(outcome, currentEncounterId) {
    playSfx(sfxButtonClick);

    document.querySelectorAll('.choice-button').forEach(button => button.disabled = true);
    nextButton.disabled = true;

    // Apply outcome and check if it resulted in game over
    const isGameOver = applyOutcome(outcome);

    gameState.lastChoiceOutcome = outcome;
    gameState.lastEncounterId = currentEncounterId;

    if (isGameOver) {
        // If it's a game over, display the conclusion page directly
        displayPage(gameState.currentPage); // gameState.currentPage is already 'conclusion'
    } else {
        // Otherwise, proceed to results page
        gameState.currentPage = 'results';
        displayPage(gameState.currentPage);
    }
}

document.addEventListener('click', handleGlobalInteractionToSkip);
document.addEventListener('keydown', handleGlobalInteractionToSkip);

nextButton.addEventListener('click', (e) => {
    e.stopPropagation();

    playSfx(sfxButtonClick);

    if (isTypingActive && currentTypingResolve) {
        handleGlobalInteractionToSkip(e);
        return;
    }

    // If on conclusion page (which now handles game over), restart the game
    if (gameState.currentPage === 'conclusion') {
        gameState = {
            currentPage: 'splashScreen',
            shipHealth: 100,
            crewHealth: 100,
            treasure: 0,
            currentAct: 0,
            currentEncounterId: null,
            lastChoiceOutcome: null,
            lastEncounterId: null,
            rivalFactionEncountered: false,
            shipShieldBoostActive: false,
            specialEffects: [],
            gameOverReason: null // Reset gameOverReason
        };
        stopBgMusic();
        displayPage(gameState.currentPage);
        return;
    }

    // Normal page progression
    switch (gameState.currentPage) {
        case 'splashScreen':
            playBgMusic();
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
                gameState.currentPage = 'newActTitle';
            } else {
                console.error("No first act or encounter to start the game!");
                gameState.gameOverReason = "error"; // Set reason for error
                gameState.currentPage = 'conclusion'; // Direct to conclusion
            }
            break;
        case 'newActTitle':
            gameState.currentPage = 'encounter';
            break;

        case 'results':
            const outcomeNextId = gameState.lastChoiceOutcome.nextId;

            if (outcomeNextId === null) {
                gameState.currentPage = 'endOfActSummary';
            } else {
                const nextEncounter = gameData.encounterLookup[outcomeNextId];
                if (!nextEncounter) {
                    console.error(`Outcome.nextId "${outcomeNextId}" does not point to a valid encounter.`);
                    gameState.gameOverReason = "error"; // Set reason for error
                    gameState.currentPage = 'conclusion'; // Direct to conclusion
                    break; // Exit switch to display conclusion
                }

                const nextActIndex = nextEncounter.actIndex;
                if (nextActIndex !== undefined && nextActIndex > gameState.currentAct) {
                    gameState.currentPage = 'endOfActSummary';
                } else {
                    gameState.currentEncounterId = outcomeNextId;
                    gameState.currentAct = nextActIndex;
                    gameState.currentPage = 'encounter';
                }
            }
            break;

        case 'endOfActSummary':
            if (gameState.currentAct + 1 < gameData.acts.length) {
                gameState.currentAct++;
                gameState.currentEncounterId = gameData.acts[gameState.currentAct].encounters[0].id;
                gameState.currentPage = 'newActTitle';
            } else {
                gameState.currentPage = 'conclusion'; // Game fully completed
            }
            break;
    }

    displayPage(gameState.currentPage);
});


async function initializeGame() {
    console.log("initializeGame() called");
    displayPage('loading');

    try {
        console.log("Fetching characters data...");
        const charactersResponse = await fetch('data/characters.json');
        console.log("Fetching characters data...done");
        const charactersData = await charactersResponse.json();

        console.log("Fetching encounters data...");
        const encountersResponse = await fetch('data/encounters.json');
        console.log("Fetching encounters data...done");
        const actsData = await encountersResponse.json();

        const encounterLookup = {};
        actsData.forEach((act, actIndex) => {
            act.encounters.forEach(encounter => {
                if (encounterLookup[encounter.id]) {
                    console.warn(`Duplicate encounter ID found: ${encounter.id}. This will cause issues with branching.`);
                }
                encounterLookup[encounter.id] = { ...encounter, actIndex: actIndex };
            });
        });

        gameData = {
            characters: charactersData,
            acts: actsData,
            encounterLookup: encounterLookup
        };
        Object.assign(gameData, staticGameNarrative);

        console.log("Game data loaded successfully:", gameData);
        console.log("Setting currentPage to splashScreen");
        console.log("gameState before setting currentPage:", gameState);

        gameState.currentPage = 'splashScreen';
        displayPage(gameState.currentPage);

    } catch (error) {
        console.error("Failed to load game data:", error);
        gameTitleElem.classList.remove('hidden');
        gameContentElem.classList.remove('hidden');
        gameTitleElem.textContent = "Error Loading Game!";
        gameContentElem.textContent = "Please check your network connection, file paths (data/characters.json, data/encounters.json), or ensure your JSON data is valid. (See console for more details)";
        // Set game over reason for error during loading, direct to conclusion
        gameState.gameOverReason = "error";
        gameState.currentPage = 'conclusion';
        displayPage(gameState.currentPage);
    }
}


document.addEventListener('DOMContentLoaded', initializeGame);