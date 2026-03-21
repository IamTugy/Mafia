# Mafia — Game Rules & Developer Reference

## 1. Overview

Mafia is a social deduction party game for **5–10 players**. One hidden group (the Mafia) knows each other and tries to eliminate the Civilians. The Civilians try to identify and vote out the Mafia during daytime discussion. The game alternates between Night and Day rounds until one side wins.

---

## 2. Roles

| Role | Count | Faction | Special Ability |
|------|-------|---------|-----------------|
| Don | 1 | Mafia | Knows all Mafia; each night can investigate one player to learn if they are the Sheriff |
| Mafia | ~20% of players (min 1) | Mafia | Knows the Don and other Mafia; votes each night to eliminate one Civilian |
| Sheriff | 1 (only if ≥ 6 players) | Civilian | Each night can investigate one player to learn if they are Mafia/Don |
| Civilian | Remainder | Civilian | No special ability; votes during the day |

**Role distribution** (mirrors `computeRoles()` in `src/lib/store/server-store.ts`):
- 1 Don
- `floor(N × 0.2)` Mafia members (minimum 1)
- 1 Sheriff if N ≥ 6
- Remaining players are Civilians

---

## 3. Player Numbers (Table Seats)

- Before the game starts, each player is assigned a random **seat number** (1–N)
- This number is their identity for the entire game — players are called by number, not name
- Numbers are assigned server-side at game start and shown on every player's screen
- Players must sit around a table in this exact order

---

## 4. Pre-Game: Role Reveal

