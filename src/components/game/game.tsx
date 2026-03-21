import { useEffect, useRef } from 'react';

// Night phase components
import { Seating } from './night/seating.tsx';
import { RoleReveal } from './night/role-reveal.tsx';
import { MafiaSetup } from './night/mafia-setup.tsx';
import { MafiaKill } from './night/mafia-kill.tsx';
import { SheriffCheck } from './night/sheriff-check.tsx';
import { DonCheck } from './night/don-check.tsx';

// Day phase components
import { DayStart } from './day/day-start.tsx';
import { Discussion } from './day/discussion.tsx';
import { Defense } from './day/defense.tsx';
import { FinalVote } from './day/final-vote.tsx';
import { LastWords } from './day/last-words.tsx';

import { GameOver } from './game-over.tsx';
import { useClientStore } from '@/lib/store/client-store.ts';
import { useServerStore } from '@/lib/store/server-store.ts';
import { Button } from '@/components/ui/Button';
import { StatusSchema } from '@/lib/store/types';
import { narrateEvent, stopSpeaking } from '@/lib/audio/tts';
import { NarrationEvent } from '@/lib/audio/narration-events';
import type { NarrationEventKey } from '@/lib/audio/narration-events';
import {
  DISCUSSION_TIME_SECONDS,
  DEFENSE_TIME_SECONDS,
  FINAL_VOTE_TIME_SECONDS,
  NIGHT_TRANSITION_DELAY_MS,
  MAFIA_NUMBER_CALL_INTERVAL_MS,
  MAFIA_KILL_WAIT_AFTER_CALLS_MS,
  MAFIA_SETUP_TIMEOUT_MS,
  NIGHT_INVESTIGATION_TIMEOUT_MS,
  DAY_START_DURATION_MS,
  LAST_WORDS_SECONDS,
} from '@/lib/consts';

// Pre-phase narrations to chain before the main event
type NarrationEventKey2 = NarrationEventKey;
const PRE_PHASE_NARRATIONS: Partial<Record<string, NarrationEventKey2[]>> = {
  'night.mafiaSetup':   [NarrationEvent.GOOD_NIGHT],
  'night.mafiaKill':    [NarrationEvent.GOOD_NIGHT],
  'night.sheriffCheck': [NarrationEvent.MAFIA_SLEEP],
  'night.donCheck':     [NarrationEvent.SHERIFF_SLEEP],
  'day.start':          [NarrationEvent.DON_SLEEP],
};

