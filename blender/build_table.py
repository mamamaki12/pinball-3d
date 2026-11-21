"""ピンボール台の3Dモデルを Blender（bpy）で作って GLB に書き出す。

使い方: python build_table.py <台のHTML> <出力フォルダー> <名前>
座標は Blender の X=台の左右, Y=台の奥行き, Z=高さ（Webアプリの物理と同じ単位）。
"""
import bpy, bmesh, math, json, re, sys, os
from mathutils import Vector, Matrix

html_path, out_dir, tname = sys.argv[-3], sys.argv[-2], sys.argv[-1]
cfg = json.loads(re.search(r'var CFG = (\{.*\});\n', open(html_path, encoding='utf-8').read()).group(1))
C = cfg['colors']
matte = bool(cfg.get('matte'))
CX, LANE_X = -0.4, 4.2
FLX, FRX, FY = CX - 2.0, CX + 2.0, 2.45
SPX, SPY = -4.45, 7.7

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def hexc(h, k=1.0):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 * k for i in (0, 2, 4))


MATS = {}


def M(name, color, metal=0.0, rough=0.5, emit=None, ek=0.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*hexc(color), 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit and ek > 0:
        b.inputs['Emission Color'].default_value = (*hexc(emit, ek), 1)
        b.inputs['Emission Strength'].default_value = 1.0
    MATS[name] = m
    return m


# ---------- 形を作る道具（bmesh に足していく） ----------
def xf(bm, verts, at=(0, 0, 0), rz=0.0, mat4=None):
    mx = mat4 if mat4 is not None else Matrix.Translation(at) @ Matrix.Rotation(rz, 4, 'Z')
    bmesh.ops.transform(bm, matrix=mx, verts=verts)


def lathe(bm, prof, seg=32, **kw):
    """(半径, 高さ) の輪郭をぐるっと回して回転体を作る"""
    rings, new = [], []
    for r, z in prof:
        if r < 1e-6:
            v = [bm.verts.new((0, 0, z))]
        else:
            v = [bm.verts.new((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)]
        rings.append(v)
        new += v
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        for i in range(seg):
            j = (i + 1) % seg
            if len(a) == 1:
                bm.faces.new((a[0], b[i], b[j]))
            elif len(b) == 1:
                bm.faces.new((a[i], a[j], b[0]))
            else:
                bm.faces.new((a[i], a[j], b[j], b[i]))
    xf(bm, new, **kw)
    return new


def prism(bm, poly, z0, z1, **kw):
    area = sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly)))
    if area < 0:
        poly = poly[::-1]
    lo = [bm.verts.new((x, y, z0)) for x, y in poly]
    hi = [bm.verts.new((x, y, z1)) for x, y in poly]
    n = len(poly)
    bm.faces.new(hi)
    bm.faces.new(lo[::-1])
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((lo[i], lo[j], hi[j], hi[i]))
    xf(bm, lo + hi, **kw)
    return lo + hi


def box(bm, x0, x1, y0, y1, z0, z1, **kw):
    return prism(bm, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], z0, z1, **kw)


def fillet(pts, r=0.12, n=4):
    """折れ線の角を丸める"""
    pts = [Vector(p) for p in pts]
    out = [pts[0]]
    for i in range(1, len(pts) - 1):
        p = pts[i]
        d1 = (pts[i - 1] - p)
        d2 = (pts[i + 1] - p)
        rr = min(r, d1.length * 0.45, d2.length * 0.45)
        a, b = p + d1.normalized() * rr, p + d2.normalized() * rr
        for k in range(n + 1):
            t = k / n
            out.append((1 - t) ** 2 * a + 2 * (1 - t) * t * p + t * t * b)
    out.append(pts[-1])
    return out


