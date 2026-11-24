# Voice interview prototype

A member talks to a voice assistant for about 15 minutes and gets a written draft of their business profile. ElevenLabs handles the voice; Claude is the brain, selected on the ElevenLabs agent. This is a test, not a finished feature: nothing is stored by the app.

Test page: `/#/voice-test` (not linked from the menu).
Live: https://mrmeeseeks.github.io/vancobiz-club-app/#/voice-test

## How it works
1. The page starts a call from the browser to an ElevenLabs agent, passing the member's first name, line of work, language and their one extra question.
2. The agent follows the script in `scripts/voice-agent/prompt.md`: one question at a time, business facts only, no client details.
3. At the end it says a short summary, then calls the `save_business_profile` tool. That tool runs in the browser and hands the page a structured draft.
4. The page shows the draft and the transcript. The tester can download both as one JSON file.

There are two agents, one English and one Farsi, so each has the right speech settings.

## Set it up (about 10 minutes)
1. Create an ElevenLabs account at https://elevenlabs.io. The free plan includes 15 minutes of calls a month, enough for one short test. The Starter plan includes 75 minutes. Claude usage is billed from the same ElevenLabs credits; no Anthropic key is needed.
2. In ElevenLabs, create an API key (Developers → API keys).
3. Copy `.env.example` to `.env` if you haven't, and set `ELEVENLABS_API_KEY=` to that key. `.env` is gitignored; never commit it.
4. Run:

   ```bash
   npm run voice:create-agents
   ```

   It prints two agent IDs, one per language.
5. Open the test page, pick a language, paste that language's agent ID, tick the consent box and press **Start talking**. Allow the microphone when asked.

For local runs you can instead put the two IDs in `.env` as `VITE_ELEVENLABS_AGENT_ID_EN` and `VITE_ELEVENLABS_AGENT_ID_FA`, then `npm run dev`.

## If the script is refused
The setup script has not been run against a real account yet, so a field name may be rejected. It prints ElevenLabs' error message. You can also build the agent by hand in the ElevenLabs dashboard:

1. **Agents → Create agent → Blank.** Make one per language.
2. **Language:** English or Persian. **LLM:** a Claude model (the script uses `claude-sonnet-5-5`).
3. **System prompt:** paste all of `scripts/voice-agent/prompt.md`.
4. **First message:** copy from `FIRST_MESSAGE` in `scripts/create-voice-agent.mjs`.
5. **Tools → Add tool → Client tool:** name `save_business_profile`, turn on **Wait for response**, and add the parameters listed in `scripts/voice-agent/save-profile-tool.json`.
6. **Voice:** pick one that supports Persian for the Farsi agent (model `eleven_v4_turbo`).
7. **Security / Advanced:** turn voice recording off, set a short retention period, and set a daily call limit of about 20.
8. Copy the agent ID from the agent's page.

## What to test
- [ ] English: does it ask one question at a time and keep its turns short?
- [ ] Farsi: does it understand you, and does the voice sound natural?
- [ ] Farsi mixed with English words: does it keep up?
- [ ] Say a made-up client name and phone number. It should stop you and leave them out of the draft.
- [ ] Is the draft accurate? Are the client questions in your own words?
- [ ] How long did a full interview take, and how many call minutes did it use?
- [ ] Try it on a phone on the live site.

## Limits of this prototype
- **Public agents.** Anyone who has an agent ID can start a call and use your credits. That is why the IDs are pasted into the page and not built into the public site, and why the script sets a daily limit of 20 calls. Do not add the IDs as GitHub secrets.
- **No saving.** The draft lives in the browser until downloaded. Saving to the member's profile needs Supabase connected and a profile table.
- **No login.** Anyone with the link and an agent ID can use the page.
- **The draft comes from the tester's browser,** so it must not be trusted as-is once this is real.

## Before real members use it
- Connect Supabase and put the page behind member login.
- Make the agents private: a small server function hands the browser a short-lived token, so the agent ID alone is useless.
- Save the draft to a `business_profiles` table that the member reviews and approves.
- Get the member consent wording and a short member agreement reviewed. Voice is sent to ElevenLabs and text to Anthropic, both US companies; BC privacy law expects members to be told this and to agree.
- Delete audio and transcripts once the member approves their profile.
