import { useEffect, useMemo, useState } from 'react';
import { createSoundPlayer } from '../audio/sound';
import { createGame } from '../game/engine';
import type { GameState } from '../game/types';
import { CHARACTERS, type CharacterId } from '../profile/characters';
import {
  applyRun,
  buyOrSelectCharacter,
  getCheckpointCost,
  loadProfile,
  saveProfile,
  type Profile,
} from '../profile/profile';
import { CharacterScreen } from '../screens/CharacterScreen';
import { GameScreen } from '../screens/GameScreen';
import { HelpScreen } from '../screens/HelpScreen';
import { HomeScreen } from '../screens/HomeScreen';
import '../styles/global.css';

type AppScreen = 'home' | 'characters' | 'help' | 'single';

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [profile, setProfile] = useState<Profile>(() => loadProfile(window.localStorage));
  const [game, setGame] = useState<GameState | null>(null);
  const [runId, setRunId] = useState(0);
  const [characterMessage, setCharacterMessage] = useState('');
  const soundPlayer = useMemo(() => {
    const player = createSoundPlayer();
    player.setEnabled(profile.soundEnabled);
    return player;
  }, []);
  const character = CHARACTERS.find((candidate) => candidate.id === profile.selectedCharacter) ?? CHARACTERS[0];
  const checkpointCost = getCheckpointCost(profile.checkpoint);

  useEffect(() => {
    soundPlayer.setEnabled(profile.soundEnabled);
  }, [profile.soundEnabled, soundPlayer]);

  useEffect(() => () => {
    void soundPlayer.dispose();
  }, [soundPlayer]);

  const persist = (next: Profile) => {
    setProfile(next);
    saveProfile(window.localStorage, next);
  };

  const startRun = (startStep = 0) => {
    const fixture = import.meta.env.MODE === 'test'
      ? new URLSearchParams(window.location.search).get('fixture')
      : null;
    const seed = fixture ? 20260902 : (Date.now() ^ (runId + 1) * 2654435761) >>> 0;
    let nextGame = createGame(seed, {
      startStep,
      nowMs: performance.now(),
      reducedMotion: prefersReducedMotion(),
    });
    if (fixture === 'wrong-route') {
      nextGame = { ...nextGame, facing: nextGame.facing === 1 ? -1 : 1 };
    }
    setRunId((current) => current + 1);
    setGame(nextGame);
    setScreen('single');
  };

  const finishRun = (state: GameState) => {
    persist(applyRun(profile, state));
  };

  const restartAtCheckpoint = () => {
    if (profile.checkpoint <= 0 || profile.coins < checkpointCost) return;
    persist({ ...profile, coins: profile.coins - checkpointCost });
    startRun(profile.checkpoint);
  };

  const chooseCharacter = (id: CharacterId) => {
    const result = buyOrSelectCharacter(profile, id);
    if (result.ok) {
      persist(result.profile);
      setCharacterMessage(result.kind === 'purchased' ? '새 캐릭터를 잠금 해제했습니다!' : '캐릭터를 선택했습니다.');
      return;
    }
    setCharacterMessage(result.kind === 'insufficient' ? `코인이 ${result.missingCoins}개 더 필요합니다.` : '선택할 수 없는 캐릭터입니다.');
  };

  const toggleSound = () => persist({ ...profile, soundEnabled: !profile.soundEnabled });

  return (
    <main className="app-root">
      <section className="game-shell" aria-label="유한의 계단 게임">
        {screen === 'home' && (
          <HomeScreen
            profile={profile}
            onSingle={() => startRun(0)}
            onCharacters={() => setScreen('characters')}
            onHelp={() => setScreen('help')}
            onToggleSound={toggleSound}
          />
        )}
        {screen === 'characters' && (
          <CharacterScreen
            profile={profile}
            message={characterMessage}
            onChoose={chooseCharacter}
            onHome={() => setScreen('home')}
          />
        )}
        {screen === 'help' && <HelpScreen onHome={() => setScreen('home')} />}
        {screen === 'single' && game && (
          <GameScreen
            key={runId}
            initialState={game}
            mode="single"
            character={character}
            soundPlayer={soundPlayer}
            onExit={() => setScreen('home')}
            onFinished={finishRun}
            onRestart={() => startRun(0)}
            checkpoint={profile.checkpoint}
            checkpointCost={checkpointCost}
            canUseCheckpoint={profile.coins >= checkpointCost}
            onCheckpointRestart={restartAtCheckpoint}
          />
        )}
      </section>
    </main>
  );
}