def tube(bm, pts, rad, seg=8, closed=False, **kw):
    pts = [Vector(p) for p in pts]
    n = len(pts)
    rings, new, s = [], [], None
    for i, p in enumerate(pts):
        a = pts[i - 1] if (i > 0 or closed) else p
        b = pts[(i + 1) % n] if (i < n - 1 or closed) else p
        t = (b - a).normalized()
        if s is None:
            up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((0, 1, 0))
            s = t.cross(up).normalized()
        else:
            s = (s - t * s.dot(t)).normalized()
        u = s.cross(t).normalized()
        ring = [bm.verts.new(p + (s * math.cos(2 * math.pi * k / seg) + u * math.sin(2 * math.pi * k / seg)) * rad) for k in range(seg)]
        rings.append(ring)
        new += ring
    pairs = list(zip(rings, rings[1:])) + ([(rings[-1], rings[0])] if closed else [])
    for a, b in pairs:
        for k in range(seg):
            j = (k + 1) % seg
            bm.faces.new((a[k], a[j], b[j], b[k]))
    if not closed:
        bm.faces.new(rings[0][::-1])
        bm.faces.new(rings[-1])
    xf(bm, new, **kw)
    return new


def torus(bm, R, r, seg=28, rs=8, **kw):
    pts = [(R * math.cos(2 * math.pi * i / seg), R * math.sin(2 * math.pi * i / seg), 0) for i in range(seg)]
    return tube(bm, pts, r, seg=rs, closed=True, **kw)


def offset_line(pts, d):
    out = []
    for i, p in enumerate(pts):
        p = Vector(p)
        n1 = n2 = None
        if i > 0:
            a = (p - Vector(pts[i - 1])).normalized()
            n1 = Vector((-a.y, a.x))
        if i < len(pts) - 1:
            a = (Vector(pts[i + 1]) - p).normalized()
            n2 = Vector((-a.y, a.x))
        if n1 is not None and n2 is not None:
            m = (n1 + n2).normalized()
            out.append(p + m * (d / max(0.3, m.dot(n1))))
        else:
            out.append(p + (n1 if n1 is not None else n2) * d)
    return [(v.x, v.y) for v in out]


def wallpath(bm, pts, thick, z0, z1, **kw):
    poly = offset_line(pts, thick / 2) + offset_line(pts, -thick / 2)[::-1]
    return prism(bm, poly, z0, z1, **kw)


def capsule_outline(length, r1, r2, n=10):
    pts = []
    for k in range(n + 1):
        a = math.pi / 2 + math.pi * k / n
        pts.append((r1 * math.cos(a), r1 * math.sin(a)))
    for k in range(n + 1):
        a = -math.pi / 2 + math.pi * k / n
        pts.append((length + r2 * math.cos(a), r2 * math.sin(a)))
    return pts


# ---------- オブジェクトにする ----------
def finish(name, bm, mat, bevel=0.02, loc=(0, 0, 0), rz=0.0, seg=2, parent=None, angle=50):
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    for p in me.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new(name, me)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (0, 0, rz)
    if bevel > 0:
        md = o.modifiers.new('bevel', 'BEVEL')
        md.width = bevel
        md.segments = seg
        md.limit_method = 'ANGLE'
        md.angle_limit = math.radians(angle)
    wn = o.modifiers.new('wn', 'WEIGHTED_NORMAL')
    wn.keep_sharp = True
    if parent:
        o.parent = parent
    return o


def empty(name, loc=(0, 0, 0), rz=0.0):
    o = bpy.data.objects.new(name, None)
    scene.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (0, 0, rz)
    return o


BATCH = {}


def bat(key):
    if key not in BATCH:
        BATCH[key] = bmesh.new()
    return BATCH[key]