- Each player sees the **back of a card** that fills most of their screen
- **Press and hold** the card → it flips face-up with a CSS 3D animation; role + seat number shown
- **Release** → card flips back (so neighbours can't peek)
- After the player views the card at least once, a **"Ready"** button appears at the bottom
- When **all** players press Ready, the game phase advances

---

## 5. Night Phase (General)

The game narrates _"Good night, everyone closes their eyes"_ (TTS — spoken on one random phone). All players close their eyes physically; phones stay on the relevant role screen.

---

### 5a. Night 1 — No Kill

**Phase:** `night.mafiaSetup`

- Mafia members open their eyes and see each other's seat numbers
- Screen shows all Mafia numbers, plus the Don
- A **"Done"** button ends this phase (host-side or all-mafia-ready)
- No kill happens on Night 1 — the game immediately transitions to Day 1

---

### 5b. Night 2+ — Mafia Kill

**Phase:** `night.mafiaKill`

- The game calls out each alive player number in ascending order, with a **2-second gap** between calls
- Audio plays on the **phone of the number being called** (each player hears their own number)
- Mafia members tap their screen when they hear a number they want to kill
- After all numbers have been called, the host tallies votes:
  - **Unanimous vote** → that player is eliminated (announced next morning)
  - **Split vote** → no one dies
- Eliminated players and players who are already dead are skipped

---

### 5c. Sheriff Check

**Phase:** `night.sheriffCheck` — **every night from Night 1**

- After Mafia goes back to sleep (2 s pause), the game narrates _"Sheriff, wake up"_ — **even if the Sheriff is dead**. This gives Mafia no information about whether the Sheriff is still alive.
- **If Sheriff is alive:** Sheriff's screen shows a number grid of all alive player numbers except their own. Numbers already investigated in previous nights are crossed out. Sheriff taps a number → screen shows **"Village"** or **"Mafia"** (Don counts as Mafia). Sheriff presses **Continue**.
- **If Sheriff is dead:** Their screen stays dark/sleeping; the game pauses the same amount of time before moving on (fake delay for cover).
- 2 s pause → next phase.

---

### 5d. Don Check

**Phase:** `night.donCheck` — **every night from Night 1**

- After Sheriff goes back to sleep (2 s pause), the game narrates _"Don, wake up"_ — **even if the Don is dead** (same fake-cover reason).
- **If Don is alive:** Don's screen shows the number grid (all alive numbers except own, previously checked crossed out). Don taps → screen shows **"Sheriff"** or **"Not Sheriff"**. Don presses **Continue**.
- **If Don is dead:** Same dark/sleeping screen and fake delay.
- 2 s pause → night ends.

---

## 6. Day Phase

### 6a. Day Start

**Phase:** `day.start`

- Game narrates _"Everyone wake up!"_ and announces who died last night (if anyone)
- Eliminated player's screen shows **"Wasted"** + an **Exit** button; they leave the game
- Live player count updates

---

### 6b. Discussion

**Phase:** `day.discussion`

- Players speak in seat-number order
  - Day 1 starts from seat #1
  - Each subsequent day starts from the seat after the previous round's starter, wrapping around to the lowest alive number
- Each player has **60 seconds** — a large circular countdown timer fills their screen with their number shown in the centre
- For players **not currently speaking**: their seat number is displayed full-screen, rotated 180° (upside-down so the speaking player can read it from across the table)
- The speaking player can:
  - Press **Finish** to end their turn early
  - Press **Pause** (host only) to pause the timer
  - Press **Accuse** to select a seat number that hasn't been accused yet this round
- Accused numbers are crossed out in the Accuse picker number grid
- When the timer expires, the next player's timer starts automatically with no interruption
- **If no one is accused by the end of the full discussion round** → defense and final-vote phases are skipped; game goes straight to the next night

---

### 6c. Defense

**Phase:** `day.defense`

- **Skipped entirely** if no one was accused during discussion
- Each accused player (in accusation order) has **30 seconds** to defend themselves
- Same timer UI as discussion; no ability to accuse during defense

---

### 6d. Final Vote

**Phase:** `day.finalVote`

- **Skipped entirely** if no one was accused during discussion
- Game announces: _"Raise your phones — it's time to vote"_
- All alive players press **Ready** on their phone (same mechanic as pre-game)
- A **5-second countdown** appears
- Each player sees buttons for every accused player; they **must** tap one number — there is no abstain option
- A warning is shown if the player hasn't voted yet: _"Pick someone or your vote goes to the last accused player!"_
- If the timer runs out and a player hasn't voted, their vote is **automatically cast for the last accused player** (i.e. the most recently accused person this round)
- Once a player taps a number they are locked in; the vote is sent to the host
- When all alive players have voted:
  - **Clear majority** → that player is eliminated; screen shows "Wasted" + Exit
  - **Tie** → all tied players are eliminated

---

## 7. Win Conditions

Checked after every elimination:

| Condition | Winner |
|-----------|--------|
| All Mafia (Don + Mafia members) are eliminated | Civilians win |
| Mafia count ≥ Civilian count (e.g. 1v1, 2v2, 3v3) | Mafia wins |

---

## 8. Audio Narration

- Every phase transition triggers a narration line spoken aloud
- Audio plays on **one randomly selected alive player's phone** per announcement
- Text is generated by **Chrome's built-in Prompt API** (`window.ai` / Gemini Nano), maintaining a consistent game theme and backstory across the session
- **Fallback:** if `window.ai` is unavailable, a pool of pre-written English lines is used per phase
- TTS engine: Web Speech API (`window.speechSynthesis`)
- Language: English (Hebrew support can be added later via `speechSynthesis` voice selection)

---

## 9. Phase Sequence Summary

```
waiting
  └─ night.roleReveal         (all players — card flip + ready)
       └─ night.mafiaSetup    (mafia see each other's numbers)
            │
            ├─ [Night 1 only — no kill]
            │    night.sheriffCheck  (sheriff investigates, every night)
            │    night.donCheck      (don investigates, every night)
            │    day.start           (wake up — no death announced Night 1)
            │    day.discussion      (60s each, accuse)
            │    day.defense         (30s each accused — skipped if no accusations)
            │    day.finalVote       (vote, eliminate — skipped if no accusations)
            │
            └─ [Night 2+ — repeat until win condition]
                 night.mafiaKill     (mafia vote by tapping)
                 night.sheriffCheck
                 night.donCheck
                 day.start           (announce last night's death)
                 day.discussion
                 day.defense
                 day.finalVote
                 → repeat from night.mafiaKill
```

> **Between every sleep/wake transition:** a 2-second pause gives players time to physically close or open their eyes before the next role is called.
