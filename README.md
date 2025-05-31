# Mafia Game

This application allows users to play a game of **Mafia** with their friends, using their phones.

All users sign up using **Auth0**, and can log in with their **Google accounts**.

After logging in, users enter a **lobby**, where they can either **create a game** or **join a game using a code**.

---

## Game Rules

The game is designed for **exactly 10 players**—no more, no less.

### Roles

- **3 Mafia Members**:
  - 1 Don (Mafia leader)
  - 2 Mafia

- **7 Civilians**:
  - 1 Sheriff
  - 6 Civilians

---

## Gameplay

At the beginning of the game, each player is assigned a **random number (1–10)**. Players must **sit in a circle** according to their number.

### First Night

Each player is assigned a **random role**.

#### Phase 1: Role Reveal

- All players cover their eyes.
- One by one, from player 1 to 10, each uncovers their eyes briefly to discover their role.

#### Phase 2: Mafia Wake Up

- All 3 mafia members open their eyes and identify each other.
- The **Don** pre-selects **three players to kill**—one per night for the next three nights.
- The mafia then "go back to sleep."

---

### First Day

- All players wake up.
- Each player has **1 minute to speak**, one after the other.
- **No votes** are cast on the first day.

---

### Night Phase

All players cover their eyes and wait for their turn.

#### Phase 1: Mafia Kill

- The game counts aloud from 1 to 10.
- If the mafia agrees to kill the player whose number is called, they tap the screen during that number.
- If there is no consensus, no one is killed.

#### Phase 2: Sheriff Investigation

- The **Sheriff** opens their eyes and selects one player to investigate.
- If the player is a Mafia member or the Don, their role is revealed to the Sheriff.

#### Phase 3: Don Investigation

- The **Don** wakes up and selects one player to investigate.
- The Don learns whether the player is the **Sheriff** or a **Civilian**.

---

### Day Phase

All players wake up.

#### Phase 1: Announcements and Speeches

- If a player was killed the previous night, their number is announced.
- The day begins with the player whose number matches the day number.
- Each player speaks for 1 minute and may accuse another player of being Mafia.

#### Phase 2: Defense

- Players who were accused get 30 seconds to defend themselves.
- They speak in the order in which they were accused.

#### Phase 3: Voting

- All players vote for the person they believe is a Mafia member.
- In the case of a tie, a **second vote** is held between the tied players.
- If the second vote is also a tie, **no one is eliminated**.
- The player who receives the most votes is removed from the game.

---

## Winning Conditions

- If the number of **Mafia members equals** the number of remaining **Civilians**, the **Mafia win**.
- If **all Mafia members are eliminated**, the **Civilians win**.

---

## Technical Details

There are **two modes** of gameplay:

### 1. Host Mode
- An **11th player** acts as the **Host** with a special interface.
- The Host can apply **penalties** and change **game settings**.

### 2. Hostless Mode
- No Host is present.
- Penalties are **not supported** in this mode (for now).