# ---------- 材質 ----------
m_wall = M('wall', C['wall'], 0.0 if matte else 0.65, 0.6 if matte else 0.28, C['wallEm'], 0.5)
m_chrome = M('chrome', '#c4c8d0', 1.0, 0.18)
m_trim = M('trim', '#6f737d', 1.0, 0.42)
m_cab = M('cabinet', C['cabinet'], 0.0, 0.65, C['wallEm'], 0.08)
m_apron = M('apron', C['apron'], 0.0, 0.5, C['wallEm'], 0.12)
m_rubber = M('rubber', '#f2f2f2', 0.0, 0.85, '#ffffff', 0.1)
m_rubber_c = M('rubber_color', '#c62f22' if matte else '#15151b', 0.0, 0.8)
m_plastic = M('plastic', C['bumperBody'], 0.0, 0.4)
m_housing = M('housing', '#30303a', 0.6, 0.45)
m_flip = M('flipper', '#f3ead6' if matte else C['flipper'], 0.05, 0.35, C['flipper'], 0.0 if matte else 0.18)
m_rotor = M('rotor', C['rotor'], 0.1, 0.35, C['rotor'], 0.35)
m_accent = M('accent', C['accent'], 0.3, 0.35, C['accent'], 0.45)
m_dark = M('dark', '#0b0b10', 0.0, 0.6)
m_card = M('card', C['cabinet'], 0.0, 0.8, C['accent'], 0.12)
m_corner = M('corner', C['sling'], 0.0, 0.4, C['sling'], 0.15)
m_tgface = M('tg_face', C['target'], 0.0, 0.4)
m_white = M('white', '#f2f2f2', 0.0, 0.45)
m_dyn = M('dyn', '#888888', 0.0, 0.5)   # Webアプリ側で光る材質に差し替える部品用


def capmat(col):
    return M('cap_' + col.lstrip('#'), col, 0.0, 0.3, col, 0.8)


BEV = {'wall': 0.03, 'chrome': 0.0, 'cabinet': 0.05, 'apron': 0.05, 'rubber': 0.0, 'plastic': 0.012, 'housing': 0.03,
       'dark': 0.01, 'card': 0.006, 'corner': 0.015, 'accent': 0.01}


def post(x, y, col):
    lathe(bat('chrome'), [(0.07, 0), (0.07, 0.58), (0.0, 0.6)], seg=14, at=(x, y, 0))
    torus(bat('rubber'), 0.105, 0.045, seg=16, rs=6, at=(x, y, 0.27))
    lathe(bat('cap:' + col), [(0.09, 0.55), (0.14, 0.59), (0.14, 0.66), (0.08, 0.73), (0.0, 0.745)], seg=16, at=(x, y, 0))


# ---------- 台わく ----------
cab = bat('cabinet')
box(cab, -5.5, 5.5, -0.6, 18.5, -1.7, -0.08)
box(cab, -5.5, -5.08, -0.6, 18.5, -0.08, 0.85)
box(cab, 5.08, 5.5, -0.6, 18.5, -0.08, 0.85)
box(cab, -5.08, 5.08, 18.08, 18.5, -0.08, 0.85)
box(cab, -5.08, 5.08, -0.6, -0.12, -0.08, 0.5)
# 奥の表示板を支える台
box(cab, -5.2, 5.2, 18.5, 19.7, -1.7, 1.0)
# 金属のふち・手前のバー・脚
ch = bat('chromebox')
box(ch, -5.52, -5.06, -0.62, 18.52, 0.85, 0.9)
box(ch, 5.06, 5.52, -0.62, 18.52, 0.85, 0.9)
box(ch, -5.52, 5.52, -0.75, -0.1, 0.5, 0.64)
for sx in (-1, 1):
    for y0 in (-0.5, 17.9):
        box(ch, sx * 5.56 - 0.22, sx * 5.56 + 0.22, y0, y0 + 0.5, -6.0, -0.9)
# 手前の面：コインの扉とスタートボタン
box(bat('dark'), -1.3, 1.3, -0.66, -0.6, -1.5, -0.35)
box(bat('chromebox'), -1.0, -0.2, -0.69, -0.66, -1.0, -0.7)
box(bat('chromebox'), 0.2, 1.0, -0.69, -0.66, -1.0, -0.7)
lathe(bat('accent'), [(0.2, 0), (0.2, 0.08), (0.12, 0.14), (0.0, 0.15)], seg=20,
      mat4=Matrix.Translation((-3.9, -0.6, -0.55)) @ Matrix.Rotation(math.radians(90), 4, 'X'))

