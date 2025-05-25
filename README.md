# Mafia game

This application will allow the user to play a game of mafia with their friends, while each user will play with their phone.

All of the users will sign up to the application with auth0, and will be able to login with their google account.

Then they will get in the lobby where they could create a game, or join a game via a code.

# Rules of the game

The game is for exactly 10 players, no more, no less.

## Roles:
- 3 Mafia:
  - 1 Don (The head of the mafia)
  - 2 Mafia
- 7 Civilians:
  - 1 Sheriff
  - 6 Civilians

## Gameplay
At the beginning of the game each player is assigned with a number, and the numbers are assigned in a random order.

Each player needs to sit in the order of the numbers in a circle.

### First night
Each player is assigned with a role, and the roles are assigned in a random order.
#### Phase 1:
- All the players need to cover their eyes, one by one from player 1 to player 10 they will discover their role.

#### Phase 2:
- All 3 mafia players will wake up, and will be able to see the roles of the other mafia players.
- The don will choose 3 players to kill in order for the next 3 nights.
- The mafia players will then go back to sleep.

### The first day
- All the players will wake up
- In the first day everyone will get 1 minute to speak one after the other.
- In the end of the first day no votes are casted.

### Night
All players will cover their eyes, and wait for their turn.
#### Phase 1:
- We count from 1 to 10, when the mafia decides they want to kill the player with the called number, they will click the screen.
- If there is no consensus, the game will continue and no player will be killed.

#### Phase 2:
- The sheriff will wake up, and will be able to pick a player to investigate.
- if that player is a mafia, or a don, the sheriff will be able to see the role of the player.

#### Phase 3:
- The Don will wake up, and will be able to pick a player to investigate.
- the don will be able to see if that player is the sheriff, or a civilian.

### Day
All the players will wake up

#### Phase 1:
- The game will announce the number of the player that was killed the previous night if there was a kill.
- Each day will start with the player that has the same number as the day.
- one by one the players will get 1 minute to speak one after the other.
- In each turn a person speaks he could vote for a player to blame as a mafia.

#### Phase 2:
- All players that were voted as a mafia will be get 30 seconds to defend themselves.
- The order of the players to speak is the same as the order that they were voted as a mafia. (if player 5 was voted as a mafia before player 1, then player 5 will speak first)

#### Phase 3:
- Each of the players will be able to vote for the player that they think is the mafia.
- In case of a tie, another vote will be casted, but this time on the player that had the most votes.
- In case of another tie, no player will be removed from the game.

- the player that was voted as a mafia will be removed from the game.

## Winning conditions
- In case of a tie between the number of mafia players, and the rest of the players, the game will end and the mafia will win.
- In case that all mafia players are removed from the game, the civilians will win.


# Technical details

- There will be 2 modes
  - One that allows a host to run the game, he will get a different screen than the other players. and there will be 11 people overall.
  He will have an options to give penalties and to play with the game's settings.
  - The second mode is without a host, and no penalties will be available ATM.
