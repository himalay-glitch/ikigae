# rb_build.py — component builders for the RB robot. exec() after rb_lib.py.
# Conventions: robot faces -Y, robot's LEFT = +X (suffix _L), right = -X (_R). Metres. Feet bottom Z=0.
import bpy, math
from mathutils import Vector, Matrix

D = dict(
    # [SPEC] 22.80 x 19.60, top 26.00. Pillow included in the totals.
    shell_mn=(-0.1105, -0.098, 0.065), shell_mx=(0.1105, 0.0965, 0.258), shell_r=0.020,
    shell_pillow={'+x': 0.0035, '-x': 0.0035, '+y': 0.0015, '+z': 0.002},
    seam=0.002, shell_thick=0.0025,
    cut_front=(-0.073, -0.071), cut_rear=(0.072, 0.074), cut_accent=(0.088, 0.090),
    scr_c=(0.0, 0.174), scr_w=0.152, scr_h=0.132, scr_r=0.028,           # [SPEC] screen
    shoulder=(0.125, -0.010, 0.155), arm_len=0.115, arm_tilt=8.0,         # pivot on ring face
    foot_c=(0.052, 0.005), foot=(0.068, 0.056, 0.048),                   # [SPEC] foot WxDxH
    pack=(0.045, 0.178), ant_len=0.120,
)

MATS = ["M_Shell_Main", "M_Accent", "M_Screen_Glass", "M_Joint_Metal", "M_Rubber", "M_Backpack",
        "M_Antenna", "M_Details", "M_LED_Red", "M_LED_Eyes", "M_Screen_Bezel"]

def build_materials():
    make_mat("M_Shell_Main", "#FFB34D", rough=0.2, coat=0.15, coat_rough=0.08)
    make_mat("M_Accent", "#FF7A39", rough=0.38)
    make_mat("M_Screen_Glass", "#0B0B0D", rough=0.03, alpha=0.35, spec_ior_level=0.6)
    make_mat("M_Joint_Metal", "#2B2B2B", rough=0.45, metal=1.0)
    make_mat("M_Rubber", "#1A1A1A", rough=0.8)
    make_mat("M_Backpack", "#EAEAEA", rough=0.6)
    make_mat("M_Antenna", "#2F2F2F", rough=0.5, metal=1.0)
    make_mat("M_Details", "#9B9B9B", rough=0.35)
    make_mat("M_LED_Red", "#FF3B30", rough=0.4, emit_hex="#FF3B30", emit_strength=10.0)
    make_mat("M_LED_Eyes", "#FFFFFF", rough=0.4, emit_hex="#FFFFFF", emit_strength=12.0)
    make_mat("M_Screen_Bezel", "#0B0B0D", rough=0.25)
    return MATS

# ------------------------------------------------------------------ shell
def build_shell():
    V, F, C, A = rbox(D['shell_mn'], D['shell_mx'], D['shell_r'], nf=4, nflat=(10, 10, 10),
                      pillow=D['shell_pillow'],
                      extra={'y': list(D['cut_front']) + list(D['cut_rear']), 'z': list(D['cut_accent'])})
    f0, f1 = D['cut_front']; r0, r1 = D['cut_rear']; a0, a1 = D['cut_accent']
    def cls(i):
        y, z = C[i].y, C[i].z
        if f0 < y < f1 or r0 < y < r1: return None
        if y < f0:
            if a0 < z < a1: return None
            return 'RB_Shell_Front_Accent' if z < a0 else 'RB_Shell_Front'
        if y > r1: return 'RB_Shell_Rear'
        return 'RB_Shell_Main'
    parts = split_build(V, F, cls)
    out = []
    for name, (vv, ff, _) in parts.items():
        mat = "M_Accent" if name.endswith("Accent") else "M_Shell_Main"
        ob = make_obj(name, vv, ff, origin=(0, 0, 0.065), mats=[mat])
        add_solidify(ob, D['shell_thick'])
        out.append(ob)
    return [o.name for o in out]