export function Game() {
  const { gameState, currentPlayerData } = useClientStore();
  const playersList = useClientStore((state) => state.playersList);
  const clientHostId = useClientStore((state) => state.host?.id);

  const serverHost = useServerStore((state) => state.host);
  const serverClients = useServerStore((state) => state.clients);
  const _enterPhase = useServerStore((state) => state._enterPhase);
  const _processNightKill = useServerStore((state) => state._processNightKill);
  const advanceSpeaker = useServerStore((state) => state.advanceSpeaker);
  const advanceFinalVote = useServerStore((state) => state._processFinalVote);
  const eliminateDisconnectedPlayer = useServerStore(
    (state) => state.eliminateDisconnectedPlayer
  );
  const unpauseGame = useServerStore((state) => state.unpauseGame);
  const sendAction = useClientStore((state) => state.sendAction);

  const isHost = serverHost?.isActive;
  const serverHostId = serverHost?.id;
  const gameCode = clientHostId ?? serverHostId ?? null;

  const isPaused = !!gameState.pausedBy;
  const disconnectedPlayer = isPaused
    ? playersList.find((p) => p.id === gameState.pausedBy)
    : null;

  const myDisconnectVote = currentPlayerData?.id
    ? (gameState.disconnectVotes?.[currentPlayerData.id] ?? null)
    : null;
  const eliminateVoteCount = Object.values(gameState.disconnectVotes ?? {}).filter(
    (v) => v === 'eliminate'
  ).length;
  const alivePlayers = playersList.filter((p) => p.status === 'inGame');
  const eliminateThreshold = Math.ceil(alivePlayers.length * 0.75);

  // Track previous narration key so it only fires when truly new
  const prevNarrationKeyRef = useRef<string>('');

  // Narration: designated speaker plays TTS with chained pre-phase narrations
  useEffect(() => {
    if (!gameState.narrationEvent) return;
    const key = `${gameState.narrationEvent}::${gameState.speakerStartedAt ?? gameState.phaseStartedAt ?? 0}`;
    if (key === prevNarrationKeyRef.current) return;
    prevNarrationKeyRef.current = key;
    if (currentPlayerData?.id !== gameState.speakerId) return;

    let cancelled = false;
    const phase = gameState.phase;
    const mainEvent = gameState.narrationEvent as NarrationEventKey;
    const context = gameState.narrationContext ?? undefined;
    const preEvents = PRE_PHASE_NARRATIONS[phase] ?? [];

    const run = async () => {
      for (const evt of preEvents) {
        if (cancelled) return;
        await narrateEvent(evt);
        if (cancelled) return;
        await new Promise<void>((res) => setTimeout(res, 800));
      }
      if (cancelled) return;
      await narrateEvent(mainEvent, context);
    };

    run();

    // Don't stop speech on cleanup — let the current sentence finish naturally.
    // The next speak() call will cancel when the new narration text is ready.
    return () => {
      cancelled = true;
    };
  }, [
    gameState.narrationEvent,
    gameState.narrationContext,
    gameState.speakerId,
    gameState.phaseStartedAt,
    gameState.speakerStartedAt,
    gameState.phase,
    currentPlayerData?.id,
  ]);

  // Speech synthesis keepalive — Chrome pauses synthesis after ~30s of inactivity
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const id = setInterval(() => {
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // ── HOST-ONLY TIMERS ──────────────────────────────────────────────────────

  // day.start: auto-advance after display duration
  // If lastEliminated exists → brief display then lastWords; else → discussion
  useEffect(() => {
    if (!isHost || isPaused || gameState.phase !== 'day.start') return;
    const hasVictim = !!gameState.lastEliminated;
    const delay = hasVictim ? DAY_START_DURATION_MS / 2 : DAY_START_DURATION_MS;
    const id = setTimeout(() => {
      if (hasVictim) {
        _enterPhase('day.lastWords', gameState.day);
      } else {
        _enterPhase('day.discussion', gameState.day);
      }
    }, delay);
    return () => clearTimeout(id);
  }, [isHost, isPaused, gameState.phase, gameState.day, gameState.lastEliminated, _enterPhase]);

  // day.lastWords: advance to next phase after LAST_WORDS_SECONDS
  useEffect(() => {
    if (!isHost || isPaused || gameState.phase !== 'day.lastWords') return;
    if (!gameState.phaseStartedAt) return;
    const remaining = LAST_WORDS_SECONDS * 1000 - (Date.now() - gameState.phaseStartedAt);
    const goNext = () => {
      const next = gameState.lastWordsNextPhase ?? 'day.discussion';
      const nextDay = next === 'night.mafiaKill' ? gameState.day + 1 : gameState.day;
      _enterPhase(next, nextDay);
    };
    if (remaining <= 0) { goNext(); return; }
    const id = setTimeout(goNext, remaining);
    return () => clearTimeout(id);
  }, [isHost, isPaused, gameState.phase, gameState.phaseStartedAt, gameState.lastWordsNextPhase, gameState.day, _enterPhase]);

  // night.mafiaKill: auto-process after all numbers called + buffer
  useEffect(() => {
    if (!isHost || isPaused || gameState.phase !== 'night.mafiaKill') return;
    if (!gameState.phaseStartedAt) return;

    const alivePlayers = serverClients.filter(
      (c) => c.playerData.status === StatusSchema.enum.inGame
    );
    const callDuration = alivePlayers.length * MAFIA_NUMBER_CALL_INTERVAL_MS;
    const totalMs = callDuration + MAFIA_KILL_WAIT_AFTER_CALLS_MS;
    const remaining = totalMs - (Date.now() - gameState.phaseStartedAt);

    if (remaining <= 0) { _processNightKill(); return; }
    const id = setTimeout(_processNightKill, remaining);
    return () => clearTimeout(id);
  }, [isHost, isPaused, gameState.phase, gameState.phaseStartedAt, serverClients, _processNightKill]);

  // night.mafiaSetup: fallback timeout if not all mafia press Done
  useEffect(() => {
    if (!isHost || isPaused || gameState.phase !== 'night.mafiaSetup') return;
    const id = setTimeout(
      () => _enterPhase('night.sheriffCheck', gameState.day),
      MAFIA_SETUP_TIMEOUT_MS
    );
    return () => clearTimeout(id);
  }, [isHost, isPaused, gameState.phase, gameState.day, _enterPhase]);

  // night.sheriffCheck / donCheck: auto-advance if role is dead (random 6–10s fake delay)
  useEffect(() => {
    if (!isHost || isPaused) return;
    if (
      gameState.phase !== 'night.sheriffCheck' &&
      gameState.phase !== 'night.donCheck'
    ) return;

    const alivePlayers = serverClients
      .filter((c) => c.playerData.status === StatusSchema.enum.inGame)
      .map((c) => c.playerData);

    const roleIsAlive =
      gameState.phase === 'night.sheriffCheck'
        ? alivePlayers.some((p) => p.role === 'sheriff')
        : alivePlayers.some((p) => p.role === 'don');

    if (roleIsAlive) {
      // Real role: fall back after investigation timeout in case they don't press Continue
      const id = setTimeout(() => {
        const next =
          gameState.phase === 'night.sheriffCheck' ? 'night.donCheck' : 'day.start';
        _enterPhase(next, gameState.day);
      }, NIGHT_INVESTIGATION_TIMEOUT_MS);
      return () => clearTimeout(id);
    } else {
      // Role is dead — random 6–10s fake delay
      const fakeDelay = Math.floor(Math.random() * 4000 + 6000);
      const id = setTimeout(() => {
        const next =
          gameState.phase === 'night.sheriffCheck' ? 'night.donCheck' : 'day.start';
        _enterPhase(next, gameState.day);
      }, fakeDelay);
      return () => clearTimeout(id);
    }
  }, [isHost, isPaused, gameState.phase, gameState.day, serverClients, _enterPhase]);

  // day.discussion / defense: advance speaker when timer expires
  useEffect(() => {
    if (!isHost || isPaused) return;
    if (gameState.phase !== 'day.discussion' && gameState.phase !== 'day.defense') return;
    if (!gameState.speakerStartedAt) return;

    const duration =
      gameState.phase === 'day.discussion'
        ? DISCUSSION_TIME_SECONDS * 1000
        : DEFENSE_TIME_SECONDS * 1000;

    const id = setInterval(() => {
      if (Date.now() - (gameState.speakerStartedAt ?? Date.now()) >= duration) {
        advanceSpeaker();
      }
    }, 500);
    return () => clearInterval(id);
  }, [isHost, isPaused, gameState.phase, gameState.speakerStartedAt, advanceSpeaker]);

  // day.finalVote: process when voting window expires
  useEffect(() => {
    if (!isHost || isPaused || gameState.phase !== 'day.finalVote') return;
    if (!gameState.voteOpenAt) return;

    const windowCloseAt = gameState.voteOpenAt + FINAL_VOTE_TIME_SECONDS * 1000;
    const delay = windowCloseAt - Date.now();
    if (delay <= 0) { advanceFinalVote(); return; }
    const id = setTimeout(advanceFinalVote, delay);
    return () => clearTimeout(id);
  }, [isHost, isPaused, gameState.phase, gameState.voteOpenAt, advanceFinalVote]);

  // ── RENDER ────────────────────────────────────────────────────────────────

  const getPhaseComponent = () => {
    // Eliminated players always see the dead screen, except during their own last-words turn
    const isEliminated = currentPlayerData?.status === 'eliminated';
    const isMyLastWords =
      gameState.phase === 'day.lastWords' && gameState.lastEliminated === currentPlayerData?.id;

    if (isEliminated && !isMyLastWords) {
      const myIndex = currentPlayerData?.index;
      return (
        <div className="flex h-full w-full flex-col bg-gray-950">
          {/* Top: controls in normal orientation (readable by eliminated player) */}
          <div className="flex flex-col items-center gap-3 pt-10 pb-4">
            <p className="text-sm text-gray-500">You've been eliminated</p>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-gray-800 px-8 py-3 text-sm font-semibold text-gray-300 active:bg-gray-700"
            >
              Exit Game
            </button>
          </div>

          {/* Bottom: seat number rotated 180° so it's visible to players across the table */}
          <div
            className="flex flex-1 items-center justify-center"
            style={{ transform: 'rotate(180deg)' }}
          >
            <div className="relative flex items-center justify-center">
              <p
                className="font-black text-gray-700 leading-none select-none"
                style={{ fontSize: 'min(40vw, 220px)' }}
              >
                {myIndex ?? '?'}
              </p>
              <span
                className="absolute font-black text-red-500 leading-none select-none pointer-events-none"
                style={{ fontSize: 'min(42vw, 230px)', opacity: 0.85 }}
              >
                ✕
              </span>
            </div>
          </div>
        </div>
      );
    }

    switch (gameState.phase) {
      case 'night.seating':    return <Seating />;
      case 'night.roleReveal': return <RoleReveal />;
      case 'night.mafiaSetup': return <MafiaSetup />;
      case 'night.mafiaKill':  return <MafiaKill />;
      case 'night.sheriffCheck': return <SheriffCheck />;
      case 'night.donCheck':   return <DonCheck />;
      case 'day.start':        return <DayStart />;
      case 'day.lastWords':    return <LastWords />;
      case 'day.discussion':   return <Discussion />;
      case 'day.defense':      return <Defense />;
      case 'day.finalVote':    return <FinalVote />;
      case 'ended':            return <GameOver />;
      default: return null;
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* Hidden test anchor — lets e2e tests detect the active phase */}
      <span
        data-testid="current-phase"
        data-phase={gameState.phase}
        className="sr-only"
        aria-hidden="true"
      >
        {gameState.phase}
      </span>

      {/* Always-visible game info chip */}
      {gameCode && (
        <div className="absolute top-2 right-2 z-40 flex items-center gap-1.5 rounded-full border border-gray-700 bg-gray-900/80 px-2.5 py-0.5 backdrop-blur-sm">
          {currentPlayerData?.index != null && (
            <>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">#</span>
              <span className="font-mono text-xs font-bold text-white">
                {currentPlayerData.index}
              </span>
              <span className="text-gray-700">·</span>
            </>
          )}
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Game</span>
          <span className="font-mono text-xs font-bold text-gray-300">
            {gameCode.slice(-6).toUpperCase()}
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">{getPhaseComponent()}</div>

      {/* Disconnect modal — all players */}
      {isPaused && disconnectedPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h2 className="mb-2 text-xl font-bold text-white">Player Disconnected</h2>
            <p className="mb-1 text-gray-300">
              <span className="font-semibold text-white">{disconnectedPlayer.name}</span>
              {disconnectedPlayer.index != null && (
                <span className="text-gray-400"> (#{disconnectedPlayer.index})</span>
              )}{' '}
              has disconnected.
            </p>
            <p className="mb-5 text-xs text-gray-500">
              {eliminateVoteCount} / {eliminateThreshold} votes to eliminate
            </p>

            {myDisconnectVote ? (
              <p className="text-center text-sm text-gray-400">
                You voted:{' '}
                <span
                  className={
                    myDisconnectVote === 'eliminate' ? 'text-red-400 font-semibold' : 'text-blue-400 font-semibold'
                  }
                >
                  {myDisconnectVote === 'eliminate' ? 'Eliminate' : 'Wait'}
                </span>
              </p>
            ) : (
              <div className="flex gap-3">
                {isHost ? (
                  <>
                    <Button
                      onClick={() => eliminateDisconnectedPlayer(disconnectedPlayer.id)}
                      className="flex-1 bg-red-600 text-white hover:bg-red-700"
                    >
                      Eliminate
                    </Button>
                    <Button onClick={unpauseGame} variant="semiTransparent" className="flex-1">
                      Continue
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => sendAction({ type: 'disconnectVote', vote: 'eliminate' })}
                      className="flex-1 bg-red-600 text-white hover:bg-red-700"
                    >
                      Eliminate
                    </Button>
                    <Button
                      onClick={() => sendAction({ type: 'disconnectVote', vote: 'wait' })}
                      variant="semiTransparent"
                      className="flex-1"
                    >
                      Wait
                    </Button>
                  </>
                )}
              </div>
            )}

            <p className="mt-4 text-center text-xs text-gray-500">
              Game resumes automatically if they reconnect.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
