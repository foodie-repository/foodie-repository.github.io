(() => {
  const parts = [
    "game-01.part?v=3d-20260826-1",
    "game-02.part?v=3d-20260826-1",
    "game-03.part?v=3d-20260826-1",
    "game-04.part?v=3d-20260826-1",
    "game-05.part?v=3d-20260826-1",
    "game-06.part?v=3d-20260826-1"
  ];
  Promise.all(parts.map(path => fetch(path).then(response => {
    if (!response.ok) throw new Error(`게임 파일을 불러오지 못했습니다: ${path}`);
    return response.text();
  })))
    .then(chunks => {
      if (!window.THREE) throw new Error("3D 엔진을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.");
      (0, eval)(chunks.join("\n"));
    })
    .catch(error => {
      console.error(error);
      document.body.innerHTML = `<main style="font-family:system-ui;padding:32px;color:white;background:#070b18;min-height:100vh"><h1>게임을 불러오지 못했습니다.</h1><p>${error.message}</p><button onclick="location.reload()">다시 시도</button></main>`;
    });
})();