def finish_shell_mods():
    for n in ("RB_Shell_Main", "RB_Shell_Front", "RB_Shell_Front_Accent", "RB_Shell_Rear"):
        ob = bpy.data.objects[n]
        for m in [m for m in ob.modifiers if m.type in ("BEVEL", "WEIGHTED_NORMAL")]: ob.modifiers.remove(m)
        add_bevel(ob, width=0.0008, segs=2, angle=35)
        add_wn(ob)

# ------------------------------------------------------------------ screen
def build_screen():
    cx, cz = D['scr_c']; W, H, R = D['scr_w'], D['scr_h'], D['scr_r']
    # glass: 2 mm, convex bulge 1.5 mm, front recessed 4 mm at the rim
    v, f = slab(W, H, R, 0.002, 0.0007, bulge=0.0015, cs=8, rings=5)
    ob = make_obj("RB_Screen_Glass", xform(v, place(M_FRONT, (cx, -0.093, cz))), f,
                  origin=(cx, -0.093, cz), mats=["M_Screen_Glass"], recalc=True)
    # bezel tray behind the glass (visible through the 2 mm seam around the glass)
    v, f = slab(W + 0.014, H + 0.014, R + 0.007, 0.004, 0.001, cs=8, rings=2)
    make_obj("RB_Screen_Bezel", xform(v, place(M_FRONT, (cx, -0.089, cz))), f,
             origin=(cx, -0.089, cz), mats=["M_Screen_Bezel"], recalc=True)
    # cutter for the shell opening (glass + 2 mm seam each side)
    v, f = slab(W + 2 * D['seam'], H + 2 * D['seam'], R + D['seam'], 0.02, 0.0001, cs=10, rings=1)
    cut = cutter_obj("CUT_Screen", xform(v, place(M_FRONT, (cx, -0.098, cz))), f)
    front = bpy.data.objects["RB_Shell_Front"]
    if not any(m.type == "BOOLEAN" and m.object == cut for m in front.modifiers):
        add_bool(front, cut, "Bool_Screen")
    return ob.name

# ------------------------------------------------------------------ inner frame
def build_frame():
    V, F, C, A = rbox((-0.104, -0.086, 0.071), (0.104, 0.090, 0.252), 0.012, nf=2, nflat=(2, 2, 2))
    ob = make_obj("RB_Frame_Inner", V, F, origin=(0, 0, 0.065), mats=["M_Joint_Metal"])
    return ob.name

# ------------------------------------------------------------------ shoulders + arms
def _face_radius_idx(verts, faces, origin, axis, thresh):
    O = Vector(origin); d = Vector(axis).normalized(); out = []
    for f in faces:
        c = sum((Vector(verts[i]) for i in f), Vector()) / len(f)
        w = c - O; rr = (w - d * w.dot(d)).length
        out.append(1 if rr < thresh else 0)
    return out

def build_shoulder(s):
    sfx = "_L" if s > 0 else "_R"
    P = Vector((s * D['shoulder'][0], D['shoulder'][1], D['shoulder'][2]))
    ax = (s, 0, 0)
    base = Vector((s * 0.1105, P.y, P.z))
    prof = [(0.0, 0), (0.0, 0.031), (0.0008, 0.0330), (0.0072, 0.0330), (0.0086, 0.0318), (0.0092, 0.0300), (0.0092, 0)]
    v, f = lathe(prof, base, ax, (0, 0, 1), segs=48)
    make_obj("RB_Shoulder_Boss" + sfx, v, f, origin=P, mats=["M_Shell_Main"], recalc=True)
    ring0 = Vector((s * 0.117, P.y, P.z))
    prof = [(0, 0), (0, 0.0235), (0.0004, 0.024), (0.0076, 0.024), (0.008, 0.0235), (0.008, 0.0172),
            (0.0076, 0.0166), (0.0058, 0.0160), (0.0046, 0.0158), (0.0046, 0.0060), (0.0050, 0.0045), (0.0052, 0)]
    v, f = lathe(prof, ring0, ax, (0, 0, 1), segs=48)
    idx = _face_radius_idx(v, f, ring0, ax, 0.01585)
    ob = make_obj("RB_Shoulder" + sfx, v, f, origin=P, mats=["M_Joint_Metal", "M_Rubber"], mat_idx=idx, recalc=True)
    add_bevel(ob, 0.0004, 2, 40); add_wn(ob)
    return ob.name

