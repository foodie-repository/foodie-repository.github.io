(() => {
  const parts = [
    'game3d-01.part',
    'game3d-02.part',
    'game3d-03.part',
    'game3d-04.part',
    'game3d-05.part'
  ];
  Promise.all(parts.map(path => fetch(path).then(response => {
    if (!response.ok) throw new Error(`게임 파일을 불러오지 못했습니다: ${path}`);
    return response.text();
  })))
    .then(chunks => { (0, eval)(chunks.join('')); })
    .catch(error => {
      console.error(error);
      document.body.innerHTML = `<main style="font-family:system-ui;padding:32px;color:white;background:#070b18;min-height:100vh"><h1>게임을 불러오지 못했습니다.</h1><p>${error.message}</p><button onclick="location.reload()">다시 시도</button></main>`;
    });
})();
