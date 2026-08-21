import { useEffect, useRef } from 'react';

export default function GlobeCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;
    let w = 0;
    let h = 0;
    const mouse = { x: 0, y: 0 };
    let tiltX = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.parentElement.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const N = 320;
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r });
    }

    const links = [];
    for (let i = 0; i < 26; i++) {
      links.push([Math.floor(Math.random() * N), Math.floor(Math.random() * N)]);
    }

    let pings = [];
    let pingTimer = 0;
    let t = 0;
    let last = performance.now();

    const onMouse = (e) => {
      mouse.x = e.clientX / window.innerWidth - 0.5;
      mouse.y = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('mousemove', onMouse);

    const render = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.4;
      const rotY = t * 0.12 + mouse.x * 0.7;
      tiltX += (mouse.y * 0.45 - tiltX) * 0.05;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(tiltX);
      const sinX = Math.sin(tiltX);

      const proj = pts.map((p) => {
        const x = p.x * cosY + p.z * sinY;
        let z = -p.x * sinY + p.z * cosY;
        const y = p.y * cosX - z * sinX;
        z = p.y * sinX + z * cosX;
        return { sx: cx + x * R, sy: cy + y * R, z };
      });

      const halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.6);
      halo.addColorStop(0, 'rgba(16,185,129,0.10)');
      halo.addColorStop(1, 'rgba(16,185,129,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(148,163,184,0.14)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2);
      ctx.setLineDash([2, 8]);
      ctx.strokeStyle = 'rgba(6,182,212,0.18)';
      ctx.stroke();
      ctx.setLineDash([]);

      links.forEach(([a, b], i) => {
        const pa = proj[a];
        const pb = proj[b];
        const vis = (pa.z + pb.z) / 2;
        if (vis < -0.1) return;
        const mx = (pa.sx + pb.sx) / 2;
        const my = (pa.sy + pb.sy) / 2;
        const dx = mx - cx;
        const dy = my - cy;
        const d = Math.hypot(dx, dy) || 1;
        const lift = 42;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.quadraticCurveTo(mx + (dx / d) * lift, my + (dy / d) * lift, pb.sx, pb.sy);
        const alpha = 0.1 + Math.max(vis, 0) * 0.28;
        ctx.strokeStyle = i % 3 === 0 ? `rgba(6,182,212,${alpha})` : `rgba(16,185,129,${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      proj.forEach((p, i) => {
        const depth = (p.z + 1) / 2;
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, 0.6 + depth * 1.7, 0, Math.PI * 2);
        ctx.fillStyle =
          i % 17 === 0
            ? `rgba(6,182,212,${0.22 + depth * 0.6})`
            : `rgba(16,185,129,${0.14 + depth * 0.55})`;
        ctx.fill();
      });

      pingTimer += dt;
      if (pingTimer > 1.4) {
        pingTimer = 0;
        const idx = Math.floor(Math.random() * N);
        if (proj[idx].z > 0.1) pings.push({ x: proj[idx].sx, y: proj[idx].sy, r: 2, a: 1 });
      }
      pings = pings.filter((p) => p.a > 0);
      pings.forEach((p) => {
        p.r += dt * 30;
        p.a -= dt * 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(16,185,129,${Math.max(p.a, 0) * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0" data-testid="hero-globe-canvas" />;
}