def arm_frame(s):
    P = Vector((s * D['shoulder'][0], D['shoulder'][1], D['shoulder'][2]))
    t = math.radians(D['arm_tilt'])
    d = Vector((s * math.sin(t), 0, -math.cos(t)))
    A0 = P + Vector((s * 0.009, 0, 0))
    off = A0 - P; b = 2 * off.dot(d); c = off.length_squared - D['arm_len'] ** 2
    T = (-b + math.sqrt(b * b - 4 * c)) / 2          # axis length so |tip - pivot| = 11.50 cm
    dd, u, v = frame_from(d, (0, -1, 0))              # u = forward, v = d x u
    return P, A0, d, T, u, v

def build_arm(s):
    sfx = "_L" if s > 0 else "_R"
    P, A0, d, T, u, v = arm_frame(s)
    k = T / 0.1137
    up = [(0.010, 0), (0.0108, 0.0065), (0.0125, 0.0100), (0.0155, 0.0124), (0.0195, 0.0136), (0.030, 0.0142),
          (0.040, 0.0146), (0.0445, 0.0146), (0.0453, 0.0138), (0.0457, 0.0120), (0.0458, 0)]
    vv, ff = lathe([(a * k, r) for a, r in up], A0, d, (0, -1, 0), segs=24, ry=0.92)
    make_obj("RB_Arm_Upper" + sfx, vv, ff, origin=P, mats=["M_Shell_Main"], recalc=True)
    fo = [(0.0478, 0, 0), (0.0478, 0.0120, 0), (0.0481, 0.0138, 0), (0.050, 0.0156, 0.0004), (0.055, 0.0190, 0.001),
          (0.063, 0.0233, 0.0025), (0.072, 0.0258, 0.0035), (0.081, 0.0266, 0.004), (0.089, 0.0258, 0.004),
          (0.097, 0.0232, 0.0035), (0.103, 0.0195, 0.003), (0.108, 0.0145, 0.0022), (0.1115, 0.0085, 0.0012),
          (0.1132, 0.0035, 0.0005), (0.1137, 0, 0.0002)]
    vv, ff = lathe([(a * k, r, o) for a, r, o in fo], A0, d, (0, -1, 0), segs=24, ry=0.92)
    nmain = len(ff)
    # grip pad (rubber) on the inner-front of the mitten, near the tip
    tp = 0.096 * k
    n = (u * 0.6 + v * (s * 0.8)).normalized()
    c = A0 + d * tp + u * 0.0035
    X = d.copy(); Z = n; Y = Z.cross(X).normalized()
    M = Matrix((X, Y, Z)).transposed().to_4x4(); M.translation = c + n * 0.0222
    pv, pf = slab(0.016, 0.012, 0.005, 0.003, 0.001, cs=4, rings=2)
    base = len(vv); vv += xform(pv, M); ff += [[i + base for i in f] for f in pf]
    idx = [0] * nmain + [1] * len(pf)
    seam_pivot = A0 + d * (0.0468 * k)
    ob = make_obj("RB_Arm_Fore" + sfx, vv, ff, origin=seam_pivot, mats=["M_Shell_Main", "M_Rubber"],
                  mat_idx=idx, recalc=True)
    tip = A0 + d * T
    return f"{ob.name} tip->pivot {(tip - P).length*100:.2f} cm, tip at {tuple(round(x*100,2) for x in tip)}"

