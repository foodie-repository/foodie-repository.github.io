(() => {
  const parts = [
    "game-01.part",
    "game-02.part",
    "game-03.part",
    "game-04.part",
    "game-05.part",
    "game-06.part"
  ];

  Promise.all(parts.map(path => fetch(path, { cache: "no-store" }).then(response => {
    if (!response.ok) throw new Error(`게임 파일을 불러오지 못했습니다: ${path}`);
    return response.text();
  })))
    .then(chunks => {
      const source = chunks.join("\n");
      new Function(source)();
    })
    .catch(error => {
      console.error(error);
      document.body.innerHTML = `<main style="font-family:system-ui;padding:32px;color:white;background:#070b18;min-height:100vh"><h1>게임을 불러오지 못했습니다.</h1><p>${error.message}</p><button onclick="location.reload()">다시 시도</button></main>`;
    });
})();