# ---------- 外わくのレール（左の壁〜アーチ〜右の壁） ----------
N = 40
rail = [(-5, -0.1), (-5, 13)] + [(5 * math.cos(math.pi - math.pi * i / N), 13 + 5 * math.sin(math.pi * i / N)) for i in range(1, N)] + [(5, 13), (5, 0.0)]
wallpath(bat('wall'), rail, 0.16, 0, 0.6)
tube(bat('chrome'), [(x, y, 0.63) for x, y in rail], 0.045, seg=8)
wallpath(bat('wall'), [(LANE_X, -0.1), (LANE_X, 13.0)], 0.16, 0, 0.55)
tube(bat('chrome'), [(LANE_X, -0.1, 0.58), (LANE_X, 13.0, 0.58)], 0.04, seg=8)
lathe(bat('chrome'), [(0.1, 0), (0.1, 0.62), (0.0, 0.66)], seg=14, at=(LANE_X, 13.0, 0))
# アーチの外がわの角をうめる板
for sx in (-1, 1):
    arc = [(sx * 5.12 * math.cos(math.pi / 2 * i / 14), 13 + 5.12 * math.sin(math.pi / 2 * i / 14)) for i in range(15)]
    prism(bat('corner'), arc + [(0, 18.08), (sx * 5.08, 18.08)], 0.5, 0.57)
# 発射レーンの出口の針金ゲート
tube(bat('chrome'), fillet([(LANE_X, 13.0, 0.0), (LANE_X, 13.0, 0.34), (5.0, 14.2, 0.34), (5.0, 14.2, 0.0)], 0.1), 0.028, seg=6)
box(bat('accent'), -0.3, 0.3, -0.02, 0.02, 0.05, 0.3,
    mat4=Matrix.Translation((4.6, 13.6, 0)) @ Matrix.Rotation(math.atan2(1.2, 0.8), 4, 'Z'))

# ---------- 手前のカバー（エプロン） ----------
ap = bat('apron')
OLX, ORX, OY = -4.2, 2 * CX + 4.2, 4.6 - 0.8 * (2.1 / 2.55)   # 外がわはアウトレーンとして空ける
prism(ap, [(OLX - 0.08, OY + 0.1), (FLX - 0.05, FY + 0.13), (FLX - 0.05, -0.12), (OLX - 0.08, -0.12)], 0, 0.55)
prism(ap, [(ORX + 0.08, OY + 0.1), (ORX + 0.08, -0.12), (FRX + 0.05, -0.12), (FRX + 0.05, FY + 0.13)], 0, 0.55)
box(bat('card'), -4.0, -2.8, 0.35, 1.45, 0.55, 0.575)
box(bat('card'), 2.0, 3.2, 0.35, 1.45, 0.55, 0.575)

# ---------- スリングショット（ポスト＋ゴム＋上の板） ----------
for k, mir in enumerate((False, True)):
    tri = [(-3.9, 7.0), (-3.9, 4.9), (-2.6, 3.9)]
    if mir:
        tri = [(2 * CX - x, y) for x, y in tri]
    cen = (sum(p[0] for p in tri) / 3, sum(p[1] for p in tri) / 3)
    for x, y in tri:
        post(x, y, C['sling'])
    band = [(x + (x - cen[0]) * 0.1, y + (y - cen[1]) * 0.1, 0.27) for x, y in tri]
    loop = []
    for i in range(3):
        a, b = Vector(band[i]), Vector(band[(i + 1) % 3])
        loop += [a.lerp(b, t) for t in (0.0, 0.33, 0.66)]
    tube(bat('rubber'), loop, 0.05, seg=8, closed=True)
    bm = bmesh.new()
    prism(bm, [(x + (x - cen[0]) * 0.16 - cen[0], y + (y - cen[1]) * 0.16 - cen[1]) for x, y in tri], 0, 0.06)
    finish('sling_%d_plate' % k, bm, m_dyn, bevel=0.02, loc=(cen[0], cen[1], 0.5))

# ---------- 上のレーンの針金ガイド ----------
for w in cfg.get('walls', []):
    x1, y1, x2, y2 = w
    tube(bat('chrome'), fillet([(x1, y1, 0.0), (x1, y1, 0.36), (x2, y2, 0.36), (x2, y2, 0.0)], 0.12), 0.04, seg=8)
    post(x2, y2 + 0.02, C['roll'])