# ------------------------------------------------------------------ legs + feet
def build_leg_foot(s):
    sfx = "_L" if s > 0 else "_R"
    cx, cy = s * D['foot_c'][0], D['foot_c'][1]
    fw, fd, fh = D['foot']
    V, F, C, A = rbox((cx - fw / 2, cy - fd / 2, 0.0015), (cx + fw / 2, cy + fd / 2, fh), 0.008, nf=3, nflat=(5, 4, 4))
    idx = [1 if c.z < 0.0095 else 0 for c in C]
    # tread ribs (rubber), bottom at Z=0
    for kk in range(5):
        pv, pf = slab(0.056, 0.0045, 0.002, 0.003, 0.001, cs=3, rings=1)
        b = len(V); V += xform(pv, Matrix.Translation((cx, cy + (kk - 2) * 0.0095, 0.0015)))
        F += [[i + b for i in f] for f in pf]; idx += [1] * len(pf)
    # front detail plate (grey) + slot (rubber)
    pv, pf = slab(0.030, 0.012, 0.002, 0.002, 0.0006, cs=3, rings=1)
    b = len(V); V += xform(pv, place(M_FRONT, (cx, cy - fd / 2 - 0.0005, 0.031))); F += [[i + b for i in f] for f in pf]; idx += [2] * len(pf)
    pv, pf = slab(0.016, 0.0025, 0.001, 0.001, 0.0003, cs=2, rings=1)
    b = len(V); V += xform(pv, place(M_FRONT, (cx - 0.003, cy - fd / 2 - 0.0015, 0.031))); F += [[i + b for i in f] for f in pf]; idx += [1] * len(pf)
    make_obj("RB_Foot" + sfx, V, F, origin=(cx, cy, 0.0), mats=["M_Accent", "M_Rubber", "M_Details"], mat_idx=idx)
    V, F, C, A = rbox((cx - 0.023, cy - 0.020, 0.040), (cx + 0.023, cy + 0.020, 0.0705), 0.007, nf=3, nflat=(2, 2, 2))
    make_obj("RB_Leg" + sfx, V, F, origin=(cx, cy, 0.065), mats=["M_Accent"])
    return sfx

def build_leg_hose(s):
    sfx = "_L" if s > 0 else "_R"
    cx, cy = s * D['foot_c'][0], D['foot_c'][1]
    prof = [(0.047, 0), (0.047, 0.026), (0.0475, 0.0285)]
    z = 0.049
    for kk in range(4):
        prof += [(z, 0.0305), (z + 0.0015, 0.0285)]; z += 0.003
    prof += [(z, 0.0305), (z + 0.0012, 0.0285), (z + 0.0018, 0.024), (z + 0.0018, 0)]
    v, f = lathe(prof, (cx, cy, 0.0), (0, 0, 1), (1, 0, 0), segs=40, ry=0.86, superexp=3.5)
    make_obj("RB_Hose_Leg" + sfx, v, f, origin=(cx, cy, 0.047), mats=["M_Rubber"], recalc=True)
    return f"top z {(z+0.0018)*100:.2f} cm"

def build_arm_hose(s):
    sfx = "_L" if s > 0 else "_R"
    P, A0, d, T, u, v = arm_frame(s)
    k = T / 0.1137
    start = A0 + d * (0.100 * k) + u * 0.002 - v * (s * 0.004)      # inside the mitten, near the tip
    cx, cy = s * D['foot_c'][0], D['foot_c'][1]
    pts = [start, start + d * 0.014, Vector((s * 0.140, -0.004, 0.024)), Vector((s * 0.112, 0.000, 0.020)),
           Vector((s * 0.094, 0.003, 0.036)), Vector((s * 0.080, 0.004, 0.054)), Vector((s * 0.072, 0.004, 0.056))]
    vv, ff, L = sweep(pts, 0.0050, segs=12, samples=150, rib_pitch=0.0032, rib_amp=0.12)
    make_obj("RB_Hose_Arm" + sfx, vv, ff, origin=pts[-1], mats=["M_Rubber"], recalc=True)
    return f"length {L*100:.1f} cm"

