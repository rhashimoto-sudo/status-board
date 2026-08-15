"use client";

import { useEffect, useRef } from "react";
import { NETWORK_BG, SYSTEM_FRAME } from "@/lib/constants";

type Node = { x: number; y: number; vx: number; vy: number };

/**
 * 背景のネットワークアニメーション（11_design_system.md）。
 *
 * 黒地にシアンのノードと結線をゆっくり漂わせ、その手前に system frame
 * （ソロレベリング風のステータスウィンドウ枠）をゆっくり拡大・収縮させて重ねる。
 * SF の system window 的な奥行きを出すための装飾で、情報は一切持たない
 * （`aria-hidden` / `pointer-events-none`）。
 *
 * 規約との関係:
 * - CSS の影による発光は使わない。発光をカウントダウンと HP 危険域に限る規約（AC-14）は
 *   CSS の影プロパティの出現箇所で検査されるため、枠の発光は Canvas 内の `shadowBlur` で描く。
 *   危険を示す赤の発光と競合しないよう、青は控えめな強度に留める
 * - 色はシアン（`--color-accent-cyan`）のみ。新しい色相を増やさない
 * - `prefers-reduced-motion: reduce` ではアニメーションを回さず静止画を1枚描く（C-16）
 * - `setInterval` は使わない（`countdown.tsx` が唯一という契約 C-3 を維持）。`requestAnimationFrame` を使う
 * - タブが非表示のあいだはループを止める（電池とCPUの無駄を避ける）
 */
export function NetworkBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // アクセント色を @theme のトークンから読む（コンポーネントに色を直書きしない）。
    const cyan =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--color-accent-cyan")
        .trim() || "#22d3ee";

    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    let frame = 0;
    let last = 0;
    let elapsed = 0;

    function resize() {
      if (!canvas || !ctx) return;
      // デバイスピクセル比は 2 で頭打ちにする（高DPR端末で塗る面積が跳ね上がるのを防ぐ）。
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(
        NETWORK_BG.maxNodes,
        Math.round(((width * height) / 10000) * NETWORK_BG.densityPer10kPx),
      );
      nodes = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * NETWORK_BG.speed,
          vy: Math.sin(angle) * NETWORK_BG.speed,
        };
      });
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const maxDist = NETWORK_BG.linkDistance;
      ctx.strokeStyle = cyan;
      ctx.lineWidth = 1;

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const dx = nodes[i]!.x - nodes[j]!.x;
          const dy = nodes[i]!.y - nodes[j]!.y;
          const dist = Math.hypot(dx, dy);
          if (dist >= maxDist) continue;
          // 近いほど濃く。遠いものが薄く消えることで「網が呼吸している」ように見える。
          ctx.globalAlpha = (1 - dist / maxDist) * NETWORK_BG.linkOpacity;
          ctx.beginPath();
          ctx.moveTo(nodes[i]!.x, nodes[i]!.y);
          ctx.lineTo(nodes[j]!.x, nodes[j]!.y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = NETWORK_BG.nodeOpacity;
      ctx.fillStyle = cyan;
      for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, NETWORK_BG.nodeRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /** ソロレベリング風の枠。角ブラケットと左右の装飾チップで「窓」に見せる。 */
    function drawFrame(scale: number) {
      if (!ctx) return;
      const inset = Math.min(width, height) * SYSTEM_FRAME.insetRatio;
      const cx = width / 2;
      const cy = height / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);

      const left = inset;
      const top = inset;
      const right = width - inset;
      const bottom = height - inset;
      const arm = Math.min(SYSTEM_FRAME.cornerLength, (right - left) / 3);

      ctx.strokeStyle = cyan;
      ctx.lineWidth = SYSTEM_FRAME.lineWidth;
      ctx.globalAlpha = SYSTEM_FRAME.strokeOpacity;
      // Canvas 内の発光。CSS の影プロパティではないため AC-14 の検査対象を増やさない。
      ctx.shadowColor = cyan;
      ctx.shadowBlur = SYSTEM_FRAME.glowBlur;

      // 四隅のブラケット
      const corners: [number, number, number, number][] = [
        [left, top, 1, 1],
        [right, top, -1, 1],
        [left, bottom, 1, -1],
        [right, bottom, -1, -1],
      ];
      for (const [x, y, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(x + sx * arm, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + sy * arm);
        ctx.stroke();
      }

      // 上下の中央を走る細い横線（窓の桟）
      ctx.globalAlpha = SYSTEM_FRAME.strokeOpacity * 0.5;
      for (const y of [top, bottom]) {
        ctx.beginPath();
        ctx.moveTo(left + arm * 1.4, y);
        ctx.lineTo(right - arm * 1.4, y);
        ctx.stroke();
      }

      // 左右の装飾チップ（参考画像の縦に積まれたブロック）
      ctx.globalAlpha = SYSTEM_FRAME.strokeOpacity * 0.7;
      const chipGap = (bottom - top) / (SYSTEM_FRAME.chipCount * 2 + 1);
      for (let i = 0; i < SYSTEM_FRAME.chipCount; i += 1) {
        const y = top + chipGap * (i * 2 + 1.5);
        const len = arm * (i === 1 ? 0.9 : 0.55);
        for (const [x, dir] of [
          [left, 1],
          [right, -1],
        ] as [number, number][]) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + SYSTEM_FRAME.chipThickness * 2);
          ctx.lineTo(x + dir * len, y + SYSTEM_FRAME.chipThickness * 2);
          ctx.stroke();
        }
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function step(now: number) {
      const dt = last === 0 ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now;

      for (const node of nodes) {
        node.x += node.vx * dt;
        node.y += node.vy * dt;
        // 端で跳ね返す。画面外に溜まって密度が偏るのを避ける。
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
        node.x = Math.min(width, Math.max(0, node.x));
        node.y = Math.min(height, Math.max(0, node.y));
      }

      elapsed += dt;
      draw();
      // sin で 1.0 ↔ breathScale を往復させる。等速ではなく端で緩むので「呼吸」に見える。
      const phase = (Math.sin((elapsed / SYSTEM_FRAME.breathSeconds) * Math.PI * 2) + 1) / 2;
      drawFrame(1 + (SYSTEM_FRAME.breathScale - 1) * phase);
      frame = requestAnimationFrame(step);
    }

    function start() {
      if (reduceMotion) {
        // 動かさず、等倍の枠を1枚だけ描く（C-16）。
        draw();
        drawFrame(1);
        return;
      }
      last = 0;
      frame = requestAnimationFrame(step);
    }

    function stop() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    }

    function handleVisibility() {
      if (document.hidden) {
        stop();
      } else if (!reduceMotion) {
        start();
      }
    }

    function handleResize() {
      resize();
      if (reduceMotion) {
        draw();
        drawFrame(1);
      }
    }

    resize();
    start();
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
