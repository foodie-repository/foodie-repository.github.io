import type { GameState } from '../game/types';

interface ResultOverlayProps {
  state: GameState;
  onRestart: () => void;
  onHome: () => void;
  checkpoint?: number;
  checkpointCost?: number;
  canUseCheckpoint?: boolean;
  onCheckpointRestart?: () => void;
}

export function ResultOverlay({
  state,
  onRestart,
  onHome,
  checkpoint = 0,
  checkpointCost = 0,
  canUseCheckpoint = false,
  onCheckpointRestart,
}: ResultOverlayProps) {
  if (state.status !== 'failed' && state.status !== 'won') return null;

  return (
    <div className="result-backdrop" role="dialog" aria-modal="true" aria-label="게임 결과">
      <section className="result-card">
        <p className="eyebrow">{state.status === 'won' ? 'SUMMIT CLEAR' : 'TRY AGAIN'}</p>
        <h2>{state.status === 'won' ? '2,000계단 완주!' : `${state.step.toLocaleString('ko-KR')}계단 도달`}</h2>
        <p>
          {state.status === 'won'
            ? `기록 ${(state.elapsedMs / 1000).toFixed(1)}초 · 정상에 도착했습니다.`
            : `이번 도전에서 코인 ${state.runCoins}개를 모았습니다.`}
        </p>
        <div className="result-actions">
          <button className="primary-button" type="button" onClick={onRestart}>다시 도전</button>
          {state.status === 'failed' && checkpoint > 0 && onCheckpointRestart && (
            <button className="checkpoint-button" type="button" onClick={onCheckpointRestart} disabled={!canUseCheckpoint}>
              {checkpoint.toLocaleString('ko-KR')}칸에서 시작 · ● {checkpointCost}
            </button>
          )}
          <button className="secondary-button" type="button" onClick={onHome}>홈으로</button>
        </div>
      </section>
    </div>
  );
}