# ------------------------------------------------------------------ backpacks + antenna
def build_backpack(s):
    sfx = "_L" if s > 0 else "_R"
    py, pz = D['pack']; M = M_SIDE_PX if s > 0 else M_SIDE_NX
    V = []; F = []; idx = []
    def add(vf, mi, loc):
        pv, pf = vf; b = len(V); V.extend(xform(pv, place(M, loc))); F.extend([[i + b for i in f] for f in pf]); idx.extend([mi] * len(pf))
    add(slab(0.042, 0.115, 0.019, 0.018, 0.004, cs=8, rings=3), 0, (s * 0.1190, py, pz))           # rubber pad
    add(slab(0.031, 0.086, 0.0135, 0.004, 0.0012, cs=8, rings=3), 1, (s * 0.1275, py, pz + 0.006))  # grey vent panel
    add(slab(0.031, 0.008, 0.003, 0.003, 0.001, cs=3, rings=1), 2, (s * 0.1282, py, 0.131))          # red LED band
    ob = make_obj("RB_Backpack" + sfx, V, F, origin=(s * 0.1100, py, pz),
                  mats=["M_Rubber", "M_Backpack", "M_LED_Red"], mat_idx=idx, recalc=True)
    # vertical vent slots
    CV = []; CF = []
    for kk in range(-2, 3):
        pv, pf = slab(0.0035, 0.058, 0.00170, 0.012, 0.0001, cs=4, rings=1)
        b = len(CV); CV.extend(xform(pv, place(M, (s * 0.1300, py + kk * 0.0058, pz + 0.008)))); CF.extend([[i + b for i in f] for f in pf])
    cut = cutter_obj("CUT_Vents" + sfx, CV, CF)
    m = add_bool(ob, cut, "Bool_Vents"); m.use_self = True
    add_bevel(ob, 0.0004, 2, 40); add_wn(ob)
    return ob.name

def build_antenna():
    s = -1; py = D['pack'][0]; base = Vector((s * 0.1190, py, D['pack'][1] + 0.0575))
    V = []; F = []; idx = []
    def add(vf, mi):
        pv, pf = vf; b = len(V); V.extend(pv); F.extend([[i + b for i in f] for f in pf]); idx.extend([mi] * len(pf))
    z0 = base.z
    add(lathe([(z0 - 0.002, 0), (z0 - 0.002, 0.0058), (z0 - 0.001, 0.0060), (z0 + 0.007, 0.0060), (z0 + 0.008, 0.0052),
               (z0 + 0.0085, 0.0030), (z0 + 0.0087, 0)], (base.x, base.y, 0), (0, 0, 1), segs=20), 0)
    top = z0 + D['ant_len']; rb = 0.004
    add(lathe([(z0 + 0.007, 0), (z0 + 0.007, 0.00175), (top - 2 * rb + 0.0005, 0.00175), (top - 2 * rb + 0.0006, 0)],
              (base.x, base.y, 0), (0, 0, 1), segs=12), 1)
    ball = [(top - 2 * rb + rb * (1 - math.cos(math.radians(a))), rb * math.sin(math.radians(a))) for a in range(0, 181, 20)]
    ball[0] = (ball[0][0], 0); ball[-1] = (top, 0)
    add(lathe(ball, (base.x, base.y, 0), (0, 0, 1), segs=12), 1)
    ob = make_obj("RB_Antenna", V, F, origin=base, mats=["M_Rubber", "M_Antenna"], mat_idx=idx, recalc=True)
    return f"{ob.name} base z {z0*100:.2f} top z {top*100:.2f}"

