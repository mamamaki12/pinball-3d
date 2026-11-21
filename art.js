/* 盤面と表示板の絵（台ごとのアートワーク）。canvas に直接描く */
(function () {
  'use strict';
  var CX = -0.4, TAU = 6.2832;

  function tools(A) {
    var g = A.g, X = A.X, Y = A.Y, S = A.S;
    var u = {
      path: function (pts, close) {
        g.beginPath();
        for (var i = 0; i < pts.length; i++) { if (i) g.lineTo(X(pts[i][0]), Y(pts[i][1])); else g.moveTo(X(pts[i][0]), Y(pts[i][1])); }
        if (close) g.closePath();
      },
      circle: function (x, y, r) { g.beginPath(); g.arc(X(x), Y(y), r * S, 0, TAU); },
      // ネオン管：色のにじみの上に白い芯
      tube: function (pts, col, wd, close) {
        g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
        u.path(pts, close); g.shadowColor = col; g.shadowBlur = S * 0.4; g.strokeStyle = col; g.lineWidth = wd * S; g.stroke(); g.stroke();
        g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = wd * S * 0.3; g.stroke(); g.restore();
      },
      text: function (str, x, y, size, col, o) {
        o = o || {};
        g.save(); g.translate(X(x), Y(y)); if (o.rot) g.rotate(o.rot);
        g.font = (o.weight || '700') + ' ' + (size * S) + 'px ' + (o.font || A.cfg.floorFont);
        g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        if (o.alpha != null) g.globalAlpha = o.alpha;
        if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = S * 0.35; }
        if (o.stroke) { g.lineWidth = size * S * (o.sw || 0.18); g.strokeStyle = o.stroke; g.strokeText(str, 0, 0); }
        g.fillStyle = col; g.fillText(str, 0, 0); if (o.glow) g.fillText(str, 0, 0);
        g.restore();
      },
      vtext: function (str, x, y, size, col, o) {   // たて書き
        for (var i = 0; i < str.length; i++) u.text(str[i] === 'ー' ? '｜' : str[i], x, y - i * size * 1.08, size, col, o);
      },
      rrect: function (x, y, w, h, r) {   // 中心 (x,y)
        var x0 = X(x - w / 2), y0 = Y(y + h / 2), ww = w * S, hh = h * S; r *= S;
        g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x0 + ww, y0, x0 + ww, y0 + hh, r); g.arcTo(x0 + ww, y0 + hh, x0, y0 + hh, r);
        g.arcTo(x0, y0 + hh, x0, y0, r); g.arcTo(x0, y0, x0 + ww, y0, r); g.closePath();
      },
      star: function (x, y, r, col, n) {
        n = n || 5; g.beginPath();
        for (var q = 0; q < n * 2; q++) { var ra = (q % 2 ? r * 0.45 : r) * S, an = -Math.PI / 2 + q * Math.PI / n; g.lineTo(X(x) + ra * Math.cos(an), Y(y) + ra * Math.sin(an)); }
        g.closePath(); g.fillStyle = col; g.fill();
      },
      glow: function (x, y, r, col, a) {
        var rg = g.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), r * S);
        rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.save(); g.globalAlpha = a; g.fillStyle = rg; g.beginPath(); g.arc(X(x), Y(y), r * S, 0, TAU); g.fill(); g.restore();
      }
    };
    return u;
  }

  /* どの台にも共通の「印刷」：アーチの飾り線、アウトレーンの注意しま、しかけの名前 */
  function printed(A, u, line, warn, ink, jp) {
    var g = A.g, X = A.X, Y = A.Y, S = A.S, k, pts = [[-4.62, 5.2], [-4.62, 13]];
    for (k = 1; k < 40; k++) pts.push([4.62 * Math.cos(Math.PI - Math.PI * k / 40), 13 + 4.62 * Math.sin(Math.PI * k / 40)]);
    g.save(); g.globalAlpha = 0.75; g.strokeStyle = line; g.lineWidth = S * 0.05; u.path(pts); g.stroke();
    g.globalAlpha = 0.35; g.lineWidth = S * 0.02;
    pts = pts.map(function (p) { return p[1] > 13 ? [p[0] * 0.972, 13 + (p[1] - 13) * 0.972] : [p[0] + 0.13, p[1]]; }); u.path(pts); g.stroke(); g.restore();
    // アウトレーン
    [[-4.92, -4.28], [3.48, 4.12]].forEach(function (r) {
      g.save(); g.beginPath(); g.rect(X(r[0]), Y(3.9), (r[1] - r[0]) * S, 3.9 * S); g.clip();
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(X(r[0]), Y(3.9), (r[1] - r[0]) * S, 3.9 * S);
      g.strokeStyle = warn; g.lineWidth = S * 0.13; g.globalAlpha = 0.85;
      for (k = 0; k < 16; k++) { g.beginPath(); g.moveTo(X(r[0]) - S, Y(k * 0.42 - 1.2)); g.lineTo(X(r[1]) + S, Y(k * 0.42 - 0.2)); g.stroke(); }
      g.restore();
      u.text('アウト', (r[0] + r[1]) / 2, 4.5, 0.2, warn, { font: jp, rot: 0 });
    });
    (A.cfg.holes || []).forEach(function (h) {
      g.save(); g.strokeStyle = ink; g.lineWidth = S * 0.04; g.setLineDash([S * 0.12, S * 0.1]); u.circle(h.x, h.y, 0.82); g.stroke(); g.restore();
      u.text('1000', h.x, h.y - 1.0, 0.26, ink, { font: A.cfg.floorFont });
    });
    var bank = (A.cfg.targets || []).filter(function (t) { return t.free; });
    if (bank.length) u.text('ジャックポット', bank[1].x, bank[0].y + 0.62, 0.24, ink, { font: jp });
    u.text('フィーバー', CX, 16.45, 0.24, ink, { font: jp });
  }

  var floor = {}, back = {};

  /* ---------- ネオン街：雨あがりの夜の街 ---------- */
  floor.neon = function (A) {
    var g = A.g, X = A.X, Y = A.Y, S = A.S, C = A.C, u = tools(A), rnd = A.rnd, k, jp = "'Zen Kaku Gothic New', sans-serif";
    var pink = '#ff3fa4', cyan = '#3ff0ff', yel = '#ffe14d', vio = '#7a3cff';
    var gr = g.createLinearGradient(0, 0, 0, A.h);
    gr.addColorStop(0, '#1d0d49'); gr.addColorStop(0.5, '#120735'); gr.addColorStop(1, '#070316');
    g.fillStyle = gr; g.fillRect(0, 0, A.w, A.h);
    u.glow(CX, 11.6, 6, vio, 0.45); u.glow(CX, 11.6, 2.4, pink, 0.3);
    // 中心から伸びる光のすじ
    g.save(); g.lineWidth = S * 0.02;
    for (k = 0; k < 48; k++) {
      var a = k / 48 * TAU; g.strokeStyle = k % 2 ? pink : cyan; g.globalAlpha = k % 4 === 0 ? 0.35 : 0.14;
      g.beginPath(); g.moveTo(X(CX + 1.3 * Math.cos(a)), Y(11.6 + 1.3 * Math.sin(a))); g.lineTo(X(CX + 9 * Math.cos(a)), Y(11.6 + 9 * Math.sin(a))); g.stroke();
    }
    g.restore();
    // 三重の輪（真ん中の輪にランプが並ぶ）
    [[1.25, cyan, 0.05], [3.35, pink, 0.06], [4.25, vio, 0.04]].forEach(function (r) {
      var c = []; for (k = 0; k <= 72; k++) c.push([CX + r[0] * Math.cos(k / 72 * TAU), 11.6 + r[0] * Math.sin(k / 72 * TAU)]);
      g.save(); g.globalAlpha = 0.8; u.tube(c, r[1], r[2]); g.restore();
    });
    // ビルの夜景
    var bx = -4.9, base = 6.75, tops = [];
    g.save();
    while (bx < 4.2) {
      var bw = 0.45 + rnd() * 0.55, bh = 0.6 + rnd() * 1.5; if (Math.abs(bx + bw / 2 - CX) < 1.5) bh *= 0.55;
      g.fillStyle = '#05020f'; g.fillRect(X(bx), Y(base + bh), bw * S, bh * S);
      for (var wy = base + 0.14; wy < base + bh - 0.12; wy += 0.2) for (var wx = bx + 0.09; wx < bx + bw - 0.1; wx += 0.16) {
        if (rnd() < 0.55) { g.fillStyle = rnd() < 0.5 ? yel : rnd() < 0.5 ? cyan : pink; g.globalAlpha = 0.35 + rnd() * 0.5; g.fillRect(X(wx), Y(wy + 0.09), 0.08 * S, 0.09 * S); }
      }
      g.globalAlpha = 1; tops.push([bx, bw, base + bh]); bx += bw + 0.04;
    }
    g.restore();
    u.tube([[-4.9, base], [4.2, base]], pink, 0.04);
    // 屋上の看板
    [[2, 'バー', pink], [5, 'ゲーム', cyan], [9, '24', yel], [12, 'ホテル', pink]].forEach(function (s) {
      var t = tops[Math.min(s[0], tops.length - 1)]; if (!t) return;
      u.text(s[1], t[0] + t[1] / 2, t[2] + 0.2, 0.22, '#ffffff', { font: jp, glow: s[2] });
    });
    // ぬれた路面の映りこみ
    g.save();
    for (k = 0; k < 70; k++) {
      var rx = -2.5 + rnd() * 4.2, ry = 2.6 + rnd() * 3.9, rl = 0.2 + rnd() * 0.7;
      g.strokeStyle = [pink, cyan, yel, vio][k % 4]; g.globalAlpha = 0.12 + rnd() * 0.3; g.lineWidth = S * 0.035; g.lineCap = 'round';
      g.beginPath(); g.moveTo(X(rx), Y(ry)); g.lineTo(X(rx), Y(ry - rl)); g.stroke();
    }
    g.restore();
    printed(A, u, cyan, yel, '#d9d2ff', jp);
    // ネオン管の文字
    u.text('NEON', CX, 6.2, 0.95, 'rgba(255,255,255,.95)', { font: 'Orbitron, sans-serif', weight: '900', glow: pink, stroke: pink, sw: 0.1 });
    g.save(); u.rrect(CX, 16.45, 2.6, 0.5, 0.25); g.strokeStyle = cyan; g.globalAlpha = 0.5; g.lineWidth = S * 0.03; g.stroke(); g.restore();
  };
  back.neon = function (g, C) {
    var k, x = 26;
    var gr = g.createLinearGradient(0, 20, 0, 104); gr.addColorStop(0, '#1d0d49'); gr.addColorStop(1, '#3a0f55');
    g.fillStyle = gr; g.fillRect(20, 20, 728, 84);
    g.fillStyle = '#05020f';
    var s = 7; function r() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    while (x < 748) { var bw = 14 + r() * 24, bh = 14 + r() * 44; if (x > 150 && x < 600) bh *= 0.35; g.fillRect(x, 104 - bh, bw, bh); x += bw + 2; }
    g.strokeStyle = '#ff3fa4'; g.lineWidth = 2; g.shadowColor = '#ff3fa4'; g.shadowBlur = 10; g.beginPath(); g.moveTo(20, 103); g.lineTo(748, 103); g.stroke(); g.shadowBlur = 0;
  };

  /* ---------- うみのそこ：クジラの泳ぐ海 ---------- */
  floor.umi = function (A) {
    var g = A.g, X = A.X, Y = A.Y, S = A.S, u = tools(A), rnd = A.rnd, k, q, jp = "'Mochiy Pop One', sans-serif";
    var foam = '#d9fbff', coral = '#ff7fa8', sun = '#ffb347', mint = '#7dffd9';
    var gr = g.createLinearGradient(0, 0, 0, A.h);
    gr.addColorStop(0, '#2fb7cf'); gr.addColorStop(0.35, '#0d7f9c'); gr.addColorStop(0.8, '#064a66'); gr.addColorStop(1, '#03344b');
    g.fillStyle = gr; g.fillRect(0, 0, A.w, A.h);
    // 水面からさす光
    g.save(); g.fillStyle = '#ffffff';
    for (k = 0; k < 6; k++) {
      var lx = -4.4 + k * 1.6 + rnd() * 0.5; g.globalAlpha = 0.07 + rnd() * 0.06;
      u.path([[lx, 18.3], [lx + 0.7, 18.3], [lx - 1.6 + rnd(), 4], [lx - 3.0, 4]], true); g.fill();
    }
    g.restore();
    // 砂
    g.save(); g.fillStyle = '#e9d7a0'; g.globalAlpha = 0.55; g.beginPath(); g.moveTo(0, A.h);
    for (q = 0; q <= A.w; q += 16) g.lineTo(q, Y(2.2 + 0.35 * Math.sin(q / 90) + 0.15 * Math.sin(q / 31)));
    g.lineTo(A.w, A.h); g.fill(); g.restore();
    // こんぶ
    function kelp(x, y0, hgt, col, dir) {
      g.save(); g.strokeStyle = col; g.lineCap = 'round'; g.lineWidth = S * 0.2; g.globalAlpha = 0.75; g.beginPath(); g.moveTo(X(x), Y(y0));
      for (var t = 0; t <= 1.001; t += 0.05) g.lineTo(X(x + dir * 0.28 * Math.sin(t * 9) * t), Y(y0 + hgt * t));
      g.stroke(); g.restore();
    }
    [[-4.6, 3.2, 3.6, 1], [-4.2, 3.0, 2.6, -1], [-3.7, 2.9, 3.1, 1], [3.9, 3.2, 3.8, -1], [3.4, 3.0, 2.7, 1], [2.9, 2.9, 2.2, -1], [-1.9, 1.8, 1.7, 1], [1.2, 1.8, 1.5, -1]]
      .forEach(function (p, n) { kelp(p[0], p[1], p[2], n % 2 ? '#0f6b5e' : '#0a5a63', p[3]); });
    // さんご
    function coralAt(x, y, sc, col) {
      g.save(); g.strokeStyle = col; g.lineCap = 'round'; g.globalAlpha = 0.85;
      (function br(px, py, an, len, wd, d) {
        var ex = px + Math.cos(an) * len, ey = py + Math.sin(an) * len;
        g.lineWidth = wd * S; g.beginPath(); g.moveTo(X(px), Y(py)); g.lineTo(X(ex), Y(ey)); g.stroke();
        if (d > 0) { br(ex, ey, an + 0.55, len * 0.72, wd * 0.75, d - 1); br(ex, ey, an - 0.5, len * 0.72, wd * 0.75, d - 1); }
      })(x, y, Math.PI / 2, 0.42 * sc, 0.13 * sc, 3);
      g.restore();
    }
    coralAt(-2.9, 2.5, 1.2, coral); coralAt(2.2, 2.5, 1.1, sun); coralAt(-0.9, 1.6, 0.8, coral); coralAt(0.3, 1.5, 0.7, mint);
    // クジラ
    g.save(); g.translate(X(CX + 0.2), Y(10.5)); g.rotate(-0.12);
    g.fillStyle = '#063f5c'; g.globalAlpha = 0.72;
    g.beginPath(); g.ellipse(0, 0, 2.5 * S, 1.05 * S, 0, 0, TAU); g.fill();
    g.beginPath(); g.moveTo(2.0 * S, -0.15 * S); g.quadraticCurveTo(3.1 * S, -0.2 * S, 3.5 * S, -1.0 * S); g.quadraticCurveTo(3.3 * S, -0.1 * S, 3.6 * S, 0.7 * S); g.quadraticCurveTo(3.0 * S, 0.2 * S, 2.0 * S, 0.35 * S); g.fill();
    g.beginPath(); g.moveTo(-0.5 * S, 0.7 * S); g.quadraticCurveTo(0.2 * S, 1.9 * S, 0.9 * S, 1.6 * S); g.quadraticCurveTo(0.4 * S, 1.1 * S, 0.5 * S, 0.7 * S); g.fill();
    g.globalAlpha = 0.5; g.fillStyle = '#bfeef5';
    g.beginPath(); g.ellipse(-0.5 * S, 0.55 * S, 1.7 * S, 0.38 * S, 0.05, 0, Math.PI); g.fill();
    g.strokeStyle = '#063f5c'; g.lineWidth = S * 0.025; g.globalAlpha = 0.6;
    for (k = 0; k < 5; k++) { g.beginPath(); g.moveTo((-1.9 + k * 0.1) * S, (0.55 + k * 0.07) * S); g.lineTo((0.3 - k * 0.2) * S, (0.62 + k * 0.07) * S); g.stroke(); }
    g.globalAlpha = 0.95; g.fillStyle = '#ffffff'; g.beginPath(); g.arc(-1.75 * S, -0.05 * S, 0.07 * S, 0, TAU); g.fill();
    g.restore();
    // 魚の群れ
    function fish(x, y, sz, col, dir) {
      g.save(); g.translate(X(x), Y(y)); g.scale(dir, 1); g.fillStyle = col; g.globalAlpha = 0.9;
      g.beginPath(); g.ellipse(0, 0, sz * S, sz * 0.48 * S, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(-sz * 0.8 * S, 0); g.lineTo(-sz * 1.6 * S, -sz * 0.5 * S); g.lineTo(-sz * 1.6 * S, sz * 0.5 * S); g.fill();
      g.fillStyle = '#053549'; g.beginPath(); g.arc(sz * 0.5 * S, -sz * 0.08 * S, sz * 0.1 * S, 0, TAU); g.fill(); g.restore();
    }
    for (k = 0; k < 13; k++) fish(-3.6 + k * 0.42 + rnd() * 0.2, 14.0 + 0.9 * Math.sin(k * 0.5) + rnd() * 0.3, 0.16, k % 3 ? sun : coral, 1);
    for (k = 0; k < 9; k++) fish(3.4 - k * 0.5, 5.2 + 0.5 * Math.sin(k * 0.8) + rnd() * 0.3, 0.14, k % 2 ? mint : foam, -1);
    // くらげ
    function jelly(x, y, sc) {
      g.save(); g.fillStyle = coral; g.globalAlpha = 0.5; g.beginPath(); g.arc(X(x), Y(y), 0.42 * sc * S, Math.PI, 0); g.fill();
      g.strokeStyle = foam; g.lineWidth = S * 0.03; g.globalAlpha = 0.6;
      for (var t = -3; t <= 3; t++) { g.beginPath(); g.moveTo(X(x + t * 0.11 * sc), Y(y)); for (var d = 0; d < 1; d += 0.1) g.lineTo(X(x + t * 0.11 * sc + 0.06 * Math.sin(d * 14 + t)), Y(y - d * 0.9 * sc)); g.stroke(); }
      g.restore();
    }
    jelly(-3.6, 16.0, 1); jelly(3.2, 15.6, 0.8); jelly(-4.0, 9.6, 0.7);
    // あわ
    g.save(); g.strokeStyle = foam;
    for (k = 0; k < 60; k++) {
      var bx2 = -5 + rnd() * 9.2, by2 = rnd() * 18, br2 = 0.05 + rnd() * 0.16; g.globalAlpha = 0.25 + rnd() * 0.45; g.lineWidth = S * 0.022;
      u.circle(bx2, by2, br2); g.stroke(); g.fillStyle = foam; u.circle(bx2 - br2 * 0.3, by2 + br2 * 0.3, br2 * 0.2); g.fill();
    }
    g.restore();
    printed(A, u, foam, sun, foam, jp);
    // 波のリボンに台の名前
    g.save(); g.fillStyle = '#053a55'; g.globalAlpha = 0.88; g.beginPath();
    for (q = 0; q <= 40; q++) { var wx2 = -3.1 + q * 0.135; g.lineTo(X(wx2), Y(6.72 + 0.1 * Math.sin(q * 0.9))); }
    for (q = 40; q >= 0; q--) { var wx3 = -3.1 + q * 0.135; g.lineTo(X(wx3), Y(5.72 + 0.1 * Math.sin(q * 0.9 + 1))); }
    g.closePath(); g.fill(); g.restore();
    u.text('うみのそこ', CX, 6.2, 0.72, '#bfeef5', { font: jp });
  };
  back.umi = function (g) {
    var gr = g.createLinearGradient(0, 20, 0, 104); gr.addColorStop(0, '#2fb7cf'); gr.addColorStop(1, '#064a66');
    g.fillStyle = gr; g.fillRect(20, 20, 728, 84);
    g.fillStyle = 'rgba(217,251,255,.85)';
    for (var row = 0; row < 2; row++) {
      g.globalAlpha = row ? 0.9 : 0.4; g.beginPath(); g.moveTo(20, 104);
      for (var x = 20; x <= 748; x += 8) g.lineTo(x, 92 - row * 2 + 5 * Math.sin(x / 26 + row * 2));
      g.lineTo(748, 104); g.fill();
    }
    g.globalAlpha = 1;
  };

  /* ---------- ほしぞらワープ：星図 ---------- */
  floor.hoshi = function (A) {
    var g = A.g, X = A.X, Y = A.Y, S = A.S, u = tools(A), rnd = A.rnd, k, jp = 'DotGothic16, monospace';
    var gold = '#ffd23f', lilac = '#b28dff', cyan = '#5ee0ff', red = '#ff6b5e';
    g.fillStyle = '#07060f'; g.fillRect(0, 0, A.w, A.h);
    u.glow(-2.5, 14.5, 5, '#5a3fd0', 0.5); u.glow(2.6, 8.5, 4.5, '#1c6f9c', 0.4); u.glow(-1.5, 4.5, 4, '#7a2f8f', 0.35); u.glow(CX, 11.8, 2.6, '#3a2f8f', 0.5);
    for (k = 0; k < 900; k++) {
      g.globalAlpha = 0.25 + rnd() * 0.75; g.fillStyle = k % 11 === 0 ? gold : k % 7 === 0 ? cyan : '#ffffff';
      var sr = rnd() < 0.06 ? 2.6 : rnd() * 1.5 + 0.4; g.beginPath(); g.arc(rnd() * A.w, rnd() * A.h, sr, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // 星図の目盛りつきの輪
    [[1.9, lilac], [3.35, gold]].forEach(function (r) {
      g.save(); g.strokeStyle = r[1]; g.globalAlpha = 0.7; g.lineWidth = S * 0.025; u.circle(CX, 11.8, r[0]); g.stroke();
      for (k = 0; k < 72; k++) {
        var a = k / 72 * TAU, l = k % 6 === 0 ? 0.2 : 0.09;
        g.beginPath(); g.moveTo(X(CX + r[0] * Math.cos(a)), Y(11.8 + r[0] * Math.sin(a))); g.lineTo(X(CX + (r[0] + l) * Math.cos(a)), Y(11.8 + (r[0] + l) * Math.sin(a))); g.stroke();
      }
      g.restore();
    });
    for (k = 0; k < 12; k++) { var a2 = k / 12 * TAU; u.text(String(k * 30), CX + 3.85 * Math.cos(a2), 11.8 + 3.85 * Math.sin(a2), 0.17, gold, { font: jp, alpha: 0.75 }); }
    g.save(); g.strokeStyle = lilac; g.globalAlpha = 0.3; g.lineWidth = S * 0.02;
    u.path([[CX - 4.4, 11.8], [CX + 4.4, 11.8]]); g.stroke(); u.path([[CX, 7.6], [CX, 16.0]]); g.stroke(); g.restore();
    // 星座
    var con = [[-3.3, 6.4], [-2.3, 5.3], [-1.2, 5.9], [-0.6, 4.6], [0.7, 4.9], [1.5, 6.1], [2.7, 5.4]];
    g.save(); g.strokeStyle = cyan; g.globalAlpha = 0.6; g.lineWidth = S * 0.025; g.setLineDash([S * 0.08, S * 0.07]); u.path(con); g.stroke(); g.restore();
    con.forEach(function (p, n) { u.glow(p[0], p[1], 0.35, cyan, 0.6); u.star(p[0], p[1], n % 3 === 0 ? 0.17 : 0.11, '#ffffff', 4); });
    u.text('ピンボール座', 1.9, 4.5, 0.2, cyan, { font: jp, alpha: 0.85 });
    // わのある星と月
    g.save(); g.translate(X(-3.0), Y(15.6)); g.rotate(-0.4);
    var pg = g.createLinearGradient(0, -0.6 * S, 0, 0.6 * S); pg.addColorStop(0, '#ffcf8a'); pg.addColorStop(1, '#c9622f');
    g.fillStyle = pg; g.beginPath(); g.arc(0, 0, 0.55 * S, 0, TAU); g.fill();
    g.strokeStyle = gold; g.lineWidth = S * 0.07; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(0, 0, 1.05 * S, 0.26 * S, 0, 0, TAU); g.stroke(); g.restore();
    g.save(); g.fillStyle = '#f3efd8'; u.circle(2.5, 16.0, 0.42); g.fill(); g.fillStyle = '#0d0b22'; u.circle(2.68, 16.1, 0.38); g.fill(); g.restore();
    // ワープの道すじ
    (A.cfg.warps || []).forEach(function (wp) {
      var mx = (wp.x + wp.tx) / 2 + (wp.x < CX ? -0.9 : 0.9), my = (wp.y + wp.ty) / 2;
      g.save(); g.strokeStyle = cyan; g.globalAlpha = 0.55; g.lineWidth = S * 0.035; g.setLineDash([S * 0.14, S * 0.12]);
      g.beginPath(); g.moveTo(X(wp.x), Y(wp.y)); g.quadraticCurveTo(X(mx), Y(my), X(wp.tx), Y(wp.ty)); g.stroke(); g.restore();
      u.text('ワープ', wp.x, wp.y - 0.85, 0.2, cyan, { font: jp });
    });
    // ロケット（下の矢印ランプが噴射になる）
    g.save(); g.translate(X(CX), Y(6.35));
    g.fillStyle = '#f3efd8'; g.beginPath(); g.moveTo(0, -0.62 * S); g.quadraticCurveTo(0.3 * S, -0.2 * S, 0.24 * S, 0.42 * S); g.lineTo(-0.24 * S, 0.42 * S); g.quadraticCurveTo(-0.3 * S, -0.2 * S, 0, -0.62 * S); g.fill();
    g.fillStyle = red; g.beginPath(); g.moveTo(0.24 * S, 0.1 * S); g.lineTo(0.5 * S, 0.55 * S); g.lineTo(0.24 * S, 0.42 * S); g.fill();
    g.beginPath(); g.moveTo(-0.24 * S, 0.1 * S); g.lineTo(-0.5 * S, 0.55 * S); g.lineTo(-0.24 * S, 0.42 * S); g.fill();
    g.fillStyle = cyan; g.beginPath(); g.arc(0, -0.12 * S, 0.11 * S, 0, TAU); g.fill(); g.restore();
    printed(A, u, lilac, gold, '#e6dcff', jp);
    u.text('ほしぞらワープ', CX, 17.05, 0.3, gold, { font: jp, glow: gold });
  };
  back.hoshi = function (g) {
    g.fillStyle = '#0d0b22'; g.fillRect(20, 20, 728, 84);
    var s = 5; function r() { s = (s * 16807) % 2147483647; return s / 2147483647; }
    for (var k = 0; k < 120; k++) { g.globalAlpha = 0.3 + r() * 0.7; g.fillStyle = k % 9 ? '#ffffff' : '#ffd23f'; g.fillRect(22 + r() * 724, 22 + r() * 80, 2, 2); }
    g.globalAlpha = 1; g.fillStyle = '#c9622f'; g.beginPath(); g.arc(690, 60, 20, 0, TAU); g.fill();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.beginPath(); g.ellipse(690, 60, 38, 9, -0.4, 0, TAU); g.stroke();
    g.fillStyle = '#f3efd8'; g.beginPath(); g.arc(74, 58, 16, 0, TAU); g.fill(); g.fillStyle = '#0d0b22'; g.beginPath(); g.arc(81, 54, 14, 0, TAU); g.fill();
  };

  /* ---------- レトロ横丁：昭和の商店街 ---------- */
  floor.retro = function (A) {
    var g = A.g, X = A.X, Y = A.Y, S = A.S, u = tools(A), rnd = A.rnd, k, jp = "'Dela Gothic One', sans-serif";
    var cream = '#f3e3ba', red = '#cf3b2a', teal = '#1f8a84', mus = '#e8a224', brown = '#5a3118';
    g.fillStyle = '#ecd9a6'; g.fillRect(0, 0, A.w, A.h);
    // 放射のしま
    var ox = X(CX), oy = Y(11.6);
    for (k = 0; k < 24; k += 2) { g.beginPath(); g.moveTo(ox, oy); g.arc(ox, oy, A.h, Math.PI * k / 12, Math.PI * (k + 1) / 12); g.closePath(); g.fillStyle = '#dfb548'; g.globalAlpha = 0.55; g.fill(); }
    g.globalAlpha = 1;
    [[2.95, teal], [3.35, red], [3.75, teal]].forEach(function (r) { g.strokeStyle = r[1]; g.lineWidth = S * (r[0] === 3.35 ? 0.09 : 0.04); u.circle(CX, 11.6, r[0]); g.stroke(); });
    // 市松タイル（下のほう）
    g.save(); g.beginPath(); g.rect(0, Y(3.3), A.w, 4 * S); g.clip();
    for (var ty = -0.6; ty < 3.3; ty += 0.55) for (var tx = -5.3; tx < 5.3; tx += 0.55) {
      g.fillStyle = (Math.round(tx / 0.55) + Math.round(ty / 0.55)) % 2 ? teal : cream; g.globalAlpha = 0.9; g.fillRect(X(tx), Y(ty + 0.55), 0.55 * S + 1, 0.55 * S + 1);
    }
    g.restore();
    g.fillStyle = brown; g.fillRect(0, Y(3.38), A.w, 0.09 * S);
    // アーチのひさし（赤白のしまと波型のふち）
    g.save();
    for (k = 0; k < 30; k++) {
      var a0 = Math.PI * k / 30, a1 = Math.PI * (k + 1) / 30;
      g.fillStyle = k % 2 ? red : '#fbf3dc'; g.beginPath();
      g.arc(X(0), Y(13), 4.95 * S, -a0, -a1, true); g.arc(X(0), Y(13), 4.2 * S, -a1, -a0, false); g.closePath(); g.fill();
      g.beginPath(); g.arc(X(4.2 * Math.cos((a0 + a1) / 2)), Y(13 + 4.2 * Math.sin((a0 + a1) / 2)), 0.225 * S, 0, TAU); g.fill();
    }
    g.restore();
    // 星
    for (k = 0; k < 14; k++) u.star(-4.3 + rnd() * 8, 4 + rnd() * 12.5, 0.12 + rnd() * 0.16, k % 2 ? red : teal);
    // ちょうちん
    function lantern(x, y, ch) {
      g.save(); g.fillStyle = brown; g.fillRect(X(x - 0.2), Y(y + 0.72), 0.4 * S, 0.14 * S); g.fillRect(X(x - 0.2), Y(y - 0.58), 0.4 * S, 0.14 * S);
      g.fillStyle = red; g.beginPath(); g.ellipse(X(x), Y(y), 0.5 * S, 0.62 * S, 0, 0, TAU); g.fill();
      g.strokeStyle = '#8f2318'; g.lineWidth = S * 0.02;
      for (var q = -3; q <= 3; q++) { g.beginPath(); g.ellipse(X(x), Y(y + q * 0.16), 0.5 * Math.sqrt(Math.max(0.02, 1 - Math.pow(q * 0.16 / 0.62, 2))) * S, 0.05 * S, 0, 0, Math.PI); g.stroke(); }
      g.restore(); u.text(ch, x, y, 0.5, cream, { font: jp });
    }
    lantern(-3.55, 15.0, '祭'); lantern(2.75, 15.0, '祭');
    // 琺瑯看板
    function sign(x, y, w2, h2, txt, bgc, fgc, rot, sz) {
      g.save(); g.translate(X(x), Y(y)); g.rotate(rot); g.translate(-X(x), -Y(y));
      u.rrect(x, y, w2, h2, 0.1); g.fillStyle = bgc; g.fill(); g.strokeStyle = fgc; g.lineWidth = S * 0.04; u.rrect(x, y, w2 - 0.14, h2 - 0.14, 0.06); g.stroke();
      g.restore(); u.text(txt, x, y - 0.01, sz, fgc, { font: jp, rot: rot });
    }
    sign(-3.25, 5.75, 0.6, 1.5, '', teal, cream, 0, 0.3); u.vtext('ラムネ', -3.25, 6.15, 0.36, cream, { font: jp });
    sign(2.45, 5.75, 0.6, 1.5, '', red, cream, 0, 0.3); u.vtext('大当り', 2.45, 6.15, 0.36, cream, { font: jp });
    sign(-3.3, 13.0, 1.5, 0.55, '一等賞', mus, brown, -0.5, 0.32); sign(2.5, 13.0, 1.5, 0.55, 'サイダー', teal, cream, 0.5, 0.28);
    printed(A, u, brown, red, brown, jp);
    // リボンに台の名前
    g.save(); g.fillStyle = '#8f2318'; u.path([[-3.0, 6.55], [-3.5, 6.2], [-3.0, 5.85]], true); g.fill(); u.path([[2.2, 6.55], [2.7, 6.2], [2.2, 5.85]], true); g.fill();
    g.fillStyle = red; g.fillRect(X(-3.05), Y(6.72), 5.3 * S, 1.04 * S);
    g.strokeStyle = cream; g.lineWidth = S * 0.03; g.strokeRect(X(-2.95), Y(6.62), 5.1 * S, 0.84 * S); g.restore();
    u.text('ヨコチョウ', CX, 6.18, 0.66, cream, { font: jp });
  };
  back.retro = function (g) {
    g.fillStyle = '#f3e3ba'; g.fillRect(20, 20, 728, 84);
    for (var k = 0; k < 26; k++) {
      g.fillStyle = k % 2 ? '#cf3b2a' : '#fbf3dc'; g.fillRect(20 + k * 28, 20, 28, 16);
      g.beginPath(); g.arc(34 + k * 28, 36, 14, 0, Math.PI); g.fill();
    }
    [[70, '祭'], [698, '祭']].forEach(function (p) {
      g.fillStyle = '#cf3b2a'; g.beginPath(); g.ellipse(p[0], 74, 20, 24, 0, 0, TAU); g.fill();
      g.fillStyle = '#f3e3ba'; g.font = "700 22px 'Dela Gothic One', sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(p[1], p[0], 75);
    });
  };

  // 絵に使う文字（Webフォントを先に読みこむため）
  var fonts = {
    neon: [["900 40px Orbitron", 'NEON1000'], ["700 40px 'Zen Kaku Gothic New'", 'バーゲームホテルアウトジャックポットフィーバー24']],
    umi: [["400 40px 'Mochiy Pop One'", 'うみのそこアウトジャックポットフィーバー1000']],
    hoshi: [['400 40px DotGothic16', 'ほしぞらワープピンボール座アウトジャックポットフィーバー0123456789']],
    retro: [["400 40px 'Dela Gothic One'", 'ヨコチョウ祭ラムネ大当り一等賞サイダーアウトジャックポットフィーバー1000']]
  };
  window.PB_ART = { floor: floor, back: back, fonts: fonts };
})();
