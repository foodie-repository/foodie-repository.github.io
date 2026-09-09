import type { Profile } from '../profile/profile';

interface HomeScreenProps {
  profile: Profile;
  onSingle: () => void;
  onCharacters: () => void;
  onHelp: () => void;
  onToggleSound: () => void;
}

export function HomeScreen({ profile, onSingle, onCharacters, onHelp, onToggleSound }: HomeScreenProps) {
  return (
    <>
      <header className="top-bar">
        <div>
          <span className="brand-kicker">SUMMIT 2000</span>
          <span className="brand-title">유한의 계단</span>
        </div>
        <div className="top-actions">
          <button className="sound-button" type="button" onClick={onToggleSound} aria-label={profile.soundEnabled ? '소리 끄기' : '소리 켜기'}>
            {profile.soundEnabled ? '♪' : '×'}
          </button>
          <span className="coin-chip" aria-label={`보유 코인 ${profile.coins}개`}>● {profile.coins}</span>
        </div>
      </header>

      <div className="home-screen">
        <div className="summit-card">
          <div className="summit-mark" aria-hidden="true"><span>▲</span></div>
          <p className="eyebrow">끝이 있는 도전</p>
          <h1>유한의 계단</h1>
          <p>방향을 바꾸고 빠르게 올라 <strong>2,000번째 계단</strong> 정상에 도전하세요.</p>
          <div className="home-stats">
            <span><small>최고 기록</small><strong>{profile.bestStep.toLocaleString('ko-KR')}칸</strong></span>
            <span><small>체크포인트</small><strong>{profile.checkpoint.toLocaleString('ko-KR')}칸</strong></span>
          </div>
        </div>

        <div className="menu-actions">
          <button className="primary-button" type="button" onClick={onSingle}>싱글 플레이</button>
          <button className="secondary-button" type="button" disabled>친구와 1대1 · 준비 중</button>
          <div className="menu-row">
            <button className="text-button" type="button" onClick={onCharacters}>캐릭터</button>
            <button className="text-button" type="button" onClick={onHelp}>조작법</button>
          </div>
        </div>
      </div>
    </>
  );
}