def on_normal(surf_pt, normal, offset, xaxis=(1, 0, 0)):
    """Matrix placing a slab (local Z = front) on a surface point, front along `normal`."""
    Z = Vector(normal).normalized(); X = Vector(xaxis); X = (X - Z * X.dot(Z)).normalized(); Y = Z.cross(X)
    M = Matrix((X, Y, Z)).transposed().to_4x4(); M.translation = Vector(surf_pt) + Z * offset
    return M

# ------------------------------------------------------------------ surface details
def build_details():
    out = []
    # front detail panel + slot lines + red LED
    V = []; F = []; idx = []
    def add(vf, mi, M):
        pv, pf = vf; b = len(V); V.extend(xform(pv, M)); F.extend([[i + b for i in f] for f in pf]); idx.extend([mi] * len(pf))
    add(slab(0.044, 0.010, 0.002, 0.003, 0.0007, cs=3, rings=1), 0, place(M_FRONT, (0.022, -0.0985, 0.0975)))
    for kk in range(3):
        add(slab(0.024, 0.0011, 0.0004, 0.0008, 0.0002, cs=2, rings=1), 1, place(M_FRONT, (0.014, -0.1000, 0.0950 + kk * 0.0025)))
    add(slab(0.005, 0.004, 0.001, 0.0012, 0.0004, cs=3, rings=1), 2, place(M_FRONT, (0.0365, -0.1000, 0.0975)))
    add(slab(0.022, 0.0055, 0.0025, 0.0016, 0.0005, cs=3, rings=1), 1, on_normal((0.0, -0.0961, 0.0765), (0, -0.906, -0.423), 0.0003))
    make_obj("RB_Detail_Front", V, F, origin=(0.022, -0.098, 0.0975), mats=["M_Details", "M_Rubber", "M_LED_Red"], mat_idx=idx, recalc=True)
    out.append("RB_Detail_Front")
    # side buttons (2 per side)
    for s in (1, -1):
        sfx = "_L" if s > 0 else "_R"; M = M_SIDE_PX if s > 0 else M_SIDE_NX
        V = []; F = []; idx = []
        for z in (0.112, 0.1035):
            add(slab(0.016, 0.0055, 0.0015, 0.003, 0.0007, cs=3, rings=1), 0, place(M, (s * 0.1135, -0.050, z)))
        make_obj("RB_Buttons_Side" + sfx, V, F, origin=(s * 0.113, -0.05, 0.108), mats=["M_Details"], mat_idx=idx, recalc=True)
        out.append("RB_Buttons_Side" + sfx)
    # bottom screw/port
    v, f = lathe([(0.0630, 0), (0.0630, 0.0045), (0.0636, 0.005), (0.0652, 0.005), (0.0652, 0)], (0, 0.0, 0), (0, 0, 1), segs=16)
    make_obj("RB_Detail_Bottom", v, f, origin=(0, 0, 0.065), mats=["M_Joint_Metal"], recalc=True)
    out.append("RB_Detail_Bottom")
    return out

