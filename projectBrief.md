## Product Requirements Document (PRD)  
**Title:** Autonomous Space Adventure Game Generator with Cline in VSCode

---

**Objective:**  
Enable Cline, integrated with a local or cloud LLM via VSCode, to autonomously scaffold, generate, and iterate on a mobile-friendly, browser-based space adventure game. The system should use prompts, templates, and context files to ensure generated encounter contexts and narrative elements align with the creator’s style and design goals.

---

### 1. Functional Requirements

**1.1. Game Structure Generation**  
- Automatically scaffold a three-act adventure game with:
  - Four main space adventurer characters, each with unique traits.
  - A mix of “good” (narrative) and “bad” (challenge/monster) encounters per act.
  - Branching storylines based on player choices (fight/flee).

**1.2. Encounter Context Generation**  
- Use customizable prompt templates to generate encounter contexts, ensuring narrative style consistency.
- Allow for injection of a style guide or sample text as reference for the LLM.
- Support both manual and automatic context generation modes.

**1.3. Codebase & Project Setup**  
- Initialize a mobile-friendly web app project (e.g., React, Vue, or Phaser for 2D games).
- Set up folder structure for:
  - Game logic
  - Narrative/encounter templates
  - Assets (images, audio)
  - Style guides and reference texts

**1.4. Iterative Development with Cline**  
- Use Cline’s Plan Mode to outline features, game flow, and component breakdowns.
- Use Cline’s Act Mode to generate code, narrative content, and encounter logic.
- Allow attaching context files (e.g., style guide, sample encounters) to Cline prompts for in-context learning[7].

**1.5. Testing & Review**  
- Automatically generate test cases for key game logic (e.g., encounter resolution, branching).
- Enable review and refinement of generated content via VSCode.

---

### 2. Non-Functional Requirements

- **Performance:** Generated code must run efficiently on mobile browsers.
- **Extensibility:** Easy to add new encounters, story branches, or character traits.
- **Maintainability:** Clean, well-documented code and content structure.
- **Privacy:** Option to use local LLMs (e.g., DeepSeek, Ollama) for privacy and speed[5][7].

---

### 3. Integration & Configuration

- **VSCode Setup:**  
  - Install Cline extension[3][6][7].
  - Connect to chosen LLM (local or cloud) via API key or local endpoint[5][6][7].
  - Configure Cline to use project folder as context source.
  - Attach style guide and sample narrative files as prompt context.

- **Cline Usage Flow:**  
  1. In Plan Mode, prompt Cline to outline the game’s structure and main components.
  2. In Act Mode, instruct Cline to generate:
     - Project scaffolding (folders, boilerplate code)
     - Initial character and encounter templates
     - Sample narrative and challenge encounters using the provided style guide
  3. Review, refine, and iterate on generated outputs.

---

### 4. Example Prompt for Cline

```markdown
# Project: Space Adventure Game Generator

## Objective:
Build a mobile-friendly, browser-based game where players oversee four space adventurers through a three-act journey. Encounters are a mix of narrative and challenges, with player choices influencing the story.

## Requirements:
- Scaffold a React (or Phaser) project for mobile web.
- Create four main characters with unique traits.
- Implement a system for generating and handling good (story) and bad (monster) encounters.
- Use the attached style guide and sample encounters to ensure narrative consistency.
- All content and code should be generated in English, using concise and engaging language.

## Attachments:
- style_guide.md
- sample_encounters.md

## Tasks:
1. Outline the game’s folder and file structure.
2. Generate boilerplate code for the main game loop.
3. Create templates for encounter generation, referencing the attached style guide.
4. Produce sample encounter contexts for Act 1 using the style guide.
```

---

### 5. Success Criteria

- Project scaffolds and runs as a mobile web app.
- Generated encounters and narrative match the provided style guide.
- All code and content are accessible and editable in VSCode.
- Cline can iterate and expand the game based on further prompts.

---

**References:**  
- Cline integration guides and usage patterns[1][2][3][4][5][6][7].  
- LLM configuration for local/cloud models[5][6][7].  
- Narrative style control via prompt context and attachments[7].

---

This PRD is designed for direct use with Cline in VSCode, leveraging Plan/Act modes and prompt context to automate your game’s foundation and content generation.

Citations:
[1] https://www.youtube.com/watch?v=F84TE3icmcQ
[2] https://cline.bot
[3] https://www.reddit.com/r/LocalLLaMA/comments/1gbb2de/vscode_cline_vllm_qwen25_fast/
[4] https://github.com/cline/cline
[5] https://www.linkedin.com/posts/rakesh-khanduja-61567913_ai-codingproductivity-deepseek-activity-7321202446733651969-lem_
[6] https://blogs.novita.ai/how-to-integrate-novita-ai-llm-api-with-cline-in-vscode/
[7] https://zazencodes.com/blog/cline-with-ollama-and-claude
[8] https://www.youtube.com/watch?v=xIQAqYYrmy8

---
Answer from Perplexity: pplx.ai/share