"use client";

import { useEffect, useRef } from "react";
import { NETWORK_BG } from "@/lib/constants";

type Node = { x: number; y: number; vx: number; vy: number };

/**
 * 背景のネットワークアニメーション（11_design_system.md）。
 *
 * 黒地にシアンのノードと結線をゆっくり漂わせる。SF の system window 的な奥行きを出すための
 * 装飾で、情報は一切持たない（`aria-hidden` / `pointer-events-none`）。
 *
 * 規約との関係:
 * - 影による発光を使わない。発光はカウントダウンと HP 危険域に限る規約（AC-14）を崩さないため、
 *   奥行きは線と点の不透明度だけで表現する
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

      draw();
      frame = requestAnimationFrame(step);
    }

    function start() {
      if (reduceMotion) {
        draw();
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
      if (reduceMotion) draw();
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