def build_back_panel():
    cz = 0.168; W, H, R = 0.146, 0.126, 0.014
    V = []; F = []; idx = []
    def add(vf, mi, M):
        pv, pf = vf; b = len(V); V.extend(xform(pv, M)); F.extend([[i + b for i in f] for f in pf]); idx.extend([mi] * len(pf))
    add(slab(W, H, R, 0.003, 0.0008, cs=8, rings=3), 0, place(M_BACK, (0, 0.0950, cz)))
    for (x, z) in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        v, f = lathe([(0.0955, 0), (0.0955, 0.0024), (0.0963, 0.0025), (0.0968, 0.0018), (0.0969, 0)],
                     (x * (W / 2 - 0.008), 0, z * (H / 2 - 0.008) + cz), (0, 1, 0), (1, 0, 0), segs=12)
        add((v, f), 1, Matrix())
    ob = make_obj("RB_Panel_Back", V, F, origin=(0, 0.095, cz), mats=["M_Shell_Main", "M_Joint_Metal"], mat_idx=idx, recalc=True)
    # vent slats through the panel
    CV = []; CF = []
    for kk in range(6):
        pv, pf = slab(0.052, 0.0040, 0.0019, 0.012, 0.0001, cs=4, rings=1)
        b = len(CV); CV.extend(xform(pv, place(M_BACK, (0, 0.095, 0.182 + kk * 0.0068)))); CF.extend([[i + b for i in f] for f in pf])
    cut = cutter_obj("CUT_BackVents", CV, CF); add_bool(ob, cut, "Bool_Vents")
    add_bevel(ob, 0.0005, 2, 40); add_wn(ob)
    # shell openings: recess + long bottom vent
    v, f = slab(W + 2 * D['seam'], H + 2 * D['seam'], R + D['seam'], 0.012, 0.0001, cs=10, rings=1)
    c1 = cutter_obj("CUT_BackPanel", xform(v, place(M_BACK, (0, 0.0985, cz))), f)
    v, f = slab(0.090, 0.007, 0.0033, 0.012, 0.0001, cs=6, rings=1)
    c2 = cutter_obj("CUT_BackSlot", xform(v, place(M_BACK, (0, 0.0985, 0.0905))), f)
    rear = bpy.data.objects["RB_Shell_Rear"]
    for c in (c1, c2):
        if not any(m.type == "BOOLEAN" and m.object == c for m in rear.modifiers):
            m = add_bool(rear, c)
    # dark grille behind the bottom slot
    v, f = slab(0.094, 0.011, 0.004, 0.002, 0.0005, cs=4, rings=1)
    make_obj("RB_Vent_Back_Grille", xform(v, place(M_BACK, (0, 0.0925, 0.0905))), f, origin=(0, 0.0925, 0.0905), mats=["M_Rubber"], recalc=True)
    return ob.name

# ------------------------------------------------------------------ eyes (16x16 dot matrix per eye)
EYE = dict(pitch=0.00215, dot_r=0.00078, cx=0.036, cz=0.182, y_disp=-0.0914, y_dot=-0.0917)

def _pattern(name, eye):  # eye: +1 robot-left (+X, viewer right), -1 robot-right
    def on(i, j):
        X = i - 7.5; Y = j - 7.5
        if name == "Neutral" or (name == "Wink" and eye < 0):
            return (abs(X) ** 4 + abs(Y) ** 4) <= 5.6 ** 4
        if name == "Blink":
            return abs(X) <= 6 and abs(Y - (0.5 - X * X / 14.0)) <= 0.6
        if name == "Happy":
            return abs(X) <= 5.6 and abs(Y - (2.0 - X * X / 8.0)) <= 1.1
        if name == "Excited":
            return abs(X) <= 5.5 and abs(Y - (3.0 - abs(X) * 1.05)) <= 0.85
        if name == "Thinking":
            return (X - 2) ** 2 + (Y - 2) ** 2 <= 3.3 ** 2
        if name == "Wink":
            return abs(Y) <= 5 and abs(X - (-3.0 + abs(Y) * 1.0)) <= 0.75
        return False
    return on

EXPRESSIONS = ["Neutral", "Blink", "Happy", "Thinking", "Excited", "Wink"]

