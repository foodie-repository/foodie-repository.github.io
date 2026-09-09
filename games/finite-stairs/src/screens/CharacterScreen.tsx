import type { CSSProperties } from 'react';
import { CHARACTERS, type CharacterId } from '../profile/characters';
import type { Profile } from '../profile/profile';

interface CharacterScreenProps {
  profile: Profile;
  message: string;
  onChoose: (id: CharacterId) => void;
  onHome: () => void;
}

export function CharacterScreen({ profile, message, onChoose, onHome }: CharacterScreenProps) {
  return (
    <section className="sub-screen">
      <div className="sub-heading">
        <button className="back-button" type="button" onClick={onHome}>홈으로</button>
        <div>
          <p className="eyebrow">RUNNER SHOP</p>
          <h1>캐릭터 선택</h1>
        </div>
        <span className="coin-chip">● {profile.coins}</span>
      </div>

      <div className="character-grid">
        {CHARACTERS.map((character) => {
          const unlocked = profile.unlockedCharacters.includes(character.id);
          const selected = profile.selectedCharacter === character.id;
          return (
            <button
              className={`character-card${selected ? ' selected' : ''}`}
              type="button"
              key={character.id}
              onClick={() => onChoose(character.id)}
              aria-label={`${character.name} ${selected ? '선택됨' : unlocked ? '선택' : `${character.price}코인`}`}
            >
              <span className="character-avatar" style={{ '--runner': character.colors[0], '--runner-dark': character.colors[1] } as CSSProperties}>
                <i />
              </span>
              <strong>{character.name}</strong>
              <small>{selected ? '사용 중' : unlocked ? '보유 중' : `● ${character.price}`}</small>
            </button>
          );
        })}
      </div>
      <p className="screen-message" aria-live="polite">{message || '계단에서 모은 코인으로 새 러너를 잠금 해제하세요.'}</p>
    </section>
  );
}