# ---------- バンパー ----------
for k, b in enumerate(cfg.get('bumpers', [])):
    r, x, y = b['r'], b['x'], b['y']
    col = C['bumper'][k % len(C['bumper'])]
    lathe(bat('plastic'), [(r * 0.7, 0.0), (r * 1.2, 0.0), (r * 1.2, 0.035), (r * 1.08, 0.075), (r * 0.7, 0.075)], seg=36, at=(x, y, 0))
    for q in range(3):
        a = q * 2.094 + 0.5
        lathe(bat('chrome'), [(0.026, 0.06), (0.026, 0.6)], seg=6, at=(x + r * 0.98 * math.cos(a), y + r * 0.98 * math.sin(a), 0))
    bm = bmesh.new()
    lathe(bm, [(r * 0.72, 0.07), (r * 0.7, 0.12), (r * 0.62, 0.3), (r * 0.6, 0.57), (0.0, 0.57)], seg=28)
    finish('bumper_%d_body' % k, bm, m_dyn, bevel=0, loc=(x, y, 0))
    bm = bmesh.new()
    torus(bm, r * 0.98, 0.05, seg=36, rs=8)
    finish('bumper_%d_ring' % k, bm, m_chrome, bevel=0, loc=(x, y, 0.42))
    # 傘：ふちが反った皿の形。模様は上から投影した UV にWebアプリ側で貼る
    bm = bmesh.new()
    R = r * 1.17
    lathe(bm, [(r * 0.6, 0.555), (r * 0.9, 0.57), (r * 1.1, 0.62), (R, 0.67), (R, 0.71), (r * 1.08, 0.75), (r * 0.6, 0.79), (0.0, 0.8)], seg=40)
    uv = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        for lp in f.loops:
            lp[uv].uv = (lp.vert.co.x / (2 * R) + 0.5, 0.5 - lp.vert.co.y / (2 * R))
    finish('bumper_%d_cap' % k, bm, m_dyn, bevel=0, loc=(x, y, 0))