def build_eyes():
    p = EYE['pitch']; r = EYE['dot_r']; y = EYE['y_dot']; seg = 8
    dots = []  # (eye, i, j, centre)
    for eye in (1, -1):
        for j in range(16):
            for i in range(16):
                c = Vector((eye * EYE['cx'] + (i - 7.5) * p, y, EYE['cz'] + (j - 7.5) * p)); dots.append((eye, i, j, c))
    def ring(c, rr):
        return [c + Vector((math.cos(2 * math.pi * k / seg) * rr, 0, math.sin(2 * math.pi * k / seg) * rr)) for k in range(seg)]
    V = []; F = []
    for (_, _, _, c) in dots:
        b = len(V); V.extend(ring(c + Vector((0, 0.0012, 0)), r * 0.02))  # off-dots tucked behind the display; F.append([b + k for k in range(seg)][::-1])
    ob = make_obj("RB_Eye_Dots", V, F, collection="ROBOT_Eyes", origin=(0, y, EYE['cz']), mats=["M_LED_Eyes"], smooth=False, recalc=False)
    # normals must face -Y
    me = ob.data
    if me.polygons[0].normal.y > 0:
        for poly in me.polygons: poly.flip()
    ob.shape_key_add(name="Basis", from_mix=False)
    for name in EXPRESSIONS:
        kb = ob.shape_key_add(name=name, from_mix=False)
        for di, (eye, i, j, c) in enumerate(dots):
            if _pattern(name, eye)(i, j):
                for k, pnt in enumerate(ring(c - ob.location, r)):
                    kb.data[di * seg + k].co = pnt
        kb.slider_min = 0.0; kb.slider_max = 1.0
    ob.data.shape_keys.key_blocks["Neutral"].value = 1.0
    ob.data.shape_keys.name = "SK_Eyes"
    # display (unlit LED grid) — one quad per eye, clean 0-1 UVs
    size = 16 * p; V = []; F = []
    for eye in (1, -1):
        cx = eye * EYE['cx']; b = len(V)
        V += [(cx - size / 2, EYE['y_disp'], EYE['cz'] - size / 2), (cx + size / 2, EYE['y_disp'], EYE['cz'] - size / 2),
              (cx + size / 2, EYE['y_disp'], EYE['cz'] + size / 2), (cx - size / 2, EYE['y_disp'], EYE['cz'] + size / 2)]
        F.append([b, b + 1, b + 2, b + 3][::-1])
    disp = make_obj("RB_Eye_Display", V, F, collection="ROBOT_Eyes", origin=(0, EYE['y_disp'], EYE['cz']), mats=[eye_matrix_mat()], smooth=False)
    if disp.data.polygons[0].normal.y > 0:
        for poly in disp.data.polygons: poly.flip()
    uv = disp.data.uv_layers.new(name="UVMap")
    for poly in disp.data.polygons:
        for li in poly.loop_indices:
            co = disp.data.vertices[disp.data.loops[li].vertex_index].co + disp.location
            cx = EYE['cx'] if co.x > 0 else -EYE['cx']
            uv.data[li].uv = ((co.x - cx) / size + 0.5, (co.z - EYE['cz']) / size + 0.5)
    return f"dots {len(dots)}; keys {[k.name for k in ob.data.shape_keys.key_blocks]}"

def eye_matrix_mat():
    img = bpy.data.images.get("TEX_EyeMatrix_Off")
    if img is None:
        N = 256; img = bpy.data.images.new("TEX_EyeMatrix_Off", N, N, alpha=False)
        px = [0.0] * (N * N * 4); bg = 0.043; dot = 0.095
        for yy in range(N):
            for xx in range(N):
                cxp = (xx % 16) - 7.5; cyp = (yy % 16) - 7.5
                v = dot if cxp * cxp + cyp * cyp <= 5.6 * 5.6 else bg
                o = (yy * N + xx) * 4; px[o] = px[o + 1] = px[o + 2] = v; px[o + 3] = 1.0
        img.pixels = px; img.pack()
    m = bpy.data.materials.get("M_Eye_Matrix") or bpy.data.materials.new("M_Eye_Matrix")
    m.use_nodes = True; nt = m.node_tree; b = principled(m)
    tex = next((n for n in nt.nodes if n.type == "TEX_IMAGE"), None) or nt.nodes.new("ShaderNodeTexImage")
    tex.image = img; tex.interpolation = "Linear"; tex.location = (-400, 200)
    nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.25
    m.diffuse_color = (0.01, 0.01, 0.012, 1)
    return m
