interface HelpScreenProps {
  onHome: () => void;
}

export function HelpScreen({ onHome }: HelpScreenProps) {
  return (
    <section className="sub-screen help-screen">
      <div className="sub-heading">
        <button className="back-button" type="button" onClick={onHome}>홈으로</button>
        <div>
          <p className="eyebrow">HOW TO PLAY</p>
          <h1>조작법</h1>
        </div>
      </div>

      <div className="help-list">
        <article><span>↑</span><div><strong>오르기</strong><p>PC는 방향키 위쪽, 모바일은 `오르기` 버튼을 누르면 바라보는 방향으로 한 칸 올라갑니다.</p></div></article>
        <article><span>␣</span><div><strong>전환 + 오르기</strong><p>PC는 Space, 모바일은 `전환 + 오르기` 버튼을 누르면 방향을 바꾸면서 한 칸 올라갑니다.</p></div></article>
        <article><span>⚑</span><div><strong>끝까지 생존</strong><p>잘못된 쪽으로 움직이면 빈 곳으로 뛰어 추락합니다. 500칸마다 체크포인트, 2,000칸에 엔딩이 있습니다.</p></div></article>
      </div>
      <button className="primary-button" type="button" onClick={onHome}>확인</button>
    </section>
  );
}