# ---------- ドロップターゲット ----------
for k, t in enumerate(cfg.get('targets', [])):
    left = t['x'] < CX
    free = bool(t.get('free'))
    ang = t.get('ang', 0.0) if free else math.pi / 2 + (-0.6 if left else 0.6)
    cx = t['x'] if free else t['x'] + (0.27 if left else -0.27)
    wx = -5 if left else LANE_X
    hx, hy = math.cos(ang) * 0.4, math.sin(ang) * 0.4
    lo, up = (cx - hx, t['y'] - hy), (cx + hx, t['y'] + hy)
    bk = -0.07 if left else 0.07
    if free:
        # 中央の列：うしろに低い金具だけ置く
        box(bat('housing'), -0.44, 0.44, 0.06, 0.2, 0.0, 0.1, mat4=Matrix.Translation((cx, t['y'], 0)) @ Matrix.Rotation(ang, 4, 'Z'))
    else:
        prism(bat('housing'), [(wx, up[1] + 0.35), (up[0] + bk, up[1] + 0.02), (lo[0] + bk, lo[1]), (wx, lo[1] - 0.1)], 0, 0.3)
    par = empty('target_%d_plate' % k, (cx, t['y'], 0.31), ang)
    bm = bmesh.new()
    box(bm, -0.38, 0.38, -0.035, 0.035, -0.31, 0.31)
    finish('target_%d_body' % k, bm, m_white, bevel=0.015, parent=par)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UVMap')
    for sy in (-1, 1):
        vs = [bm.verts.new((sx * 0.33, sy * 0.037, sz * 0.26)) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        f = bm.faces.new(vs if sy < 0 else vs[::-1])
        for lp in f.loops:
            lp[uv].uv = (lp.vert.co.x / 0.66 + 0.5, lp.vert.co.z / 0.52 + 0.5)
    finish('target_%d_face' % k, bm, m_tgface, bevel=0, parent=par)

# ---------- ゴムのバー・ピン・ホール ----------
for q in cfg.get('bars', []):
    x1, y1, x2, y2 = q
    post(x1, y1, C['roll'])
    post(x2, y2, C['roll'])
    d = Vector((x2 - x1, y2 - y1)).normalized()
    n = Vector((-d.y, d.x)) * 0.07
    a, c = Vector((x1, y1)) - d * 0.1, Vector((x2, y2)) + d * 0.1
    loop = [(a.x + n.x, a.y + n.y, 0.27), (c.x + n.x, c.y + n.y, 0.27), (c.x - n.x, c.y - n.y, 0.27), (a.x - n.x, a.y - n.y, 0.27)]
    tube(bat('rubber'), loop, 0.045, seg=8, closed=True)
for q in cfg.get('pegs', []):
    lathe(bat('chrome'), [(0.07, 0), (0.07, 0.58), (0.0, 0.6)], seg=14, at=(q['x'], q['y'], 0))
    lathe(bat('rubber'), [(0.1, 0.12), (0.16, 0.16), (0.16, 0.38), (0.1, 0.42)], seg=18, at=(q['x'], q['y'], 0))
    lathe(bat('cap:' + C['accent']), [(0.09, 0.55), (0.15, 0.59), (0.15, 0.66), (0.08, 0.74), (0.0, 0.755)], seg=16, at=(q['x'], q['y'], 0))
for q in cfg.get('holes', []):
    lathe(bat('chrome'), [(0.37, 0.0), (0.56, 0.0), (0.56, 0.06), (0.47, 0.12), (0.4, 0.1), (0.37, 0.04)], seg=36, at=(q['x'], q['y'], 0))
    lathe(bat('dark'), [(0.0, 0.012), (0.37, 0.012), (0.37, 0.04)], seg=28, at=(q['x'], q['y'], 0))

# ---------- 台わくの光るライン ----------
for sx, col in ((-1, C['light1']), (1, C['light2'])):
    bm = bmesh.new()
    tube(bm, [(sx * 5.1, 0.2, 0.78), (sx * 5.1, 17.9, 0.78)], 0.05, seg=8)
    finish('strip_%s' % ('L' if sx < 0 else 'R'), bm, M('strip_' + col.lstrip('#'), col, 0.0, 0.3, col, 0.95), bevel=0)

# ---------- フリッパー ----------
for nm, px in (('flipper_L', FLX), ('flipper_R', FRX)):
    par = empty(nm, (px, FY, 0.0))
    bm = bmesh.new()
    prism(bm, capsule_outline(1.45, 0.25, 0.15, 12), 0.05, 0.4)
    finish(nm + '_body', bm, m_flip, bevel=0.05, seg=3, parent=par)
    bm = bmesh.new()
    tube(bm, [(x, y, 0.2) for x, y in capsule_outline(1.45, 0.27, 0.17, 12)], 0.055, seg=8, closed=True)
    finish(nm + '_rubber', bm, m_rubber_c, bevel=0, parent=par)
    bm = bmesh.new()
    lathe(bm, [(0.13, 0.4), (0.13, 0.44), (0.09, 0.47), (0.0, 0.475)], seg=20)
    lathe(bm, [(0.045, 0.4), (0.045, 0.43), (0.0, 0.435)], seg=10, at=(1.3, 0, 0))
    finish(nm + '_pin', bm, m_chrome, bevel=0, parent=par)

# ---------- スピナー ----------
if not cfg.get('noSpinner'):
    tube(bat('chrome'), fillet([(SPX - 0.47, SPY, 0.0), (SPX - 0.47, SPY, 0.82), (SPX + 0.47, SPY, 0.82), (SPX + 0.47, SPY, 0.0)], 0.12), 0.03, seg=6)
    par = empty('spinner_plate', (SPX, SPY, 0.5))
    bm = bmesh.new()
    box(bm, -0.4, 0.4, -0.025, 0.025, -0.24, 0.24)
    finish('spinner_body', bm, m_accent, bevel=0.012, parent=par)
    bm = bmesh.new()
    tube(bm, [(-0.46, 0, 0), (0.46, 0, 0)], 0.022, seg=6)
    finish('spinner_axle', bm, m_chrome, bevel=0, parent=par)

# ---------- 回る棒（水車） ----------
for k, r in enumerate(cfg.get('rotors', [])):
    lathe(bat('plastic'), [(0.3, 0.0), (0.28, 0.12), (0.2, 0.14)], seg=24, at=(r['x'], r['y'], 0))
    par = empty('rotor_%d' % k, (r['x'], r['y'], 0.0))
    bm = bmesh.new()
    h = r['half']
    prism(bm, [(x - h, y) for x, y in capsule_outline(2 * h, 0.15, 0.15, 8)], 0.16, 0.46)
    finish('rotor_%d_bar' % k, bm, m_rotor, bevel=0.04, seg=3, parent=par)
    bm = bmesh.new()
    lathe(bm, [(0.2, 0.14), (0.22, 0.46), (0.22, 0.52), (0.14, 0.6), (0.0, 0.62)], seg=24)
    finish('rotor_%d_hub' % k, bm, m_chrome, bevel=0, parent=par)

# ---------- ワープの穴のふち ----------
for w in cfg.get('warps', []):
    lathe(bat('chrome'), [(0.47, 0.0), (0.58, 0.0), (0.58, 0.05), (0.5, 0.09), (0.46, 0.06)], seg=32, at=(w['x'], w['y'], 0))
    torus(bat('chrome'), 0.36, 0.03, seg=24, rs=6, at=(w['tx'], w['ty'], 0.03))

# ---------- 発射の棒 ----------
par = empty('plunger', (4.6, 0.15, 0.2))
rotY = Matrix.Rotation(math.radians(-90), 4, 'X')   # 回転体の軸(+Z)を台の奥(+Y)へ向ける
bm = bmesh.new()
lathe(bm, [(0.0, 0.42), (0.12, 0.41), (0.16, 0.36), (0.16, 0.24), (0.0, 0.24)], seg=18, mat4=rotY)
lathe(bm, [(0.0, -1.95), (0.14, -1.93), (0.19, -1.82), (0.19, -1.7), (0.1, -1.62), (0.0, -1.62)], seg=18, mat4=rotY)
finish('plunger_tip', bm, m_dark, bevel=0, parent=par)
bm = bmesh.new()
lathe(bm, [(0.05, -1.65), (0.05, 0.25)], seg=10, mat4=rotY)
helix = [(0.1 * math.cos(i * 0.9), -0.2 + i * 0.012, 0.1 * math.sin(i * 0.9)) for i in range(38)]
tube(bm, helix, 0.018, seg=5)
finish('plunger_rod', bm, m_chrome, bevel=0, parent=par)

# ---------- 奥の表示板のわく ----------
BB = Matrix.Translation((0, 19.7, 2.45)) @ Matrix.Rotation(-0.55, 4, 'X')
fr = bmesh.new()
for x0, x1, z0, z1 in ((-5.9, 5.9, 1.85, 2.2), (-5.9, 5.9, -2.2, -1.85), (-5.9, -5.55, -1.85, 1.85), (5.55, 5.9, -1.85, 1.85)):
    vs = box(fr, x0, x1, -0.16, 0.5, z0, z1)
vs = box(fr, -5.56, 5.56, 0.06, 0.5, -1.86, 1.86)
bmesh.ops.transform(fr, matrix=BB, verts=fr.verts[:])
finish('backbox', fr, m_cab, bevel=0.06, seg=3)
tr = bmesh.new()
tube(tr, [(-5.72, -0.17, -2.02), (5.72, -0.17, -2.02), (5.72, -0.17, 2.02), (-5.72, -0.17, 2.02)], 0.035, seg=6, closed=True)
for i in range(5):   # てっぺんの飾りランプ
    lathe(bat('cap:' + C['bumper'][i % len(C['bumper'])]), [(0.26, 0.0), (0.26, 0.06), (0.2, 0.2), (0.1, 0.28), (0.0, 0.3)], seg=20,
          mat4=BB @ Matrix.Translation((-4.8 + i * 2.4, 0.17, 2.2)) if i != 2 else BB @ Matrix.Translation((0, 0.22, 2.85)))
box(fr2 := bmesh.new(), -3.4, 3.4, 0.05, 0.4, 2.2, 2.85)
bmesh.ops.transform(fr2, matrix=BB, verts=fr2.verts[:])
finish('topper', fr2, m_cab, bevel=0.12, seg=4)
sg = bmesh.new()
tube(sg, [(-3.2, 0.02, 2.32), (3.2, 0.02, 2.32), (3.2, 0.02, 2.74), (-3.2, 0.02, 2.74)], 0.04, seg=6, closed=True)
for i in range(7):
    lathe(sg, [(0.0, -0.06), (0.12, -0.04), (0.12, 0.0)], seg=5, mat4=Matrix.Translation((-2.4 + i * 0.8, 0.04, 2.53)) @ Matrix.Rotation(math.radians(90), 4, 'X'))
bmesh.ops.transform(sg, matrix=BB, verts=sg.verts[:])
finish('topper_sign', sg, M('sign', C['accent'], 0.0, 0.3, C['accent'], 0.95), bevel=0)
bmesh.ops.transform(tr, matrix=BB, verts=tr.verts[:])
finish('backbox_trim', tr, m_chrome, bevel=0)

# ---------- まとめた部品をオブジェクトに ----------
for key, bm in list(BATCH.items()):
    if key.startswith('cap:'):
        finish('static_cap_' + key[5:], bm, capmat(key[4:]), bevel=0)
    elif key == 'chromebox':
        finish('static_chromebox', bm, m_trim, bevel=0.03, seg=3)
    else:
        mat = {'wall': m_wall, 'chrome': m_chrome, 'cabinet': m_cab, 'apron': m_apron, 'rubber': m_rubber, 'plastic': m_plastic,
               'housing': m_housing, 'dark': m_dark, 'card': m_card, 'corner': m_apron, 'accent': m_accent}[key]
        finish('static_' + key, bm, mat, bevel=BEV.get(key, 0.0))

# ---------- 床に落ちる影（アンビエントオクルージョン）を焼く ----------
ao_ok = False
if os.environ.get('PB_AO', '1') == '1':
    try:
        hide = [o for o in scene.objects if o.name.startswith(('flipper', 'rotor_', 'spinner_', 'plunger', 'backbox', 'topper', 'strip_'))]
        for o in hide:
            o.hide_render = True
        fm = bpy.data.meshes.new('floor')
        b2 = bmesh.new()
        vs = [b2.verts.new(p) for p in ((-5.3, -0.3, 0), (5.3, -0.3, 0), (5.3, 18.3, 0), (-5.3, 18.3, 0))]
        f = b2.faces.new(vs)
        uvl = b2.loops.layers.uv.new('UVMap')
        for lp, u in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
            lp[uvl].uv = u
        b2.to_mesh(fm)
        b2.free()
        floor = bpy.data.objects.new('floor', fm)
        scene.collection.objects.link(floor)
        img = bpy.data.images.new('ao', 512, 896)
        fmat = bpy.data.materials.new('floor_bake')
        try:
            fmat.use_nodes = True
        except Exception:
            pass
        node = fmat.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = img
        fmat.node_tree.nodes.active = node
        fm.materials.append(fmat)
        scene.render.engine = 'CYCLES'
        scene.cycles.samples = int(os.environ.get('PB_AO_SAMPLES', '48'))
        scene.cycles.device = 'CPU'
        if scene.world is None:
            scene.world = bpy.data.worlds.new('w')
        scene.world.light_settings.distance = 1.6
        for o in scene.objects:
            o.select_set(False)
        floor.select_set(True)
        bpy.context.view_layer.objects.active = floor
        bpy.ops.object.bake(type='AO', margin=2)
        img.filepath_raw = os.path.join(out_dir, 'ao_%s.png' % tname)
        img.file_format = 'PNG'
        img.save()
        ao_ok = True
        bpy.data.objects.remove(floor)
        for o in hide:
            o.hide_render = False
    except Exception as e:
        print('AO bake failed:', e)

# ---------- 書き出し ----------
out = os.path.join(out_dir, tname + '.glb')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_yup=True,
                          export_cameras=False, export_lights=False, export_animations=False)
import base64
with open(os.path.join(out_dir, tname + '.model.json'), 'w') as fh:
    json.dump({'glb': base64.b64encode(open(out, 'rb').read()).decode()}, fh)
tris = sum(len(p.vertices) - 2 for o in scene.objects if o.type == 'MESH' for p in o.data.polygons)
print('DONE', tname, 'objects', len(scene.objects), 'base tris', tris, 'size', os.path.getsize(out), 'ao', ao_ok)
