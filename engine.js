/* 3Dピンボール共通エンジン：台の平面で2D物理を計算し、three.js で立体に描く */
(function () {
  'use strict';
  var T = window.THREE;
  var R = 0.25;            // ボール半径
  var LANE_X = 4.2;        // 発射レーンの仕切り
  var CX = -0.4;           // 遊ぶ面の中心
  var H = 1 / 720;         // 物理の刻み
  var MAXV = 44;

  var CSS = [
    'html,body{height:100%}',
    'body{background:var(--bg);color:var(--ink);font-family:var(--font-body);overflow:hidden;overscroll-behavior:none}',
    '#pb{position:relative;height:100%;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none}',
    '#pb canvas{display:block;position:absolute;inset:0;width:100%;height:100%}',
    '.pb-hud{position:absolute;inset:0 0 auto 0;display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding-block:10px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));pointer-events:none;z-index:2}',
    '.pb-score{font-family:var(--font-display);font-size:clamp(26px,7vw,40px);line-height:1;color:var(--ink);font-variant-numeric:tabular-nums;text-shadow:0 0 18px var(--glow)}',
    '.pb-label{font-size:11px;letter-spacing:.14em;color:var(--dim);text-transform:uppercase;margin-bottom:4px}',
    '.pb-right{text-align:right;display:flex;flex-direction:column;gap:4px;align-items:flex-end}',
    '.pb-balls{font-size:14px;letter-spacing:.2em;color:var(--accent)}',
    '.pb-mult{font-family:var(--font-display);font-size:15px;color:var(--accent2);font-variant-numeric:tabular-nums}',
    '.pb-hi{font-size:11px;color:var(--dim);font-variant-numeric:tabular-nums}',
    '.pb-mute{pointer-events:auto;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:999px;font:inherit;font-size:12px;padding:5px 10px;cursor:pointer}',
    '.pb-mute:focus-visible,.pb-btn:focus-visible{outline:2px solid var(--accent2);outline-offset:3px}',
    '.pb-toast{position:absolute;left:0;right:0;top:36%;text-align:center;font-family:var(--font-display);font-size:clamp(18px,5vw,28px);color:var(--accent2);text-shadow:0 0 22px var(--glow),0 2px 0 var(--bg);opacity:0;transition:opacity .25s;pointer-events:none;z-index:2;padding-inline:16px}',
    '.pb-toast.on{opacity:1}',
    '.pb-charge{position:absolute;right:max(16px,env(safe-area-inset-right,0px));bottom:calc(18px + env(safe-area-inset-bottom,0px));width:min(46vw,190px);z-index:2;pointer-events:none;font-size:12px;color:var(--ink);text-align:right}',
    '.pb-bar{height:8px;border-radius:4px;background:var(--panel);border:1px solid var(--line);margin-top:6px;overflow:hidden}',
    '.pb-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--accent),var(--accent2))}',
    '.pb-over{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:3;background:var(--veil);padding-block:24px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}',
    '.pb-card{max-width:400px;width:100%;text-align:center;display:flex;flex-direction:column;gap:14px;align-items:center}',
    '.pb-key{font-style:normal}',
    '.pb-home{color:var(--ink);font-size:13px;text-underline-offset:4px}',
    '.pb-home:focus-visible{outline:2px solid var(--accent2);outline-offset:3px}',
    '.pb-title{font-family:var(--font-display);font-size:clamp(34px,11vw,58px);line-height:1.05;color:var(--ink);text-shadow:0 0 28px var(--glow);text-wrap:balance;margin:0}',
    '.pb-sub{color:var(--accent2);font-size:14px;letter-spacing:.08em;margin:0}',
    '.pb-final{font-family:var(--font-display);font-size:22px;color:var(--accent2);margin:0;font-variant-numeric:tabular-nums}',
    '.pb-how{margin:0;padding:0;list-style:none;text-align:left;font-size:13px;line-height:1.55;color:var(--ink);width:100%;display:grid;gap:8px}',
    '.pb-how li{display:grid;grid-template-columns:5.2em 1fr;gap:12px;align-items:center;padding:9px 12px;background:var(--panel);border-left:3px solid var(--accent);border-radius:var(--r,6px)}',
    '.pb-how b{color:var(--accent2);font-family:var(--font-display);font-weight:400;font-size:13px}',
    '.pb-how span{min-width:0}',
    '.pb-key{display:inline-block;min-width:1.6em;padding:1px 6px;margin-right:3px;text-align:center;font-size:12px;color:var(--ink);border:1px solid var(--line);border-bottom-width:3px;border-radius:5px;background:var(--veil)}',
    '.pb-tip{margin:0;font-size:12.5px;line-height:1.7;color:var(--dim);text-align:left;width:100%}',
    '.pb-btn{font-family:var(--font-display);font-size:18px;color:var(--bg);background:var(--accent);border:0;border-radius:999px;padding:13px 34px;cursor:pointer;box-shadow:0 0 26px var(--glow)}',
    '.pb-btn:hover{background:var(--accent2)}',
    '.pb-pop{position:absolute;left:0;top:0;z-index:1;pointer-events:none;font-family:var(--font-display);font-size:17px;color:var(--pop,var(--accent2));text-shadow:0 0 10px var(--glow),0 1px 0 var(--bg);font-variant-numeric:tabular-nums;white-space:nowrap;animation:pbpop .8s ease-out forwards}',
    '@keyframes pbpop{0%{opacity:1;transform:translate(-50%,-50%) scale(.6)}18%{opacity:1;transform:translate(-50%,-70%) scale(1.2)}100%{opacity:0;transform:translate(-50%,-230%) scale(1)}}',
    '.pb-mult.fever{color:var(--accent);animation:pbfev .35s steps(2) infinite}',
    '@keyframes pbfev{50%{opacity:.45}}',
    '@media (prefers-reduced-motion:reduce){.pb-mult.fever{animation:none}}'
  ].join('\n');

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  window.startPinball = function (cfg) {
    var C = cfg.colors;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    var root = document.getElementById('pb');

    /* ---------- 画面の部品 ---------- */
    var hud = el('div', 'pb-hud');
    var left = el('div', '', '<div class="pb-label">スコア</div><div class="pb-score" id="pb-score">0</div>');
    var right = el('div', 'pb-right');
    var ballsEl = el('div', 'pb-balls');
    var multEl = el('div', 'pb-mult');
    var hiEl = el('div', 'pb-hi');
    var muteBtn = el('button', 'pb-mute', '音 オン');
    muteBtn.id = 'pb-mute'; muteBtn.type = 'button';
    var tiltBtn = el('button', 'pb-mute', '傾き オン');
    tiltBtn.id = 'pb-tilt'; tiltBtn.type = 'button'; tiltBtn.hidden = true;
    right.appendChild(ballsEl); right.appendChild(multEl); right.appendChild(hiEl); right.appendChild(muteBtn); right.appendChild(tiltBtn);
    hud.appendChild(left); hud.appendChild(right);
    var toast = el('div', 'pb-toast');
    var chargeBox = el('div', 'pb-charge', '<span>右側を長押し → はなして発射</span><div class="pb-bar"><i></i></div>');
    chargeBox.hidden = true;
    var chargeBar = chargeBox.querySelector('i');
    var over = el('div', 'pb-over');
    var card = el('div', 'pb-card');
    var finalEl = el('p', 'pb-final'); finalEl.hidden = true;
    var startBtn = el('button', 'pb-btn', 'スタート');
    startBtn.id = 'pb-start'; startBtn.type = 'button';
    card.appendChild(el('h1', 'pb-title', cfg.name));
    card.appendChild(el('p', 'pb-sub', cfg.sub));
    card.appendChild(finalEl);
    card.appendChild(el('ul', 'pb-how',
      '<li><b>フリッパー</b><span>画面の左半分・右半分をタッチ。キーボードは <i class="pb-key">←</i><i class="pb-key">→</i></span></li>' +
      '<li><b>発射</b><span>画面の右側を長押ししてはなす。キーボードは <i class="pb-key">Space</i></span></li>' +
      '<li><b>台ゆらし</b><span>スマホを振る。キーボードは <i class="pb-key">↑</i>　やりすぎると「ティルト」でフリッパーが止まる</span></li>' +
      '<li><b>しかけ</b><span>' + cfg.tip + '</span></li>'));
    card.appendChild(startBtn);
    if (cfg.home) card.appendChild(el('a', 'pb-home', 'ほかの台をえらぶ')).href = cfg.home;
    over.appendChild(card);
    var scoreEl;

    /* ---------- three.js ---------- */
    var renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    root.appendChild(renderer.domElement);
    root.appendChild(hud); root.appendChild(toast); root.appendChild(chargeBox); root.appendChild(over);
    scoreEl = document.getElementById('pb-score');

    var scene = new T.Scene();
    scene.background = (function () {
      var c = document.createElement('canvas'); c.width = 64; c.height = 256;
      var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, C.bgTop || C.bg); gr.addColorStop(0.55, C.bg); gr.addColorStop(1, C.bgLow || C.bg);
      g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
      return new T.CanvasTexture(c);
    })();
    var camera = new T.PerspectiveCamera(36, 1, 0.5, 200);
    scene.add(new T.AmbientLight(0xffffff, 0.5));
    var sun = new T.DirectionalLight(0xffffff, 0.45);
    sun.position.set(-4, 14, 6); scene.add(sun);
    var l1 = new T.PointLight(C.light1, 1.1, 22); l1.position.set(-3, 4, -13); scene.add(l1);
    var l2 = new T.PointLight(C.light2, 1.1, 22); l2.position.set(3, 4, -5); scene.add(l2);
    var flash = new T.PointLight(0xffffff, 0, 7); flash.position.set(0, 1.2, -9); scene.add(flash);
    // ボールや金属に映りこむ、まわりの景色
    var envTex = (function () {
      try {
        var c = document.createElement('canvas'); c.width = 256; c.height = 128;
        var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128), k;
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.42, C.light1); gr.addColorStop(0.58, C.bg); gr.addColorStop(1, '#000000');
        g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
        for (k = 0; k < 6; k++) { g.fillStyle = k % 2 ? C.light2 : '#ffffff'; g.fillRect(k * 43 + 8, 14, 16, 34); }
        var t = new T.CanvasTexture(c); t.mapping = T.EquirectangularReflectionMapping;
        var pm = new T.PMREMGenerator(renderer), rt = pm.fromEquirectangular(t); pm.dispose();
        return rt.texture;
      } catch (e) { return null; }
    })();

    // 手作りの形はここにまとめる（Blenderのモデルが読めたら丸ごと隠す）
    var procGrp = new T.Group(); scene.add(procGrp);
    var floorG = null, floorTex = null, floorW = 0, floorH = 0;
    function P(x, y, h) { return new T.Vector3(x, h || 0, -y); }
    function std(color, em, emI, rough, metal) {
      return new T.MeshStandardMaterial({ color: color, emissive: em || 0x000000, emissiveIntensity: emI || 0, roughness: rough == null ? 0.5 : rough, metalness: metal || 0 });
    }
    function extrude(pts, h, mat) {
      var s = new T.Shape();
      s.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
      s.closePath();
      var g = new T.ExtrudeGeometry(s, { depth: h, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      var m = new T.Mesh(g, mat); procGrp.add(m); return m;
    }

    /* ---------- 台の形 ---------- */
    var segs = [];      // {ax,ay,bx,by,r,e,type,ref}
    var wallMat = std(C.wall, C.wallEm, 0.55, 0.4, 0.2);
    if (envTex && !cfg.matte) { wallMat.envMap = envTex; wallMat.metalness = 0.65; wallMat.roughness = 0.28; wallMat.envMapIntensity = 0.7; }
    function wall(ax, ay, bx, by, opt) {
      opt = opt || {};
      var s = { ax: ax, ay: ay, bx: bx, by: by, r: opt.r || 0.08, e: opt.e == null ? 0.45 : opt.e, type: opt.type || 'wall', ref: opt.ref || null, oneWay: !!opt.oneWay };
      segs.push(s);
      if (!opt.hidden) {
        var dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy), h = opt.h || 0.55;
        var m = new T.Mesh(new T.BoxGeometry(len + 0.16, h, 0.16), opt.mat || wallMat);
        m.position.copy(P((ax + bx) / 2, (ay + by) / 2, h / 2));
        m.rotation.y = Math.atan2(dy, dx);
        procGrp.add(m); s.mesh = m;
      }
      return s;
    }

    // 外わく
    wall(-5, 4.6, -5, 13);
    wall(5, 0.6, 5, 13);
    var N = 26, i;
    for (i = 0; i < N; i++) {
      var a0 = Math.PI * i / N, a1 = Math.PI * (i + 1) / N;
      wall(5 * Math.cos(a0), 13 + 5 * Math.sin(a0), 5 * Math.cos(a1), 13 + 5 * Math.sin(a1));
    }
    wall(LANE_X, 0, LANE_X, 13);
    wall(LANE_X, 0.6, 5, 0.6, { hidden: true, e: 0.2 });
    // 発射レーンの出口（下からだけ通れる）
    var gateMat = std(C.accent, C.accent, 0.8, 0.4);
    wall(LANE_X, 13, 5, 14.2, { oneWay: true, h: 0.2, mat: gateMat });
    // フリッパーへ続く坂
    var FLX = CX - 2.0, FRX = CX + 2.0, FY = 2.45;
    // 坂の外がわ（壁ぎわ）はアウトレーン：ここを落ちたボールは失われる
    var OLX = -4.2, ORX = 2 * CX + 4.2, OY = 4.6 - 0.8 * (2.1 / 2.55);
    wall(-5, -0.6, -5, 4.6, { hidden: true });
    wall(OLX, OY, FLX - 0.05, FY + 0.05, { hidden: true }); wall(OLX, OY, OLX, -0.6, { hidden: true });
    wall(ORX, OY, FRX + 0.05, FY + 0.05, { hidden: true }); wall(ORX, OY, ORX, -0.6, { hidden: true });
    var apronMat = std(C.apron, C.wallEm, 0.12, 0.6);
    extrude([[OLX - 0.08, OY + 0.1], [FLX - 0.05, FY + 0.13], [FLX - 0.05, -0.3], [OLX - 0.08, -0.3]], 0.55, apronMat);
    extrude([[ORX + 0.08, OY + 0.1], [ORX + 0.08, -0.3], [FRX + 0.05, -0.3], [FRX + 0.05, FY + 0.13]], 0.55, apronMat);

    function rod(ax, ay, bx, by, h, rad, mat) {
      var m = new T.Mesh(new T.CylinderGeometry(rad, rad, Math.hypot(bx - ax, by - ay), 8), mat);
      m.position.copy(P((ax + bx) / 2, (ay + by) / 2, h)); m.rotation.z = Math.PI / 2; m.rotation.y = Math.atan2(by - ay, bx - ax);
      procGrp.add(m); return m;
    }
    var chrome = std(0xffffff, 0xffffff, 0.05, 0.22, 0.9);
    if (envTex) { chrome.envMap = envTex; chrome.envMapIntensity = 1.2; }
    var plastic = std(C.bumperBody, 0x000000, 0, 0.45, 0.05);

    // スリングショット（はじく三角）
    var slings = [];
    function sling(A, B, Cc) {
      var mat = std(C.sling, C.sling, 0.12, 0.4);
      mat.transparent = true; mat.opacity = 0.9;
      var mesh = extrude([A, B, Cc], 0.06, mat); mesh.position.y = 0.5;
      var rub = std(0xf4f4f4, 0xffffff, 0.12, 0.8);
      rod(A[0], A[1], B[0], B[1], 0.27, 0.05, rub); rod(B[0], B[1], Cc[0], Cc[1], 0.27, 0.05, rub); rod(A[0], A[1], Cc[0], Cc[1], 0.27, 0.05, rub);
      wall(A[0], A[1], B[0], B[1], { hidden: true });
      wall(B[0], B[1], Cc[0], Cc[1], { hidden: true });
      var o = { mat: mat, glow: 0 };
      wall(A[0], A[1], Cc[0], Cc[1], { hidden: true, type: 'sling', ref: o, e: 0.5 });
      slings.push(o);
    }
    sling([-3.9, 7.0], [-3.9, 4.9], [-2.6, 3.9]);
    sling([2 * CX + 3.9, 7.0], [2 * CX + 3.9, 4.9], [2 * CX + 2.6, 3.9]);

    (cfg.walls || []).forEach(function (w) { wall(w[0], w[1], w[2], w[3], { h: 0.45 }); });

    // バンパー
    // バンパー：すそ・胴体・金属の輪・模様入りの傘
    function capDecal(col, score) {
      var c = document.createElement('canvas'); c.width = c.height = 128;
      var g = c.getContext('2d'), k;
      g.fillStyle = col; g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#ffffff';
      for (k = 0; k < 12; k++) {
        var a0 = k * Math.PI / 6;
        g.beginPath(); g.moveTo(64 + 60 * Math.cos(a0 - 0.13), 64 + 60 * Math.sin(a0 - 0.13));
        g.lineTo(64 + 60 * Math.cos(a0 + 0.13), 64 + 60 * Math.sin(a0 + 0.13)); g.lineTo(64 + 26 * Math.cos(a0), 64 + 26 * Math.sin(a0)); g.fill();
      }
      g.beginPath(); g.arc(64, 64, 27, 0, 6.283); g.fill();
      g.lineWidth = 4; g.strokeStyle = col; g.beginPath(); g.arc(64, 64, 22, 0, 6.283); g.stroke();
      g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 20px sans-serif'; g.fillText(String(score), 64, 66);
      g.lineWidth = 5; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 60, 0, 6.283); g.stroke();
      return new T.CanvasTexture(c);
    }
    var bumpers = (cfg.bumpers || []).map(function (b, k) {
      var col = C.bumper[k % C.bumper.length], score = b.score || 100, r = b.r;
      var g = new T.Group();
      var skirt = new T.Mesh(new T.CylinderGeometry(r * 1.1, r * 1.18, 0.06, 32), plastic); skirt.position.y = 0.03;
      var bodyMat = std(C.bumperBody, col, 0.25, 0.4, 0.05);
      var body = new T.Mesh(new T.CylinderGeometry(r * 0.62, r * 0.72, 0.52, 28), bodyMat); body.position.y = 0.3;
      var ringM = new T.Mesh(new T.TorusGeometry(r * 0.98, 0.045, 10, 36), chrome); ringM.rotation.x = Math.PI / 2; ringM.position.y = 0.42;
      var k2, rods = [];
      for (k2 = 0; k2 < 3; k2++) {
        var rr = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.5, 6), chrome);
        rr.position.set(r * 0.98 * Math.cos(k2 * 2.094 + 0.5), 0.3, r * 0.98 * Math.sin(k2 * 2.094 + 0.5)); g.add(rr);
      }
      var tex = capDecal(col, score);
      var sideMat = std(col, col, 0.15, 0.35);
      var topMat = new T.MeshStandardMaterial({ map: tex, color: 0xbbbbbb, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.06, roughness: 0.35 });
      var cap = new T.Mesh(new T.CylinderGeometry(r * 1.14, r * 0.92, 0.17, 36), [sideMat, topMat, sideMat]);
      cap.position.y = 0.66; cap.rotation.y = cfg.capTurn || 0;
      g.add(skirt); g.add(body); g.add(ringM); g.add(cap);
      g.position.copy(P(b.x, b.y, 0)); procGrp.add(g);
      return { x: b.x, y: b.y, r: b.r, kick: (b.kick || 12) + 1.5, score: score, g: g, mat: topMat, side: sideMat, body: bodyMat, ring: ringM, glow: 0, col: col };
    });

    // 的：当たると床に沈むドロップターゲット
    var tgTex = (function () {
      var c = document.createElement('canvas'); c.width = 96; c.height = 64;
      var g = c.getContext('2d');
      g.fillStyle = C.target; g.fillRect(0, 0, 96, 64);
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(48, 32, 24, 0, 6.283); g.fill();
      g.fillStyle = C.target; g.beginPath(); g.arc(48, 32, 15, 0, 6.283); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(48, 32, 6, 0, 6.283); g.fill();
      g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.strokeRect(2, 2, 92, 60);
      return new T.CanvasTexture(c);
    })();
    var tgFace = new T.MeshStandardMaterial({ map: tgTex, color: 0xcccccc, emissive: 0xffffff, emissiveMap: tgTex, emissiveIntensity: 0.1, roughness: 0.4 });
    var tgSide = std(0xf2f2f2, 0x000000, 0, 0.5), tgBox = std(0x30303a, 0x000000, 0, 0.5, 0.6), slotMat = new T.MeshBasicMaterial({ color: 0x050505 });
    var targets = (cfg.targets || []).map(function (t) {
      // 壁ぎわの的はフリッパーのほうへ斜めに向ける。free の的は好きな場所・向きに置ける
      var leftSide = t.x < CX, ang, cx, wx = leftSide ? -5 : LANE_X;
      if (t.free) { ang = t.ang || 0; cx = t.x; } else { ang = Math.PI / 2 + (leftSide ? -0.6 : 0.6); cx = t.x + (leftSide ? 0.27 : -0.27); }
      var hx = Math.cos(ang) * 0.4, hy = Math.sin(ang) * 0.4;
      var lo = [cx - hx, t.y - hy], up = [cx + hx, t.y + hy];
      var plate = new T.Mesh(new T.BoxGeometry(0.76, 0.62, 0.07), [tgSide, tgSide, tgSide, tgSide, tgFace, tgFace]);
      plate.position.copy(P(cx, t.y, 0.31)); plate.rotation.y = ang; procGrp.add(plate);
      var slot = new T.Mesh(new T.PlaneGeometry(0.84, 0.13), slotMat); slot.rotation.x = -Math.PI / 2; slot.rotation.z = ang; slot.position.copy(P(cx, t.y, 0.035)); scene.add(slot);
      if (!t.free) {
        var bk = leftSide ? -0.07 : 0.07;
        extrude([[wx, up[1] + 0.35], [up[0] + bk, up[1] + 0.02], [lo[0] + bk, lo[1]], [wx, lo[1] - 0.1]], 0.3, tgBox);
        wall(wx, up[1] + 0.35, up[0], up[1], { hidden: true });
      }
      var o = { lit: false, plate: plate, d: 0, x: cx, y: t.y, grp: t.free ? 'bank' : 'side', free: !!t.free, left: leftSide };
      wall(lo[0], lo[1], up[0], up[1], { type: 'target', ref: o, r: 0.1, hidden: true, e: 0.6 });
      return o;
    });

    // レーンのランプ（ロールオーバー）
    var rolls = (cfg.rollovers || []).map(function (r) {
      var mat = new T.MeshBasicMaterial({ color: C.roll, transparent: true, opacity: 0.22 });
      var m = new T.Mesh(new T.CircleGeometry(0.32, 24), mat);
      m.rotation.x = -Math.PI / 2; m.position.copy(P(r.x, r.y, 0.04)); procGrp.add(m);
      return { x: r.x, y: r.y, lit: false, mat: mat, cd: 0 };
    });

    // 回る棒
    var rotors = (cfg.rotors || []).map(function (r) {
      var g = new T.Group();
      var bar = new T.Mesh(new T.BoxGeometry(r.half * 2, 0.3, 0.3), std(C.rotor, C.rotor, 0.4, 0.35, 0.2));
      bar.position.y = 0.3;
      var hub = new T.Mesh(new T.CylinderGeometry(0.24, 0.28, 0.6, 20), std(C.bumperBody, C.rotor, 0.2, 0.4, 0.4));
      hub.position.y = 0.3;
      g.add(bar); g.add(hub); g.position.copy(P(r.x, r.y, 0)); procGrp.add(g);
      return { x: r.x, y: r.y, half: r.half, w: r.w, a: r.a || 0, g: g, cd: 0 };
    });

    // ワープ
    var warps = (cfg.warps || []).map(function (w) {
      var ringMat = new T.MeshBasicMaterial({ color: C.warp });
      var ring = new T.Mesh(new T.TorusGeometry(0.46, 0.06, 10, 32), ringMat);
      ring.rotation.x = -Math.PI / 2; ring.position.copy(P(w.x, w.y, 0.06)); procGrp.add(ring);
      var hole = new T.Mesh(new T.CircleGeometry(0.42, 28), new T.MeshBasicMaterial({ color: 0x000000 }));
      hole.rotation.x = -Math.PI / 2; hole.position.copy(P(w.x, w.y, 0.04)); procGrp.add(hole);
      var out = new T.Mesh(new T.TorusGeometry(0.34, 0.04, 8, 28), new T.MeshBasicMaterial({ color: C.warpOut }));
      out.rotation.x = -Math.PI / 2; out.position.copy(P(w.tx, w.ty, 0.05)); procGrp.add(out);
      return { x: w.x, y: w.y, tx: w.tx, ty: w.ty, vx: w.vx, vy: w.vy, ring: ring, out: out };
    });

    // 追加のしかけ：ゴムのバー・ピン・ホール
    var rubMat = std(0xf4f4f4, 0xffffff, 0.12, 0.8);
    function pin(x, y, col) {
      var m = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 0.6, 12), chrome); m.position.copy(P(x, y, 0.3)); procGrp.add(m);
      var c = new T.Mesh(new T.SphereGeometry(0.13, 12, 8), std(col, col, 0.9, 0.3)); c.position.copy(P(x, y, 0.64)); procGrp.add(c);
    }
    (cfg.bars || []).forEach(function (q) {
      wall(q[0], q[1], q[2], q[3], { type: 'bar', r: 0.07, e: 0.85, hidden: true });
      rod(q[0], q[1], q[2], q[3], 0.27, 0.05, rubMat); pin(q[0], q[1], C.roll); pin(q[2], q[3], C.roll);
    });
    var pegs = (cfg.pegs || []).map(function (q) { pin(q.x, q.y, C.accent); return { x: q.x, y: q.y }; });
    var holes = (cfg.holes || []).map(function (h) {
      var d = new T.Mesh(new T.CircleGeometry(0.36, 28), new T.MeshBasicMaterial({ color: 0x000000 }));
      d.rotation.x = -Math.PI / 2; d.position.copy(P(h.x, h.y, 0.045)); scene.add(d);
      var rm = new T.Mesh(new T.TorusGeometry(0.45, 0.04, 8, 32), new T.MeshBasicMaterial({ color: C.accent }));
      rm.rotation.x = -Math.PI / 2; rm.position.copy(P(h.x, h.y, 0.11)); scene.add(rm);
      return { x: h.x, y: h.y, vx: h.vx, vy: h.vy, cd: 0, ball: null, t: 0, ring: rm };
    });

    // フリッパー
    function flipperMesh(len) {
      var pts = [], k, a, r1 = 0.27, r2 = 0.17;
      for (k = 0; k <= 10; k++) { a = Math.PI / 2 + Math.PI * k / 10; pts.push([r1 * Math.cos(a), r1 * Math.sin(a)]); }
      for (k = 0; k <= 10; k++) { a = -Math.PI / 2 + Math.PI * k / 10; pts.push([len + r2 * Math.cos(a), r2 * Math.sin(a)]); }
      var m = extrude(pts, 0.38, std(C.flipper, C.flipper, 0.15, 0.4, 0.1));
      var pin = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 0.46, 16), std(0xffffff, 0xffffff, 0.3, 0.3, 0.6));
      pin.position.y = 0.23; m.add(pin);
      return m;
    }
    var FL = 1.45;
    var flippers = [
      { px: FLX, py: FY, rest: -0.52, up: 0.5, a: -0.52, w: 0, on: false, len: FL },
      { px: FRX, py: FY, rest: Math.PI + 0.52, up: Math.PI - 0.5, a: Math.PI + 0.52, w: 0, on: false, len: FL }
    ];
    flippers.forEach(function (f) { f.mesh = flipperMesh(f.len); f.mesh.position.copy(P(f.px, f.py, 0.04)); });

    // 発射の棒
    var plunger = new T.Mesh(new T.CylinderGeometry(0.2, 0.2, 0.8, 16), std(C.accent, C.accent, 0.4, 0.4, 0.5));
    plunger.rotation.x = Math.PI / 2; procGrp.add(plunger);

    /* ---------- 床の絵 ---------- */
    (function floor() {
      var w = 1024, h = 1797, cv = document.createElement('canvas');
      var art = window.PB_ART && window.PB_ART.floor[cfg.art];
      cv.width = w; cv.height = h;
      var g = cv.getContext('2d');
      function X(x) { return (x + 5.3) / 10.6 * w; }
      function Y(y) { return (18.3 - y) / 18.6 * h; }
      var S = w / 10.6;
      var gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, C.floorA); gr.addColorStop(1, C.floorB);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      var k, rnd = (function () { var s = cfg.seed || 7; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      if (art) {
        art({ g: g, X: X, Y: Y, S: S, C: C, cfg: cfg, rnd: rnd, w: w, h: h });
      } else if (cfg.floorStyle === 'grid') {
        g.strokeStyle = C.floorLine; g.lineWidth = 1.2;
        for (k = -5; k <= 5; k++) { g.beginPath(); g.moveTo(X(k), 0); g.lineTo(X(k), h); g.stroke(); }
        for (k = 0; k <= 18; k++) { g.beginPath(); g.moveTo(0, Y(k)); g.lineTo(w, Y(k)); g.stroke(); }
        g.lineWidth = 3;
        for (k = 0; k < 5; k++) { g.beginPath(); g.arc(X(CX), Y(11.5), S * (1.2 + k * 1.1), 0, Math.PI * 2); g.globalAlpha = 0.5 - k * 0.08; g.stroke(); }
        g.globalAlpha = 1;
      } else if (cfg.floorStyle === 'bubbles') {
        for (k = 0; k < 70; k++) {
          var bx = rnd() * w, by = rnd() * h, br = 4 + rnd() * 22;
          g.beginPath(); g.arc(bx, by, br, 0, Math.PI * 2);
          g.strokeStyle = C.floorLine; g.globalAlpha = 0.25 + rnd() * 0.5; g.lineWidth = 1.5; g.stroke();
          g.beginPath(); g.arc(bx - br * 0.3, by - br * 0.3, br * 0.18, 0, Math.PI * 2); g.fillStyle = C.floorLine; g.fill();
        }
        g.globalAlpha = 0.35; g.strokeStyle = C.floorLine; g.lineWidth = 5;
        for (k = 0; k < 6; k++) {
          g.beginPath();
          for (var xx = 0; xx <= w; xx += 12) { var yy = Y(3 + k * 2.8) + Math.sin(xx / 46 + k) * 14; if (xx) g.lineTo(xx, yy); else g.moveTo(xx, yy); }
          g.stroke();
        }
        g.globalAlpha = 1;
      } else if (cfg.floorStyle === 'retro') {
        var ox = X(CX), oy = Y(11.6);
        for (k = 0; k < 24; k += 2) {
          g.beginPath(); g.moveTo(ox, oy);
          g.arc(ox, oy, h, Math.PI * k / 12, Math.PI * (k + 1) / 12); g.closePath();
          g.fillStyle = C.floorRay; g.globalAlpha = 0.55; g.fill();
        }
        g.globalAlpha = 1; g.lineWidth = 5;
        [[2.9, C.floorLine], [3.25, C.floorText]].forEach(function (c) { g.strokeStyle = c[1]; g.beginPath(); g.arc(ox, oy, S * c[0], 0, Math.PI * 2); g.stroke(); });
        function star(sx, sy, sr, col) {
          g.beginPath();
          for (var q = 0; q < 10; q++) { var ra = q % 2 ? sr * 0.45 : sr, an = -Math.PI / 2 + q * Math.PI / 5; g.lineTo(sx + ra * Math.cos(an), sy + ra * Math.sin(an)); }
          g.closePath(); g.fillStyle = col; g.fill();
        }
        for (k = 0; k < 16; k++) star(X(-4.4 + rnd() * 8.2), Y(1 + rnd() * 16), S * (0.14 + rnd() * 0.2), k % 2 ? C.floorText : C.floorLine);
        for (k = 0; k < 3; k++) { g.fillStyle = [C.floorText, C.floorLine, C.floorRay][k]; g.fillRect(0, Y(7.55 - k * 0.22), X(LANE_X), S * 0.14); }
      } else {
        for (k = 0; k < 420; k++) {
          g.globalAlpha = 0.3 + rnd() * 0.7; g.fillStyle = k % 9 ? '#ffffff' : C.floorLine;
          var sr = rnd() * 1.7 + 0.3; g.beginPath(); g.arc(rnd() * w, rnd() * h, sr, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 0.5; g.strokeStyle = C.floorLine; g.lineWidth = 2;
        for (k = 1; k <= 3; k++) { g.beginPath(); g.ellipse(X(CX), Y(11.8), S * k * 1.35, S * k * 1.05, -0.3, 0, Math.PI * 2); g.stroke(); }
        g.globalAlpha = 1;
      }
      // しかけの下の光
      function halo(x, y, r, col) {
        var rg = g.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), r * S);
        rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = 0.55; g.fillStyle = rg; g.beginPath(); g.arc(X(x), Y(y), r * S, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      }
      (cfg.bumpers || []).forEach(function (b, n) { halo(b.x, b.y, b.r * 2.4, C.bumper[n % C.bumper.length]); });
      (cfg.warps || []).forEach(function (wp) { halo(wp.x, wp.y, 1.2, C.warp); });
      (cfg.holes || []).forEach(function (hp) { halo(hp.x, hp.y, 1.3, C.accent); });
      // 発射レーン
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(X(LANE_X), Y(13), X(5) - X(LANE_X), Y(0) - Y(13));
      g.fillStyle = C.floorLine; g.globalAlpha = 0.8;
      for (k = 0; k < 7; k++) { var ay = Y(3 + k * 1.5), ax = X(4.6); g.beginPath(); g.moveTo(ax, ay - 14); g.lineTo(ax + 13, ay + 8); g.lineTo(ax - 13, ay + 8); g.fill(); }
      g.globalAlpha = 1;
      // 台の名前
      g.save(); g.translate(X(CX), Y(6.2)); g.textAlign = 'center';
      g.font = '700 ' + Math.round(S * 0.95) + 'px ' + cfg.floorFont; g.fillStyle = C.floorText; g.globalAlpha = 0.85;
      if (!art) g.fillText(cfg.floorWord, 0, 0);
      g.restore();
      var tex = new T.CanvasTexture(cv);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      var m = new T.Mesh(new T.PlaneGeometry(10.6, 18.6), new T.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0.1 }));
      m.rotation.x = -Math.PI / 2; m.position.set(0, 0, -9); scene.add(m);
      var base = new T.Mesh(new T.BoxGeometry(11.2, 1.2, 19.2), std(C.cabinet, C.wallEm, 0.1, 0.7));
      base.position.set(0, -0.72, -9); procGrp.add(base);
      floorG = g; floorTex = tex; floorW = w; floorH = h;
    })();

    // 背景の粒
    (function dust() {
      var n = 260, pos = new Float32Array(n * 3), k;
      for (k = 0; k < n; k++) {
        pos[k * 3] = (Math.random() - 0.5) * 70;
        pos[k * 3 + 1] = -6 - Math.random() * 30;
        pos[k * 3 + 2] = -9 + (Math.random() - 0.5) * 80;
      }
      var g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
      scene.add(new T.Points(g, new T.PointsMaterial({ color: C.dust, size: 0.22, transparent: true, opacity: 0.8 })));
    })();

    /* ---------- 演出 ---------- */
    var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var fever = 0, flashAll = 0, shakeAmt = 0, feverBeat = 0, feverNote = 0, lightsDirty = false;
    C.dmd = C.dmd || '#ffb000'; C.dmdOff = C.dmdOff || '#2a1c06'; C.glass = C.glass || '#06060b';
    C.bulb = C.bulb || '#fff3b8'; C.bulbOff = C.bulbOff || '#4a3a18'; C.trail = C.trail || C.accent;
    function shake(a) { if (!reduce) shakeAmt = Math.min(1.2, shakeAmt + a); }

    // 光のにじみ
    var composer = null, bloom = null, bloomBase = 0;
    if (T.EffectComposer && T.RenderPass && T.UnrealBloomPass && cfg.bloom !== false) {
      try {
        var BL = cfg.bloom || {}, pr = renderer.getPixelRatio(), rtg = null;
        if (renderer.capabilities.isWebGL2 && T.WebGLMultisampleRenderTarget) rtg = new T.WebGLMultisampleRenderTarget(256, 256, { format: T.RGBAFormat });
        composer = rtg ? new T.EffectComposer(renderer, rtg) : new T.EffectComposer(renderer);
        composer.setPixelRatio(pr);
        composer.addPass(new T.RenderPass(scene, camera));
        bloomBase = BL.strength == null ? 0.8 : BL.strength;
        bloom = new T.UnrealBloomPass(new T.Vector2(256, 256), bloomBase, BL.radius == null ? 0.55 : BL.radius, BL.threshold == null ? 0.6 : BL.threshold);
        composer.addPass(bloom);
      } catch (e) { composer = null; bloom = null; }
    }

    // 火花とボールの尾
    var PN = 480, pPos = new Float32Array(PN * 3), pCol = new Float32Array(PN * 3), pVel = new Float32Array(PN * 3), pBase = new Float32Array(PN * 3);
    var pLife = new Float32Array(PN), pMax = new Float32Array(PN), pGrav = new Uint8Array(PN), pIdx = 0, tmpC = new T.Color();
    for (i = 0; i < PN; i++) pPos[i * 3 + 1] = -99;
    var pGeo = new T.BufferGeometry();
    pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new T.BufferAttribute(pCol, 3));
    var dotTex = (function () {
      var c = document.createElement('canvas'); c.width = c.height = 64;
      var g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c);
    })();
    var pMesh = new T.Points(pGeo, new T.PointsMaterial({ size: cfg.matte ? 0.24 : 0.36, map: dotTex, vertexColors: true, blending: cfg.matte ? T.NormalBlending : T.AdditiveBlending, transparent: true, depthWrite: false }));
    pMesh.frustumCulled = false; scene.add(pMesh);
    function emit(x, h, z, vx, vy, vz, life, col, grav) {
      var k = pIdx, j = k * 3; pIdx = (pIdx + 1) % PN;
      pPos[j] = x; pPos[j + 1] = h; pPos[j + 2] = z; pVel[j] = vx; pVel[j + 1] = vy; pVel[j + 2] = vz;
      pBase[j] = col.r; pBase[j + 1] = col.g; pBase[j + 2] = col.b; pLife[k] = pMax[k] = life; pGrav[k] = grav ? 1 : 0;
    }
    function spark(x, y, col, n, sp) {
      tmpC.set(col);
      for (var q = 0; q < n; q++) {
        var a = Math.random() * 6.283, v = sp * (0.3 + Math.random());
        emit(x, 0.45, -y, Math.cos(a) * v, 1.5 + Math.random() * 3.5, Math.sin(a) * v, 0.3 + Math.random() * 0.45, tmpC, true);
      }
    }

    // 広がる輪
    var rings = [], ringI = 0;
    for (i = 0; i < 6; i++) {
      var rm = new T.Mesh(new T.RingGeometry(0.84, 1, 48), new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: cfg.matte ? T.NormalBlending : T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      rm.rotation.x = -Math.PI / 2; rm.visible = false; scene.add(rm); rings.push({ m: rm, t: 1 });
    }
    function ring(x, y, col) { var r = rings[ringI]; ringI = (ringI + 1) % rings.length; r.t = 0; r.m.material.color.set(col); r.m.position.copy(P(x, y, 0.07)); r.m.visible = true; }

    // 得点の数字が飛び出す
    var pops = [], popI = 0;
    for (i = 0; i < 8; i++) { var pe = el('div', 'pb-pop'); pe.hidden = true; root.appendChild(pe); pops.push(pe); }
    function pop(x, y, n) {
      if (n < 100) return;
      var e = pops[popI]; popI = (popI + 1) % pops.length;
      tmp.set(x, 0.9, -y).project(camera);
      e.textContent = '+' + fmt(n);
      e.style.left = ((tmp.x + 1) / 2 * root.clientWidth) + 'px'; e.style.top = ((1 - tmp.y) / 2 * root.clientHeight) + 'px';
      e.hidden = false; e.style.animation = 'none'; void e.offsetWidth; e.style.animation = '';
    }

    // 盤面のランプ
    var lamps = [];
    var dotGeo = new T.CircleGeometry(0.16, 18);
    var arrowGeo = (function () { var sh = new T.Shape(); sh.moveTo(0, 0.2); sh.lineTo(-0.17, -0.13); sh.lineTo(0.17, -0.13); sh.closePath(); return new T.ShapeGeometry(sh); })();
    function lamp(x, y, col, kind, grp, ph) {
      var mat = new T.MeshBasicMaterial({ color: col });
      var m = new T.Mesh(kind === 'arrow' ? arrowGeo : dotGeo, mat);
      m.rotation.x = -Math.PI / 2; m.position.copy(P(x, y, 0.03)); scene.add(m);
      var o = { mat: mat, base: new T.Color(col), grp: grp, ph: ph, idx: 0, ref: null, x: x, y: y, kind: kind };
      lamps.push(o); return o;
    }
    var RY = cfg.ringY || 11.6;
    for (i = 0; i < 16; i++) lamp(CX + 3.35 * Math.cos(i / 16 * 6.283), RY + 3.35 * Math.sin(i / 16 * 6.283), C.bumper[i % C.bumper.length], 'dot', 'ring', i / 16);
    for (i = 0; i < 11; i++) { var aa = (18 + i * 14.4) * Math.PI / 180; lamp(4.45 * Math.cos(aa), 13 + 4.45 * Math.sin(aa), i % 2 ? C.roll : C.accent, 'dot', 'arch', i / 11); }
    for (i = 0; i < 5; i++) { var la = lamp(CX, 3.4 + i * 0.48, C.accent, 'arrow', 'ladder', i / 5); la.idx = i; }
    targets.forEach(function (t, n) { var lt = t.free ? lamp(t.x, t.y - 0.6, C.target, 'arrow', 'target', n / 6) : lamp(t.x + (t.left ? 0.78 : -0.78), t.y - 0.35, C.target, 'dot', 'target', n / 6); lt.ref = t; });
    [[-4.45, 5.7], [2 * CX + 4.45, 5.7], [-4.45, 6.5], [2 * CX + 4.45, 6.5]].forEach(function (q, n) { lamp(q[0], q[1], C.sling, 'arrow', 'ring', n / 4); });
    if (floorG) (function () {
      var g = floorG, S = floorW / 10.6;
      function fx(x) { return (x + 5.3) / 10.6 * floorW; } function fy(y) { return (18.3 - y) / 18.6 * floorH; }
      lamps.forEach(function (L) {
        g.save(); g.translate(fx(L.x), fy(L.y)); g.lineJoin = 'round';
        g.beginPath();
        if (L.kind === 'arrow') { g.moveTo(0, -0.27 * S); g.lineTo(0.24 * S, 0.19 * S); g.lineTo(-0.24 * S, 0.19 * S); g.closePath(); }
        else g.arc(0, 0, 0.215 * S, 0, 6.2832);
        g.fillStyle = 'rgba(0,0,0,.55)'; g.fill();
        g.lineWidth = 0.035 * S; g.strokeStyle = C.insert || 'rgba(255,255,255,.55)'; g.stroke();
        g.restore();
      });
      floorTex.needsUpdate = true;
    })();
    var lampMin = cfg.matte ? 0.5 : 0.2;
    function pulse(t) { var v = Math.sin(t * 6.283); return v > 0 ? v * v * v : 0; }

    // かざりのポスト
    var postGeo = new T.CylinderGeometry(0.1, 0.1, 0.62, 14), capGeo = new T.SphereGeometry(0.135, 14, 10), postMat = std(0xffffff, 0xffffff, 0.12, 0.3, 0.6);
    if (envTex) { postMat.envMap = envTex; postMat.metalness = 0.9; postMat.roughness = 0.2; }
    function post(x, y, col) {
      var m = new T.Mesh(postGeo, postMat); m.position.copy(P(x, y, 0.31)); procGrp.add(m);
      var c = new T.Mesh(capGeo, std(col, col, 0.9, 0.3)); c.position.copy(P(x, y, 0.66)); procGrp.add(c);
    }
    [[-3.9, 7.0], [-3.9, 4.9], [-2.6, 3.9]].forEach(function (q) { post(q[0], q[1], C.sling); post(2 * CX - q[0], q[1], C.sling); });
    (cfg.walls || []).forEach(function (w) { post(w[2], w[3], C.roll); });

    // くるくる回る板（スピナー）
    var SPX = -4.45, SPY = 7.7, spin = null, spinA = 0, spinV = 0, spinAcc = 0;
    if (!cfg.noSpinner) {
      spin = new T.Mesh(new T.BoxGeometry(0.84, 0.5, 0.05), std(C.accent, C.accent, 0.5, 0.3, 0.3));
      spin.position.copy(P(SPX, SPY, 0.5)); procGrp.add(spin);
      [SPX - 0.47, SPX + 0.47].forEach(function (x) { var m = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.8, 8), postMat); m.position.copy(P(x, SPY, 0.4)); procGrp.add(m); });
    }

    // 奥の表示板
    var bgCv = document.createElement('canvas'); bgCv.width = 768; bgCv.height = 256;
    var bgG = bgCv.getContext('2d'), bgTex = new T.CanvasTexture(bgCv);
    var dmdCv = document.createElement('canvas'); dmdCv.width = 172; dmdCv.height = 28;
    var dmdG = dmdCv.getContext('2d'), dotsCv = document.createElement('canvas'); dotsCv.width = 688; dotsCv.height = 112;
    var dotsG = dotsCv.getContext('2d');
    var dmdMsg = '', dmdShown = null, dmdHold = 0, bgTick = 0, bgAcc = 1, idleI = 0, idleT = 0, bulbs = [];
    for (i = 0; i < 25; i++) { bulbs.push([24 + i * 30, 10]); }
    for (i = 0; i < 8; i++) { bulbs.push([758, 28 + i * 28.5]); }
    for (i = 24; i >= 0; i--) { bulbs.push([24 + i * 30, 246]); }
    for (i = 7; i >= 0; i--) { bulbs.push([10, 28 + i * 28.5]); }
    function renderDmd(txt) {
      var w, f;
      dotsG.clearRect(0, 0, 688, 112);
      if (cfg.dmd === false) {
        f = 64; dotsG.textAlign = 'center'; dotsG.textBaseline = 'middle'; dotsG.font = '700 ' + f + 'px ' + cfg.floorFont;
        w = dotsG.measureText(txt).width; if (w > 650) { f = Math.floor(f * 650 / w); dotsG.font = '700 ' + f + 'px ' + cfg.floorFont; }
        dotsG.fillStyle = C.dmd; dotsG.fillText(txt, 344, 58); return;
      }
      dmdG.clearRect(0, 0, 172, 28); dmdG.fillStyle = '#fff'; dmdG.textAlign = 'center'; dmdG.textBaseline = 'middle';
      f = 23; dmdG.font = '700 ' + f + 'px ' + cfg.floorFont;
      w = dmdG.measureText(txt).width; if (w > 164) { f = Math.floor(f * 164 / w); dmdG.font = '700 ' + f + 'px ' + cfg.floorFont; }
      dmdG.fillText(txt, 86, 15);
      var d = dmdG.getImageData(0, 0, 172, 28).data, x, y;
      dotsG.fillStyle = C.dmdOff;
      for (y = 0; y < 28; y++) for (x = 0; x < 172; x++) dotsG.fillRect(x * 4, y * 4, 3, 3);
      dotsG.fillStyle = C.dmd;
      for (y = 0; y < 28; y++) for (x = 0; x < 172; x++) if (d[(y * 172 + x) * 4 + 3] > 96) dotsG.fillRect(x * 4, y * 4, 3, 3);
    }
    var backArt = null;
    if (window.PB_ART && window.PB_ART.back[cfg.art]) {
      backArt = document.createElement('canvas'); backArt.width = 768; backArt.height = 256;
      var bag = backArt.getContext('2d'); bag.save(); bag.beginPath(); bag.rect(20, 20, 728, 84); bag.clip(); window.PB_ART.back[cfg.art](bag, C, cfg); bag.restore();
    }
    function drawBG() {
      var g = bgG, k, on;
      g.fillStyle = C.cabinet; g.fillRect(0, 0, 768, 256);
      g.fillStyle = C.glass; g.fillRect(20, 20, 728, 216);
      if (backArt) g.drawImage(backArt, 0, 0);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '700 46px ' + cfg.floorFont; g.lineJoin = 'round';
      if (backArt) { g.lineWidth = 9; g.strokeStyle = C.plateEdge || C.glass; g.strokeText(cfg.plainName, 384, 64); }
      g.shadowColor = C.floorText; g.shadowBlur = cfg.matte ? 0 : 16; g.fillStyle = C.plate || C.floorText; g.fillText(cfg.plainName, 384, 64); g.shadowBlur = 0;
      g.fillStyle = C.dmdBack || '#000000'; g.fillRect(34, 104, 700, 124);
      g.drawImage(dotsCv, 40, 110);
      for (k = 0; k < bulbs.length; k++) {
        on = flashAll > 0 ? (bgTick + k) % 2 === 0 : (k + bgTick) % 3 === 0;
        g.fillStyle = on ? C.bulb : C.bulbOff; g.beginPath(); g.arc(bulbs[k][0], bulbs[k][1], on ? 6 : 4.5, 0, 6.283); g.fill();
      }
      bgTex.needsUpdate = true;
    }
    var bgGrp = new T.Group(); bgGrp.position.set(0, 2.45, -19.7); bgGrp.rotation.x = -0.55; scene.add(bgGrp);
    var bgFrame = new T.Mesh(new T.BoxGeometry(11.5, 4.1, 0.5), std(C.cabinet, C.wallEm, 0.1, 0.7)); bgFrame.position.z = -0.27; bgGrp.add(bgFrame);
    bgGrp.add(new T.Mesh(new T.PlaneGeometry(11.1, 3.7), new T.MeshBasicMaterial({ map: bgTex })));
    var bgLeg = new T.Mesh(new T.BoxGeometry(11.5, 1.6, 0.6), std(C.cabinet, C.wallEm, 0.1, 0.7)); bgLeg.position.set(0, 0.1, -19.1); procGrp.add(bgLeg);

    var camBase = new T.Vector3(), camF = new T.Vector3();
    function fxFrame(dt) {
      var k, j, lv, L, b, q;
      // 火花
      for (k = 0; k < PN; k++) {
        if (pLife[k] <= 0) continue;
        pLife[k] -= dt; j = k * 3;
        if (pLife[k] <= 0) { pPos[j + 1] = -99; continue; }
        pPos[j] += pVel[j] * dt; pPos[j + 1] += pVel[j + 1] * dt; pPos[j + 2] += pVel[j + 2] * dt;
        if (pGrav[k]) { pVel[j + 1] -= 12 * dt; if (pPos[j + 1] < 0.06) { pPos[j + 1] = 0.06; pVel[j + 1] *= -0.4; } }
        lv = cfg.matte ? 1 : pLife[k] / pMax[k];
        pCol[j] = pBase[j] * lv; pCol[j + 1] = pBase[j + 1] * lv; pCol[j + 2] = pBase[j + 2] * lv;
      }
      // ボールの尾
      if (state === 'play') for (k = 0; k < balls.length; k++) {
        b = balls[k];
        if (b.lx != null && b.vx * b.vx + b.vy * b.vy > 36 && Math.abs(b.x - b.lx) + Math.abs(b.y - b.ly) < 3) {
          tmpC.set(fever > 0 ? 0xffffff : C.trail); if (fever > 0) tmpC.setHSL((time * 1.5) % 1, 1, 0.6);
          for (q = 0; q < 3; q++) emit(b.lx + (b.x - b.lx) * q / 3, R, -(b.ly + (b.y - b.ly) * q / 3), 0, 0, 0, cfg.matte ? 0.1 : 0.3, tmpC, false);
        }
        b.lx = b.x; b.ly = b.y;
      }
      pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
      // 輪
      for (k = 0; k < rings.length; k++) {
        L = rings[k]; if (L.t >= 1) continue;
        L.t += dt / 0.45; lv = 0.5 + L.t * 2.8; L.m.scale.set(lv, lv, 1); L.m.material.opacity = Math.max(0, 1 - L.t) * 0.9;
        if (L.t >= 1) L.m.visible = false;
      }
      // ランプ
      if (flashAll > 0) flashAll -= dt;
      var sp = fever > 0 ? 3.2 : state === 'play' ? 0.55 : 0.9;
      for (k = 0; k < lamps.length; k++) {
        L = lamps[k];
        if (flashAll > 0) lv = Math.sin(time * 38 + k) > 0 ? 1 : 0.12;
        else if (L.grp === 'target') lv = L.ref.lit ? 1 : 0.1 + 0.08 * Math.sin(time * 2 + k);
        else if (L.grp === 'ladder') lv = L.idx < mult - 1 ? 1 : 0.08 + 0.92 * pulse(time * 1.4 - L.ph);
        else lv = 0.09 + 0.91 * pulse(time * sp - L.ph * (L.grp === 'arch' ? 1 : 2));
        if (fever > 0 && L.grp !== 'target') tmpC.setHSL((time * 0.9 + L.ph) % 1, 1, 0.55); else tmpC.copy(L.base);
        L.mat.color.copy(tmpC).multiplyScalar(lampMin + (1 - lampMin) * lv);
      }
      // フィーバー中は照明の色がぐるぐる変わる
      if (fever > 0 && state === 'play') {
        l1.color.setHSL((time * 0.6) % 1, 1, 0.55); l2.color.setHSL((time * 0.6 + 0.5) % 1, 1, 0.55);
        if (bloom) bloom.strength = bloomBase * 1.45; lightsDirty = true;
      } else if (lightsDirty) { l1.color.set(C.light1); l2.color.set(C.light2); if (bloom) bloom.strength = bloomBase; lightsDirty = false; }
      if (spin) spin.rotation.x = spinA;
      // カメラのゆれと、ボールを少し追う動き
      shakeAmt = Math.max(0, shakeAmt - dt * 3.5);
      var fx = 0, fz = 0;
      if (!reduce && state === 'play' && balls.length) { fx = balls[0].x * 0.05; fz = (balls[0].y - 9) * 0.03; }
      camF.x += (fx - camF.x) * Math.min(1, dt * 3); camF.z += (fz - camF.z) * Math.min(1, dt * 3);
      var tk = Math.min(1, dt * 8);
      tilt.x += ((tilt.on ? tilt.tx : 0) - tilt.x) * tk; tilt.y += ((tilt.on ? tilt.ty : 0) - tilt.y) * tk;
      camera.position.set(camBase.x + camF.x + tilt.x * 3.6 + (Math.random() - 0.5) * shakeAmt * 0.22, camBase.y - tilt.y * 3 + (Math.random() - 0.5) * shakeAmt * 0.22, camBase.z - camF.z + tilt.y * 2.2);
      camera.lookAt(target.x + camF.x * 1.3, 0, target.z - camF.z * 1.3);
      // 表示板
      dmdHold -= dt;
      if (dmdHold <= 0) {
        idleT -= dt;
        if (idleT <= 0) {
          idleT = 2.2; idleI++;
          var list = state === 'play' ? ['ボール ' + ballsLeft, 'ばいりつ ×' + mult, fmt(score) + ' てん']
            : state === 'over' ? ['ゲームオーバー', fmt(score) + ' てん'] : [cfg.dmdName || cfg.plainName, 'スタートを おしてね', 'ハイスコア ' + fmt(hi)];
          dmdMsg = list[idleI % list.length];
        }
      }
      bgAcc += dt;
      if (bgAcc > 0.09) { bgAcc = 0; bgTick++; if (dmdMsg !== dmdShown) { renderDmd(dmdMsg); dmdShown = dmdMsg; } drawBG(); }
    }

    /* ---------- ボール ---------- */
    var ballGeo = new T.SphereGeometry(R, 28, 20);
    var ballMat = envTex
      ? new T.MeshStandardMaterial({ color: C.ball, metalness: 1, roughness: 0.1, envMap: envTex, envMapIntensity: 1.5, emissive: C.ballEm, emissiveIntensity: 0.1 })
      : new T.MeshPhongMaterial({ color: C.ball, specular: 0xffffff, shininess: 120, emissive: C.ballEm, emissiveIntensity: 0.25 });
    var shGeo = new T.CircleGeometry(R * 1.15, 20);
    var shMat = new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38 });
    var balls = [];
    function addBall(x, y, vx, vy) {
      var m = new T.Mesh(ballGeo, ballMat); scene.add(m);
      var s = new T.Mesh(shGeo, shMat); s.rotation.x = -Math.PI / 2; scene.add(s);
      var b = { x: x, y: y, vx: vx || 0, vy: vy || 0, m: m, s: s, warpCd: 0, still: 0 };
      balls.push(b); return b;
    }
    function removeBall(k) { var b = balls[k]; scene.remove(b.m); scene.remove(b.s); balls.splice(k, 1); }
    function laneBall() { addBall(4.6, 0.6 + 0.08 + R + 0.02, 0, 0); tilted = false; nudges.length = 0; }

    /* ---------- 音 ---------- */
    var AC = null, muted = false;
    function beep(f, d, type, vol, slide) {
      if (!AC || muted) return;
      try {
        var o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
        if (cfg.bell && type === 'square') { type = 'sine'; d = d * 5; f = f * 2; slide = 0; vol = (vol || 0.08) * 1.6; }
        o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
        if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
        g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
      } catch (e) { /* 音が出せなくても遊べる */ }
    }
    muteBtn.addEventListener('click', function () { muted = !muted; muteBtn.textContent = muted ? '音 オフ' : '音 オン'; });

    /* ---------- ゲームの状態 ---------- */
    var state = 'title', score = 0, mult = 1, ballsLeft = 3, saveT = 0, hi = 0, toastT = 0, charge = 0, plungeOn = false;
    try { hi = +localStorage.getItem(cfg.key) || 0; } catch (e) { hi = 0; }
    function showScore() {
      if (!cfg.reel) { scoreEl.textContent = fmt(score); return; }
      var d = String(Math.floor(score)); while (d.length < 6) d = '0' + d;
      scoreEl.innerHTML = d.split('').map(function (c) { return '<span>' + c + '</span>'; }).join('');
      scoreEl.setAttribute('aria-label', fmt(score));
    }
    function fmt(n) { return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
    function refreshHud() {
      showScore();
      var s = '', k; for (k = 0; k < 3; k++) s += k < ballsLeft ? '●' : '○';
      ballsEl.textContent = s; ballsEl.setAttribute('aria-label', 'のこりボール ' + ballsLeft);
      multEl.textContent = '×' + mult;
      hiEl.textContent = 'ハイスコア ' + fmt(hi);
    }
    function say(t) { toast.textContent = t; toast.classList.add('on'); toastT = 1.6; dmdMsg = t.replace('！', '!'); dmdHold = 2.2; idleT = 0; }
    function add(n) { var v = n * mult * (fever > 0 ? 2 : 1); score += v; showScore(); return v; }
    function flashAt(x, y, col, pow) { flash.color.set(col); flash.position.copy(P(x, y, 1.1)); flash.intensity = pow || 2.2; }

    function startGame() {
      if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
      if (AC && AC.state === 'suspended') AC.resume();
      while (balls.length) removeBall(0);
      score = 0; mult = 1; ballsLeft = 3; saveT = 0; charge = 0; plungeOn = false;
      targets.forEach(function (t) { t.lit = false; });
      rolls.forEach(function (r) { r.lit = false; });
      state = 'play'; over.hidden = true; laneBall(); refreshHud();
      fever = 0; multEl.classList.remove('fever'); flashAll = 1; idleT = 0; dmdHold = 0; spinV = 0; bankT = 0;
      holes.forEach(function (h) { h.ball = null; h.cd = 0; });
      beep(440, 0.12, 'triangle', 0.1, 880);
    }
    function gameOver() {
      state = 'over'; fever = 0; multEl.classList.remove('fever'); idleT = 0; dmdHold = 0;
      if (score > hi) { hi = score; try { localStorage.setItem(cfg.key, String(hi)); } catch (e) { /* 保存できなくてもよい */ } }
      finalEl.hidden = false; finalEl.textContent = 'スコア ' + fmt(score) + (score >= hi && score > 0 ? '　ハイスコア！' : '');
      startBtn.textContent = 'もう一度'; over.hidden = false; refreshHud();
      beep(330, 0.5, 'sawtooth', 0.08, 80);
    }
    startBtn.addEventListener('click', function () { askMotion(); startGame(); });

    /* ---------- 当たり判定 ---------- */
    var hnx = 0, hny = 0, ht = 0, himp = 0;
    function segHit(b, ax, ay, bx, by, cr, e, w, pcx, pcy, oneWay) {
      var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      var t = ((b.x - ax) * dx + (b.y - ay) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      var px = ax + dx * t, py = ay + dy * t, nx = b.x - px, ny = b.y - py, d2 = nx * nx + ny * ny, rr = R + cr;
      if (d2 >= rr * rr) return false;
      if (oneWay && dx * (b.y - ay) - dy * (b.x - ax) <= 0) return false;
      var d = Math.sqrt(d2);
      if (d < 1e-6) { d = Math.sqrt(l2); nx = -dy / d; ny = dx / d; } else { nx /= d; ny /= d; }
      b.x = px + nx * rr; b.y = py + ny * rr;
      var svx = 0, svy = 0;
      if (w) { svx = -w * (py - pcy); svy = w * (px - pcx); }
      var vn = (b.vx - svx) * nx + (b.vy - svy) * ny;
      himp = 0;
      if (vn < 0) { var ee = vn > -1.2 ? 0 : e; b.vx -= (1 + ee) * vn * nx; b.vy -= (1 + ee) * vn * ny; himp = -vn; }
      hnx = nx; hny = ny; ht = t; return true;
    }

    var bankT = 0;
    function bankDone() {
      bankT = 1.1; flashAll = 1.6; shake(0.9); pop(CX, 9.2, add(5000)); say('ジャックポット！');
      ring(CX, 8, C.target); spark(CX, 8, C.target, 50, 10);
      beep(523, 0.1, 'square', 0.09); setTimeout(function () { beep(659, 0.1, 'square', 0.09); }, 100); setTimeout(function () { beep(784, 0.1, 'square', 0.09); }, 200); setTimeout(function () { beep(1047, 0.25, 'square', 0.09); }, 300);
    }
    function targetsDone() {
      flashAll = 1.5; shake(0.8); ring(CX, RY, C.target); spark(CX, RY, C.target, 40, 9);
      targets.forEach(function (t) { if (t.grp === 'side') t.lit = false; });
      if (cfg.targetReward === 'multiball') {
        say('マルチボール！');
        addBall(CX - 1.5, 16.6, 2, -2); addBall(CX + 1.5, 16.6, -2, -2);
        add(1000); saveT = Math.max(saveT, 6);
      } else { say('ボーナス +' + fmt(3000 * mult)); add(3000); }
      beep(523, 0.1, 'square', 0.09); setTimeout(function () { beep(784, 0.12, 'square', 0.09); }, 110); setTimeout(function () { beep(1047, 0.2, 'square', 0.09); }, 230);
    }

    function step() {
      var k, n, b, f, s, dx, dy, d, g = cfg.gravity;
      for (k = 0; k < 2; k++) {
        f = flippers[k];
        var goal = f.on ? f.up : f.rest, sp = f.on ? 26 : 14, old = f.a, dir = goal > f.a ? 1 : -1;
        if (Math.abs(goal - f.a) <= sp * H) f.a = goal; else f.a += dir * sp * H;
        f.w = (f.a - old) / H;
        f.tx = f.px + Math.cos(f.a) * f.len; f.ty = f.py + Math.sin(f.a) * f.len;
      }
      for (k = 0; k < rotors.length; k++) {
        s = rotors[k]; s.a += s.w * H;
        s.ux = Math.cos(s.a) * s.half; s.uy = Math.sin(s.a) * s.half;
      }
      for (n = balls.length - 1; n >= 0; n--) {
        b = balls[n];
        if (b.hold) continue;
        b.vy -= g * H;
        var py0 = b.y;
        b.x += b.vx * H; b.y += b.vy * H;
        if (spin && b.x < -3.95 && (py0 - SPY) * (b.y - SPY) < 0) spinV = b.vy * 2.4;
        for (k = 0; k < segs.length; k++) {
          s = segs[k];
          if (s.type === 'target' && s.ref.lit) continue;
          if (!segHit(b, s.ax, s.ay, s.bx, s.by, s.r, s.e, 0, 0, 0, s.oneWay)) continue;
          if (s.type === 'sling') {
            if (himp > 1.5 && ht > 0.12 && ht < 0.88) {
              b.vx += hnx * 11; b.vy += hny * 11; s.ref.glow = 1; add(30);
              spark(b.x, b.y, C.sling, 8, 5); shake(0.25);
              flashAt(b.x, b.y, C.sling, 1.6); beep(220, 0.07, 'square', 0.07, 440);
            }
          } else if (s.type === 'target') {
            if (himp > 1.5) {
              pop(b.x, b.y, add(250)); flashAt(b.x, b.y, C.target, 2); spark(b.x, b.y, C.target, 12, 5);
              if (!s.ref.lit) {
                s.ref.lit = true; beep(660, 0.1, 'triangle', 0.1, 990); beep(150, 0.06, 'sawtooth', 0.07, 70);
                var tg = s.ref.grp;
                if (targets.every(function (t) { return t.grp !== tg || t.lit; })) { if (tg === 'bank') bankDone(); else targetsDone(); }
              } else beep(500, 0.05, 'triangle', 0.07);
            }
          } else if (s.type === 'bar') {
            if (himp > 2) { b.vx += hnx * 4; b.vy += hny * 4; add(20); spark(b.x, b.y, '#ffffff', 5, 3); beep(260, 0.05, 'triangle', 0.06, 380); }
          } else if (himp > 9) { beep(140, 0.04, 'sine', 0.05); if (himp > 16) spark(b.x, b.y, '#ffffff', 4, 3); }
        }
        for (k = 0; k < bumpers.length; k++) {
          s = bumpers[k]; dx = b.x - s.x; dy = b.y - s.y; d = dx * dx + dy * dy;
          var rr = R + s.r;
          if (d < rr * rr) {
            d = Math.sqrt(d) || 1e-6; dx /= d; dy /= d;
            b.x = s.x + dx * rr; b.y = s.y + dy * rr;
            var vn = b.vx * dx + b.vy * dy;
            b.vx += (s.kick - vn) * dx; b.vy += (s.kick - vn) * dy;
            s.glow = 1; pop(s.x, s.y, add(s.score)); flashAt(s.x, s.y, s.col, 2.6);
            spark(s.x, s.y, s.col, 14, 6); ring(s.x, s.y, s.col); shake(0.4);
            beep(300 + k * 70, 0.09, 'square', 0.08, 700 + k * 90);
          }
        }
        for (k = 0; k < pegs.length; k++) {
          s = pegs[k]; dx = b.x - s.x; dy = b.y - s.y; d = dx * dx + dy * dy;
          if (d < 0.1681) {
            d = Math.sqrt(d) || 1e-6; dx /= d; dy /= d; b.x = s.x + dx * 0.41; b.y = s.y + dy * 0.41;
            var pv = b.vx * dx + b.vy * dy;
            if (pv < 0) { b.vx -= 1.75 * pv * dx; b.vy -= 1.75 * pv * dy; if (pv < -2) { add(10); beep(700, 0.03, 'triangle', 0.05); spark(b.x, b.y, C.accent, 3, 2); } }
          }
        }
        for (k = 0; k < rotors.length; k++) {
          s = rotors[k];
          if (segHit(b, s.x - s.ux, s.y - s.uy, s.x + s.ux, s.y + s.uy, 0.15, 0.5, s.w, s.x, s.y, false) && himp > 2 && s.cd <= 0) {
            s.cd = 0.25; add(20); beep(180, 0.05, 'triangle', 0.06);
          }
        }
        for (k = 0; k < 2; k++) {
          f = flippers[k];
          if (segHit(b, f.px, f.py, f.tx, f.ty, 0.2, 0.25, f.w, f.px, f.py, false) && himp > 12) beep(110, 0.04, 'sine', 0.06);
        }
        for (k = 0; k < n; k++) {  // ボールどうし
          s = balls[k]; dx = b.x - s.x; dy = b.y - s.y; d = dx * dx + dy * dy;
          if (d < 4 * R * R && d > 1e-9) {
            d = Math.sqrt(d); dx /= d; dy /= d;
            var push = (2 * R - d) / 2; b.x += dx * push; b.y += dy * push; s.x -= dx * push; s.y -= dy * push;
            var rv = (b.vx - s.vx) * dx + (b.vy - s.vy) * dy;
            if (rv < 0) { b.vx -= rv * dx; b.vy -= rv * dy; s.vx += rv * dx; s.vy += rv * dy; }
          }
        }
        var v2 = b.vx * b.vx + b.vy * b.vy;
        if (v2 > MAXV * MAXV) { d = MAXV / Math.sqrt(v2); b.vx *= d; b.vy *= d; }
        if (b.y < -0.8 || b.y > 19 || b.x < -6 || b.x > 6) removeBall(n);
      }
    }

    function slow(dt) {
      var k, n, b, s, dx, dy;
      if (fever > 0) {
        fever -= dt; feverBeat -= dt;
        if (feverBeat <= 0) { feverBeat = 0.14; beep([523, 659, 784, 1047, 784, 659][feverNote++ % 6], 0.08, 'triangle', 0.035); }
        if (fever <= 0) { multEl.textContent = '×' + mult; multEl.classList.remove('fever'); say('フィーバー おわり'); }
      }
      if (spin) {
        if (spinV !== 0) {
          spinA += spinV * dt; spinAcc += Math.abs(spinV) * dt; spinV *= Math.exp(-1.3 * dt);
          while (spinAcc > Math.PI) { spinAcc -= Math.PI; add(10); beep(1200, 0.025, 'triangle', 0.04); spark(SPX, SPY, C.accent, 2, 2); }
          if (Math.abs(spinV) < 1.2) spinV = 0;
        } else { var rest = Math.round(spinA / Math.PI) * Math.PI; spinA += (rest - spinA) * Math.min(1, dt * 8); }
      }
      for (n = 0; n < balls.length; n++) {
        b = balls[n];
        if (b.hold) { b.x = b.hold.x; b.y = b.hold.y; b.vx = b.vy = 0; continue; }
        for (k = 0; k < holes.length; k++) {
          s = holes[k]; dx = b.x - s.x; dy = b.y - s.y;
          if (s.cd <= 0 && !s.ball && dx * dx + dy * dy < 0.1 && b.vx * b.vx + b.vy * b.vy < 700) {
            b.hold = s; s.ball = b; s.t = 1.0; b.x = s.x; b.y = s.y; b.vx = b.vy = 0;
            pop(s.x, s.y, add(1000)); say('ホールイン！'); flashAll = 0.7; ring(s.x, s.y, C.accent); flashAt(s.x, s.y, C.accent, 3);
            beep(392, 0.09, 'square', 0.08); setTimeout(function () { beep(587, 0.09, 'square', 0.08); }, 90); setTimeout(function () { beep(880, 0.18, 'square', 0.08); }, 180);
            break;
          }
        }
        if (b.hold) continue;
        b.warpCd -= dt;
        for (k = 0; k < rolls.length; k++) {
          s = rolls[k]; dx = b.x - s.x; dy = b.y - s.y;
          if (s.cd <= 0 && dx * dx + dy * dy < 0.2) {
            s.cd = 0.6; pop(s.x, s.y, add(150)); spark(s.x, s.y, C.roll, 6, 3);
            if (!s.lit) {
              s.lit = true; beep(880, 0.08, 'sine', 0.1);
              if (rolls.every(function (r) { return r.lit; })) {
                rolls.forEach(function (r) { r.lit = false; });
                if (mult < 6) mult++;
                multEl.textContent = '×' + mult + ' フィーバー'; multEl.classList.add('fever'); say('フィーバー！ ×' + mult);
                fever = 12; flashAll = 1.2; shake(0.6); ring(CX, RY, C.roll); spark(CX, 15.3, C.roll, 30, 8);
                beep(660, 0.1, 'square', 0.08, 1320);
              }
            }
          }
        }
        for (k = 0; k < warps.length; k++) {
          s = warps[k]; dx = b.x - s.x; dy = b.y - s.y;
          if (b.warpCd <= 0 && dx * dx + dy * dy < 0.16) {
            b.x = s.tx; b.y = s.ty; b.vx = s.vx; b.vy = s.vy; b.warpCd = 1;
            pop(s.tx, s.ty, add(500)); say('ワープ！'); flashAt(s.tx, s.ty, C.warp, 3);
            ring(s.x, s.y, C.warp); ring(s.tx, s.ty, C.warpOut); spark(s.tx, s.ty, C.warp, 24, 7); shake(0.5);
            beep(200, 0.3, 'sawtooth', 0.07, 1600);
          }
        }
        // 止まってしまったボールを軽く押す
        var inLane = b.x > LANE_X && b.y < 13;
        if (!inLane && b.vx * b.vx + b.vy * b.vy < 0.02) { b.still += dt; if (b.still > 2.5) { b.vx = (Math.random() - 0.5) * 6; b.vy = 5; b.still = 0; } } else b.still = 0;
      }
      for (k = 0; k < holes.length; k++) {
        s = holes[k]; s.cd -= dt;
        if (s.ball) {
          s.t -= dt;
          if (s.t <= 0) {
            b = s.ball; b.hold = null; s.ball = null; s.cd = 1;
            b.vx = s.vx + (Math.random() - 0.5) * 3; b.vy = s.vy;
            spark(s.x, s.y, C.accent, 18, 6); ring(s.x, s.y, '#ffffff'); shake(0.4); beep(160, 0.15, 'sawtooth', 0.08, 600);
          }
        }
      }
      if (bankT > 0) { bankT -= dt; if (bankT <= 0) { targets.forEach(function (t) { if (t.grp === 'bank') t.lit = false; }); beep(180, 0.08, 'sawtooth', 0.07, 320); } }
      for (k = 0; k < rolls.length; k++) rolls[k].cd -= dt;
      for (k = 0; k < rotors.length; k++) rotors[k].cd -= dt;
      if (saveT > 0) saveT -= dt;
      nudgeCd -= dt;
      // 発射
      var lb = null;
      for (n = 0; n < balls.length; n++) { b = balls[n]; if (b.x > LANE_X && b.y < 1.6 && Math.abs(b.vy) < 1.5) lb = b; }
      chargeBox.hidden = !lb;
      if (lb) {
        if (plungeOn) charge = Math.min(1, charge + dt / 0.9);
        else if (charge > 0) {
          lb.vy = 28 + 14 * charge; lb.vx = 0; charge = 0; saveT = 6;
          spark(4.6, 1.3, C.accent, 16, 4); shake(0.3);
          beep(120, 0.25, 'sawtooth', 0.09, 520);
        }
      } else charge = 0;
      chargeBar.style.width = Math.round(charge * 100) + '%';
      // ボールがなくなった
      if (!balls.length) {
        if (saveT > 0) { say('ボールセーブ！'); saveT = 0; laneBall(); }
        else {
          ballsLeft--; refreshHud(); shake(0.7); flashAt(CX, 1.6, '#ff2020', 3);
          if (ballsLeft <= 0) gameOver(); else { laneBall(); beep(260, 0.3, 'triangle', 0.08, 130); }
        }
      }
    }

    /* ---------- 入力 ---------- */
    var LK = { ArrowLeft: 1, KeyZ: 1, KeyA: 1, ShiftLeft: 1 }, RK = { ArrowRight: 1, KeyM: 1, Slash: 1, KeyL: 1, ShiftRight: 1 }, PK = { Space: 1, ArrowDown: 1 };
    function flip(side, on) {
      var f = flippers[side];
      if (on && tilted) return;
      if (on && !f.on && state === 'play') beep(side ? 95 : 85, 0.05, 'square', 0.05);
      f.on = on;
    }
    window.addEventListener('keydown', function (e) {
      if (state !== 'play') { if ((e.code === 'Enter' || e.code === 'Space') && document.activeElement !== startBtn && document.activeElement !== muteBtn) { e.preventDefault(); startGame(); } return; }
      if (LK[e.code]) { flip(0, true); e.preventDefault(); }
      else if (RK[e.code]) { flip(1, true); e.preventDefault(); }
      else if (PK[e.code]) { plungeOn = true; e.preventDefault(); }
      else if (e.code === 'ArrowUp' || e.code === 'KeyX') { nudge(Math.random() < 0.5 ? -1 : 1); e.preventDefault(); }
    });
    window.addEventListener('keyup', function (e) {
      if (LK[e.code]) flip(0, false); else if (RK[e.code]) flip(1, false); else if (PK[e.code]) plungeOn = false;
    });
    var ptrs = {};
    var cvs = renderer.domElement;
    cvs.addEventListener('pointerdown', function (e) {
      if (state !== 'play') return;
      e.preventDefault();
      var side = e.clientX < root.clientWidth / 2 ? 0 : 1;
      ptrs[e.pointerId] = side; flip(side, true);
      if (side === 1) plungeOn = true;
      try { cvs.setPointerCapture(e.pointerId); } catch (err) { /* 古いブラウザー */ }
    });
    function up(e) {
      var side = ptrs[e.pointerId]; if (side == null) return;
      delete ptrs[e.pointerId];
      var still = false, id; for (id in ptrs) if (ptrs[id] === side) still = true;
      if (!still) { flip(side, false); if (side === 1) plungeOn = false; }
    }
    cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', up);
    cvs.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('blur', function () { flip(0, false); flip(1, false); plungeOn = false; ptrs = {}; });

    /* ---------- 傾きセンサー：のぞきこみ視点と台ゆらし ---------- */
    var tilt = { on: false, seen: false, bx: null, by: null, tx: 0, ty: 0, x: 0, y: 0 }, tilted = false, nudges = [], nudgeCd = 0, listening = false;
    function nudge(dir) {
      if (state !== 'play' || nudgeCd > 0 || tilted) return;
      nudgeCd = 0.35; shake(0.8); beep(90, 0.08, 'sawtooth', 0.09, 50);
      balls.forEach(function (b) { if (!b.hold && !(b.x > LANE_X && b.y < 13)) { b.vx += dir * 3.2; b.vy += 2.2; } });
      nudges.push(time); while (nudges.length && time - nudges[0] > 4) nudges.shift();
      if (nudges.length >= 4) {   // ゆらしすぎ
        tilted = true; flippers[0].on = flippers[1].on = false; say('ティルト！'); flashAll = 0.8; flashAt(CX, 6, '#ff2020', 4);
        beep(220, 0.5, 'sawtooth', 0.1, 60);
      }
    }
    function onOrient(e) {
      if (e.beta == null || e.gamma == null) return;
      var ang = (screen.orientation && screen.orientation.angle) || 0, lr = e.gamma, fb = e.beta;
      if (ang === 90) { lr = e.beta; fb = -e.gamma; } else if (ang === 270) { lr = -e.beta; fb = e.gamma; }
      if (!tilt.seen) { tilt.seen = true; tilt.on = true; tiltBtn.hidden = false; }
      if (tilt.bx == null) { tilt.bx = lr; tilt.by = fb; }   // いまの持ち方を基準にする
      tilt.tx = Math.max(-1, Math.min(1, (lr - tilt.bx) / 22)); tilt.ty = Math.max(-1, Math.min(1, (fb - tilt.by) / 22));
    }
    function onMotion(e) {
      var a = e.acceleration; if (!a || a.x == null) return;
      if (Math.abs(a.x) > 9 || Math.abs(a.y) > 11) nudge(a.x >= 0 ? 1 : -1);
    }
    function listen() {
      if (listening) return; listening = true;
      window.addEventListener('deviceorientation', onOrient); window.addEventListener('devicemotion', onMotion);
    }
    function askMotion() {   // iPhone はボタンを押したときにだけ許可をたずねられる
      try {
        var O = window.DeviceOrientationEvent, Mo = window.DeviceMotionEvent;
        if (O && typeof O.requestPermission === 'function') O.requestPermission().catch(function () { /* 使えなくても遊べる */ });
        if (Mo && typeof Mo.requestPermission === 'function') Mo.requestPermission().catch(function () { /* 同上 */ });
      } catch (err) { /* 同上 */ }
      tilt.bx = null;
    }
    listen();   // 許可が無いあいだはイベントが来ないだけ
    tiltBtn.addEventListener('click', function () { tilt.on = !tilt.on; tilt.bx = null; tiltBtn.textContent = tilt.on ? '傾き オン' : '傾き オフ'; });

    /* ---------- カメラ ---------- */
    var target = new T.Vector3(0, 0, -8.7), tmp = new T.Vector3();
    var corners = [[-5.5, 0, 0.6], [5.5, 0, 0.6], [-5.9, 4.95, -21.3], [5.9, 4.95, -21.3], [-5.5, 0, -18.4], [5.5, 0, -18.4]];
    function fit() {
      var w = root.clientWidth || 1, h = root.clientHeight || 1;
      renderer.setSize(w, h, false); if (composer) composer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      var el = (w / h < 0.8 ? 60 : 52) * Math.PI / 180, top = 1 - 2 * 76 / h, bot = -0.96, d, k, it, lo, hi, mx, y0, y1;
      function look(dd, tz) {
        target.z = tz;
        camera.position.set(0, Math.sin(el) * dd, tz + Math.cos(el) * dd);
        camera.lookAt(target); camera.updateMatrixWorld();
        mx = 0; y0 = 9; y1 = -9;
        for (k = 0; k < corners.length; k++) {
          tmp.set(corners[k][0], corners[k][1], corners[k][2]).project(camera);
          mx = Math.max(mx, Math.abs(tmp.x)); y0 = Math.min(y0, tmp.y); y1 = Math.max(y1, tmp.y);
        }
      }
      for (d = 16; d < 160; d += 0.5) {
        camera.near = Math.max(2, d - 24); camera.far = d + 60; camera.updateProjectionMatrix();
        lo = -18; hi = -2;
        for (it = 0; it < 14; it++) { look(d, (lo + hi) / 2); if ((y0 + y1) / 2 > (top + bot) / 2) hi = (lo + hi) / 2; else lo = (lo + hi) / 2; }
        if (mx <= 0.95 && y1 <= top && y0 >= bot) break;
      }
      camBase.copy(camera.position);
    }
    window.addEventListener('resize', fit);
    if (window.ResizeObserver) new ResizeObserver(fit).observe(root);
    fit();

    /* ---------- 毎フレーム ---------- */
    var last = performance.now(), acc = 0, time = 0;
    function frame(now) {
      requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
      var k, s;
      if (state === 'play') {
        acc += dt; var steps = 0;
        while (acc >= H && steps < 40) { step(); acc -= H; steps++; }
        if (acc > H) acc = 0;
        slow(dt);
      } else {
        for (k = 0; k < rotors.length; k++) { s = rotors[k]; s.a += s.w * dt; }
      }
      for (k = 0; k < balls.length; k++) { s = balls[k]; s.m.position.set(s.x, s.hold ? R - 0.13 : R, -s.y); s.s.position.set(s.x + 0.06, 0.045, -s.y + 0.06); }
      for (k = 0; k < 2; k++) flippers[k].mesh.rotation.y = flippers[k].a;
      for (k = 0; k < rotors.length; k++) rotors[k].g.rotation.y = rotors[k].a;
      for (k = 0; k < bumpers.length; k++) {
        s = bumpers[k]; s.glow = Math.max(0, s.glow - dt * 4);
        s.mat.emissiveIntensity = 0.06 + s.glow * 0.9; s.side.emissiveIntensity = 0.15 + s.glow * 1.2; s.body.emissiveIntensity = 0.3 + s.glow * 1.6;
        s.ring.position.y = 0.42 - 0.3 * s.glow;
      }
      for (k = 0; k < slings.length; k++) { s = slings[k]; s.glow = Math.max(0, s.glow - dt * 5); s.mat.emissiveIntensity = 0.12 + s.glow * 1.4; }
      for (k = 0; k < targets.length; k++) { s = targets[k]; s.d += ((s.lit ? 1 : 0) - s.d) * Math.min(1, dt * 16); s.plate.position.y = 0.31 - 0.68 * s.d; }
      for (k = 0; k < rolls.length; k++) { s = rolls[k]; s.mat.opacity = s.lit ? 0.95 : 0.2 + 0.06 * Math.sin(time * 3 + k); }
      for (k = 0; k < warps.length; k++) { s = warps[k]; var p = 1 + 0.12 * Math.sin(time * 5 + k); s.ring.scale.set(p, p, 1); s.out.rotation.z = time * 2; }
      for (k = 0; k < holes.length; k++) { s = holes[k]; var hp = 1 + 0.1 * Math.sin(time * 6 + k); s.ring.scale.set(hp, hp, 1); s.ring.material.color.set(s.ball ? '#ffffff' : C.accent); }
      flash.intensity = Math.max(0, flash.intensity - dt * 9);
      plunger.position.set(4.6, 0.2, -(0.15 - charge * 0.45));
      if (toastT > 0) { toastT -= dt; if (toastT <= 0) toast.classList.remove('on'); }
      fxFrame(dt);
      if (composer) composer.render(dt); else renderer.render(scene, camera);
    }
    /* ---------- Blender で作ったモデルを読みこむ ---------- */
    function useModel(gltf) {
      var sc = gltf.scene;
      function N(n) { return sc.getObjectByName(n); }
      function setMat(node, m) { if (node) node.traverse(function (o) { if (o.isMesh) o.material = m; }); }
      if (!N('flipper_L') || !N('flipper_R')) return;
      sc.traverse(function (o) {
        if (!o.isMesh || !o.material) return;
        if (envTex) { o.material.envMap = envTex; o.material.envMapIntensity = o.material.name === 'trim' ? 0.45 : cfg.matte ? 0.55 : 0.8; o.material.needsUpdate = true; }
        if (o.material.name === 'tg_face') o.material = tgFace;
      });
      flippers[0].mesh = N('flipper_L'); flippers[1].mesh = N('flipper_R');
      bumpers.forEach(function (s, k) {
        var r = N('bumper_' + k + '_ring'); if (r) s.ring = r;
        setMat(N('bumper_' + k + '_cap'), s.mat); setMat(N('bumper_' + k + '_body'), s.body);
      });
      targets.forEach(function (t, k) { var p = N('target_' + k + '_plate'); if (p) t.plate = p; });
      slings.forEach(function (s, k) { setMat(N('sling_' + k + '_plate'), s.mat); });
      rotors.forEach(function (r, k) { var n = N('rotor_' + k); if (n) r.g = n; });
      var sp = N('spinner_plate'); if (sp && spin) spin = sp;
      var pl = N('plunger'); if (pl) plunger = pl;
      procGrp.visible = false; bgFrame.visible = false;
      scene.add(sc);
      // Blender で計算した、部品が床に落とす影を重ねる
      if (cfg.ao && floorG) {
        var im = new Image();
        im.onload = function () {
          floorG.save(); floorG.globalCompositeOperation = 'multiply'; floorG.globalAlpha = cfg.aoK || 0.8;
          floorG.drawImage(im, 0, 0, floorW, floorH); floorG.restore(); floorTex.needsUpdate = true;
        };
        im.src = cfg.ao;
      }
    }
    if (cfg.model && T.GLTFLoader && window.fetch) {
      // モデル（GLB）は base64 で JSON に包んである
      fetch(cfg.model).then(function (r) { if (!r.ok) throw new Error('model'); return r.json(); })
        .then(function (j) {
          var bin = atob(j.glb), buf = new Uint8Array(bin.length), q;
          for (q = 0; q < bin.length; q++) buf[q] = bin.charCodeAt(q);
          new T.GLTFLoader().parse(buf.buffer, '', useModel, function () { /* 読めなければ手作りの形のまま */ });
        })
        .catch(function () { /* 同上 */ });
    }

    refreshHud();
    requestAnimationFrame(frame);

    // テスト用の のぞき窓
    window.__pb = { balls: balls, start: startGame, state: function () { return { state: state, score: score, ballsLeft: ballsLeft, n: balls.length }; }, flippers: flippers, setPlunge: function (v) { plungeOn = v; }, tilt: tilt, tiltBtn: tiltBtn };
  };
})();
