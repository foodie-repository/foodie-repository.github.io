import { getFallPose } from '../game/fallAnimation';
import { getStage } from '../game/path';
import type { GameState } from '../game/types';
import type { CharacterDefinition } from '../profile/characters';

export const STAGES = [
  { name: '별빛 초입', skyTop: '#07111f', skyBottom: '#18345b' },
  { name: '노을 협곡', skyTop: '#261f4c', skyBottom: '#a1485f' },
  { name: '오로라 능선', skyTop: '#071d35', skyBottom: '#176b72' },
  { name: '보랏빛 설원', skyTop: '#151731', skyBottom: '#514879' },
  { name: '새벽 정상', skyTop: '#081426', skyBottom: '#7f577f' },
] as const;

export interface StairLayout {
  index: number;
  x: number;
  y: number;
  current: boolean;
  coin: boolean;
  checkpoint: boolean;
}

export interface SceneLayout {
  stage: number;
  cellWidth: number;
  cellHeight: number;
  stairs: StairLayout[];
  player: { x: number; y: number; rotationRad: number; opacity: number };
}

export function createSceneLayout(state: GameState, width: number, height: number, nowMs: number): SceneLayout {
  const cellWidth = Math.min(54, Math.max(36, width * 0.105));
  const cellHeight = Math.min(31, Math.max(23, height * 0.052));
  const baseY = height * 0.68;
  const current = state.route[state.step];
  const start = Math.max(0, state.step - 8);
  const end = Math.min(state.route.length - 1, state.step + 18);
  const stairs: StairLayout[] = [];

  for (let index = start; index <= end; index += 1) {
    const stair = state.route[index];
    stairs.push({
      index,
      x: width / 2 + (stair.x - current.x) * cellWidth,
      y: baseY - (stair.y - state.step) * cellHeight,
      current: index === state.step,
      coin: stair.coin,
      checkpoint: stair.checkpoint,
    });
  }

  const pose = state.status === 'falling' && state.fall
    ? getFallPose(state.fall, nowMs)
    : { offsetX: 0, offsetY: 0, liftY: 0, rotationRad: 0, opacity: 1 };

  return {
    stage: getStage(state.step),
    cellWidth,
    cellHeight,
    stairs,
    player: {
      x: width / 2 + pose.offsetX,
      y: baseY - cellHeight * 0.78 + pose.liftY + pose.offsetY,
      rotationRad: pose.rotationRad,
      opacity: pose.opacity,
    },
  };
}

function drawMountain(context: CanvasRenderingContext2D, width: number, height: number, offset: number, color: string): void {
  context.beginPath();
  context.moveTo(0, height);
  for (let x = -width; x <= width * 2; x += width * 0.34) {
    const peak = height * (0.5 + ((x / width + offset) % 0.17));
    context.lineTo(x, peak);
    context.lineTo(x + width * 0.17, height);
  }
  context.closePath();
  context.fillStyle = color;
  context.fill();
}

function drawStair(context: CanvasRenderingContext2D, stair: StairLayout, cellWidth: number, cellHeight: number): void {
  context.beginPath();
  context.moveTo(stair.x, stair.y - cellHeight * 0.35);
  context.lineTo(stair.x + cellWidth * 0.82, stair.y);
  context.lineTo(stair.x, stair.y + cellHeight * 0.35);
  context.lineTo(stair.x - cellWidth * 0.82, stair.y);
  context.closePath();
  context.fillStyle = stair.current ? '#ffd17f' : '#ff9f43';
  context.fill();
  context.lineWidth = stair.current ? 3 : 1.5;
  context.strokeStyle = stair.current ? '#fff0bd' : '#b64f2f';
  context.stroke();

  context.beginPath();
  context.moveTo(stair.x - cellWidth * 0.82, stair.y);
  context.lineTo(stair.x, stair.y + cellHeight * 0.35);
  context.lineTo(stair.x, stair.y + cellHeight * 0.68);
  context.lineTo(stair.x - cellWidth * 0.82, stair.y + cellHeight * 0.33);
  context.closePath();
  context.fillStyle = '#9f3f31';
  context.fill();

  if (stair.coin) {
    context.beginPath();
    context.arc(stair.x, stair.y - cellHeight * 0.72, 6, 0, Math.PI * 2);
    context.fillStyle = '#ffe36e';
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = '#ff9f43';
    context.stroke();
  }

  if (stair.checkpoint) {
    context.strokeStyle = '#f4fbff';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(stair.x, stair.y - 4);
    context.lineTo(stair.x, stair.y - cellHeight * 1.8);
    context.stroke();
    context.fillStyle = '#62f6c7';
    context.fillRect(stair.x, stair.y - cellHeight * 1.8, cellWidth * 0.48, cellHeight * 0.4);
  }
}

function drawCharacter(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: -1 | 1,
  rotationRad: number,
  opacity: number,
  character: CharacterDefinition,
): void {
  context.save();
  context.globalAlpha = opacity;
  context.translate(x, y);
  context.rotate(rotationRad);
  context.scale(facing, 1);
  context.fillStyle = character.colors[0];
  context.beginPath();
  context.moveTo(-8, 18);
  context.lineTo(-24, 11);
  context.lineTo(-17, 24);
  context.closePath();
  context.fill();
  context.fillRect(-15, 19, 8, 17);
  context.fillStyle = character.colors[1];
  context.fillRect(-10, 15, 20, 23);
  context.fillStyle = character.colors[0];
  context.beginPath();
  context.arc(0, 8, 12, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.moveTo(10, 6);
  context.lineTo(16, 9);
  context.lineTo(10, 12);
  context.closePath();
  context.fill();
  context.fillStyle = '#07111f';
  context.fillRect(4, 5, 4, 4);
  context.fillStyle = character.colors[0];
  context.beginPath();
  context.moveTo(10, 25);
  context.lineTo(23, 20);
  context.lineTo(10, 31);
  context.closePath();
  context.fill();
  context.restore();
}

export function drawScene(
  context: CanvasRenderingContext2D,
  state: GameState,
  character: CharacterDefinition,
  width: number,
  height: number,
  nowMs: number,
): void {
  const layout = createSceneLayout(state, width, height, nowMs);
  const stage = STAGES[layout.stage];
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, stage.skyTop);
  gradient.addColorStop(1, stage.skyBottom);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.globalAlpha = 0.55;
  for (let index = 0; index < 28; index += 1) {
    const x = (index * 97 + state.seed * 13) % Math.max(width, 1);
    const y = (index * 53 + state.seed * 7) % Math.max(height * 0.48, 1);
    const size = index % 5 === 0 ? 2 : 1;
    context.fillStyle = '#fff';
    context.fillRect(x, y, size, size);
  }
  context.globalAlpha = 1;
  drawMountain(context, width, height * 0.8, state.step * 0.0003, 'rgba(5, 13, 29, .36)');
  drawMountain(context, width, height * 0.9, state.step * 0.0006, 'rgba(5, 13, 29, .68)');

  for (let index = layout.stairs.length - 1; index >= 0; index -= 1) {
    drawStair(context, layout.stairs[index], layout.cellWidth, layout.cellHeight);
  }

  const baseY = height * 0.68;
  context.fillStyle = 'rgba(0, 0, 0, .26)';
  context.beginPath();
  context.ellipse(width / 2, baseY + layout.cellHeight * 0.08, layout.cellWidth * 0.34, 6, 0, 0, Math.PI * 2);
  context.fill();
  drawCharacter(
    context,
    layout.player.x,
    layout.player.y,
    state.facing,
    layout.player.rotationRad,
    layout.player.opacity,
    character,
  );
}
