import { useEffect, useRef } from 'react';
import type { SoundPlayer } from '../audio/sound';
import { useGameSession } from '../app/useGameSession';
import { useGameControls } from '../controls/useGameControls';
import type { GameState } from '../game/types';
import { CHARACTERS, type CharacterDefinition } from '../profile/characters';
import { GameCanvas } from '../render/GameCanvas';
import { STAGES } from '../render/drawScene';
import { ResultOverlay } from './ResultOverlay';

interface GameScreenProps {
  initialState: GameState;
  mode: 'single';
  character?: CharacterDefinition;
  soundPlayer?: SoundPlayer;
  onExit?: () => void;
  onFinished?: (state: GameState) => void;
  onRestart?: () => void;
  checkpoint?: number;
  checkpointCost?: number;
  canUseCheckpoint?: boolean;
  onCheckpointRestart?: () => void;
}

export function GameScreen({
  initialState,
  character = CHARACTERS[0],
  soundPlayer,
  onExit = () => undefined,
  onFinished = () => undefined,
  onRestart = () => undefined,
  checkpoint,
  checkpointCost,
  canUseCheckpoint,
  onCheckpointRestart,
}: GameScreenProps) {
  const { state, act, pause, resume } = useGameSession(initialState);
  const reportedResult = useRef(false);
  const controlsEnabled = state.status === 'playing';
  useGameControls(act, controlsEnabled);

  useEffect(() => {
    state.events.forEach((event) => soundPlayer?.play(event));
  }, [soundPlayer, state.events]);

  useEffect(() => {
    if ((state.status === 'failed' || state.status === 'won') && !reportedResult.current) {
      reportedResult.current = true;
      onFinished(state);
    }
  }, [onFinished, state]);

  const progress = Math.min(100, (state.step / Math.max(1, state.route.length - 1)) * 100);
  const timeProgress = Math.min(100, (state.timeLeftMs / Math.max(1, state.maxTimeMs)) * 100);

  return (
    <section className="play-screen" aria-label="싱글 플레이">
      <div className="game-hud">
        <button className="icon-button" type="button" onClick={onExit} aria-label="홈으로 나가기">×</button>
        <div className="step-readout">
          <span>현재 계단</span>
          <strong>{state.step.toLocaleString('ko-KR')} <small>/ 2,000</small></strong>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={state.status === 'paused' ? resume : pause}
          aria-label={state.status === 'paused' ? '계속하기' : '일시정지'}
          disabled={state.status === 'falling' || state.status === 'failed' || state.status === 'won'}
        >
          {state.status === 'paused' ? '▶' : 'Ⅱ'}
        </button>
      </div>

      <div className="progress-track" aria-label={`정상까지 ${Math.round(progress)}퍼센트`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="canvas-wrap">
        <GameCanvas state={state} character={character} />
        <div className="stage-chip">{STAGES[Math.min(4, Math.floor(state.step / 400))].name}</div>
        <div className="direction-chip">방향: {state.facing === -1 ? '왼쪽' : '오른쪽'}</div>
        {state.status === 'falling' && <div className="falling-chip">추락 중…</div>}
        {state.status === 'paused' && (
          <button className="pause-card" type="button" onClick={resume}>일시정지 · 눌러서 계속</button>
        )}
      </div>

      <div className="timer" aria-label={`남은 시간 ${(state.timeLeftMs / 1000).toFixed(1)}초`}>
        <span style={{ width: `${timeProgress}%` }} />
      </div>

      <div className="control-panel">
        <button
          className="control-button turn-control"
          type="button"
          aria-label="전환 + 오르기"
          onClick={() => act('turnAndClimb')}
          disabled={!controlsEnabled}
        >
          <span className="control-key">SPACE</span>
          전환 + 오르기
        </button>
        <button
          className="control-button climb-control"
          type="button"
          aria-label="오르기"
          onClick={() => act('climb')}
          disabled={!controlsEnabled}
        >
          <span className="control-key">↑</span>
          오르기
        </button>
      </div>

      <ResultOverlay
        state={state}
        onRestart={onRestart}
        onHome={onExit}
        checkpoint={checkpoint}
        checkpointCost={checkpointCost}
        canUseCheckpoint={canUseCheckpoint}
        onCheckpointRestart={onCheckpointRestart}
      />
    </section>
  );
}
