# rb_hands.py — v004: robotic hands. exec() inside the opened robot .blend (v003+), AFTER exec of rb_future.py
# (uses its tube() helper). Re-runnable: restores the original forearm mesh from a stored copy each run.
#
# The mitten tip is cut at axial 8.0 cm (from the arm-axis origin) and closed with an orange chamfer lip +
# dark anodised palm plate with a cyan rim. Three 2-segment fingers + an opposable 2-segment thumb grow
# from the plate; fingertips land at the [SPEC] 11.50 cm shoulder-to-tip length.
# Each segment is a rigid mesh parented to its own bone (same scheme as the rest of the robot):
#   DEF-Finger{1,2,3}_{A,B}.{L,R}, DEF-Thumb_{A,B}.{L,R}   — parent chain to DEF-Forearm.*
#   Pose: rot X + = curl toward the palm (thumb curls toward the fingers), rot Z = splay (A bones only).
import bpy, bmesh, math
from mathutils import Vector, Matrix

CM = 0.01
rig = bpy.data.objects["RB_Rig"]
GEO = bpy.data.collections["ROBOT_Geo"]
A_CUT = 0.072          # axial cut position (m, profile units before k scale)
LIP, PLATE = 0.0015, 0.0025
KN_R = 0.42 * CM       # knuckle radius
DIGITS = {             # name: (w offset, n offset, splay deg, tilt-to-n deg, width, thick, LA, LB)
    "Finger1": (-1.42, -0.70, -7, 0, 1.25, 1.32, 1.70, 1.62),
    "Finger2": (0.00, -0.70, 0, 0, 1.25, 1.32, 1.70, 1.62),
    "Finger3": (1.42, -0.70, 7, 0, 1.25, 1.32, 1.70, 1.62),
    "Thumb": (0.00, 1.30, 0, 20, 1.35, 1.38, 1.30, 1.30),
}
MATS = ["M_Shell_Main", "M_Joint_Metal", "M_Rubber", "M_FX_Glow"]


def frame(side):
    s = 1 if side == "L" else -1
    b = rig.data.bones["DEF-Forearm." + side]
    head = b.head_local.copy()
    d = (b.tail_local - b.head_local).normalized()
    k = b.length / (0.1137 - 0.0468)
    fwd = Vector((0, -1, 0))
    u = (fwd - d * d.dot(fwd)).normalized()
    v = d.cross(u).normalized()
    n = (u * 0.8 + v * (s * 0.6)).normalized()      # palm normal: forward + inward
    n = (n - d * d.dot(n)).normalized()
    w = d.cross(n).normalized()
    return dict(s=s, head=head, d=d, k=k, u=u, v=v, n=n, w=w)


# ------------------------------------------------------------------ forearm cut + palm plate
def cut_forearm(side, F):
    ob = bpy.data.objects["RB_Arm_Fore_" + side]
    oname = "RB_Arm_Fore_%s_orig" % side
    orig = bpy.data.meshes.get(oname)
    if orig is None:
        orig = ob.data.copy()
        orig.name = oname
        orig.use_fake_user = True
    old = ob.data
    me = orig.copy()
    ob.data = me
    if old.users == 0:
        bpy.data.meshes.remove(old)
    me.name = "RB_Arm_Fore_" + side
    me.use_fake_user = False
    if "M_Joint_Metal" not in [m.name for m in me.materials]:
        me.materials.append(bpy.data.materials["M_Joint_Metal"])
    mi_metal = [m.name for m in me.materials].index("M_Joint_Metal")

    mw = ob.matrix_world.copy()
    mwi = mw.inverted()
    d_l = (mwi.to_3x3() @ F["d"]).normalized()
    bm = bmesh.new()
    bm.from_mesh(me)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index == 1], context="FACES")  # old grip pad
    co = mwi @ (F["head"] + F["d"] * (A_CUT - 0.0468) * F["k"])
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=d_l,
                           clear_outer=True)
    bnd = [e for e in bm.edges if e.is_boundary]
    ring0 = list({x for e in bnd for x in e.verts})
    c = sum((x.co for x in ring0), Vector()) / len(ring0)

    r1 = bmesh.ops.extrude_edge_only(bm, edges=bnd)
    v1 = [g for g in r1["geom"] if isinstance(g, bmesh.types.BMVert)]
    for x in v1:
        x.co = c + (x.co - c) * 0.90 + d_l * LIP
    for f in (g for g in r1["geom"] if isinstance(g, bmesh.types.BMFace)):
        f.material_index = 0
        f.smooth = True
    e1 = [g for g in r1["geom"] if isinstance(g, bmesh.types.BMEdge) and g.is_boundary]
    r2 = bmesh.ops.extrude_edge_only(bm, edges=e1)
    v2 = [g for g in r2["geom"] if isinstance(g, bmesh.types.BMVert)]
    for x in v2:
        x.co = c + (x.co - c) * 0.97 + d_l * (LIP + PLATE)
    for f in (g for g in r2["geom"] if isinstance(g, bmesh.types.BMFace)):
        f.material_index = mi_metal
        f.smooth = False
    e2 = [g for g in r2["geom"] if isinstance(g, bmesh.types.BMEdge) and g.is_boundary]
    cap = bmesh.ops.holes_fill(bm, edges=e2, sides=0)["faces"]
    for f in cap:
        f.material_index = mi_metal
        f.smooth = False
    bmesh.ops.poke(bm, faces=cap)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    rim = [mw @ x.co for x in v1]
    bm.to_mesh(me)
    bm.free()
    me.update()
    plate_c = mw @ (c + d_l * (LIP + PLATE))
    # order rim points around the axis for the glow tube
    rim.sort(key=lambda p: math.atan2((p - plate_c).dot(F["v"]), (p - plate_c).dot(F["u"])))
    rim = [plate_c + (p - plate_c) * 1.0 - F["d"] * (LIP * 0.45) for p in rim]
    return plate_c, rim


# ------------------------------------------------------------------ mesh helpers (segment local frame)
def _new_faces(bm, before, mat):
    for f in set(bm.faces) - before:
        f.material_index = mat


def add_box(bm, x0, x1, y0, y1, z0, z1, bev, mat):
    before = set(bm.faces)
    vs = bmesh.ops.create_cube(bm, size=1.0)["verts"]
    for x in vs:
        x.co = Vector((x0 + (x.co.x + 0.5) * (x1 - x0), y0 + (x.co.y + 0.5) * (y1 - y0), z0 + (x.co.z + 0.5) * (z1 - z0)))
    edges = list({e for x in vs for e in x.link_edges})
    bmesh.ops.bevel(bm, geom=edges, offset=bev, segments=3, profile=0.5, affect="EDGES", clamp_overlap=True)
    _new_faces(bm, before, mat)


def add_knuckle(bm, width):
    before = set(bm.faces)
    r = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=16, radius1=KN_R, radius2=KN_R,
                              depth=width + 0.16 * CM, matrix=Matrix.Rotation(math.pi / 2, 4, "Y"))
    new = set(bm.faces) - before
    for f in new:
        f.material_index = 1
    bm.normal_update()
    caps = [f for f in new if abs(f.normal.x) > 0.9]
    bmesh.ops.inset_individual(bm, faces=caps, thickness=0.24 * CM, depth=-0.03 * CM)
    for f in caps:
        f.material_index = 3   # glowing knuckle cap


def segment_mesh(name, L, wd, th, tip):
    bm = bmesh.new()
    add_knuckle(bm, wd)
    y1 = L if tip else L - KN_R - 0.05 * CM
    add_box(bm, -wd / 2, wd / 2, 0.15 * CM, y1, -th / 2, th / 2, (0.34 if tip else 0.22) * CM, 0)
    if tip:   # rubber fingertip pad on the palm (curl) side
        add_box(bm, -wd * 0.36, wd * 0.36, L - 0.78 * CM, L - 0.24 * CM, th / 2 - 0.06 * CM, th / 2 + 0.09 * CM,
                0.04 * CM, 2)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = p.material_index in (0, 2)
    for m in MATS:
        me.materials.append(bpy.data.materials[m])
    return me


def parent_keep(ob, bone_name, mw):
    b = rig.data.bones[bone_name]
    ob.parent = rig
    ob.parent_type = "BONE"
    ob.parent_bone = bone_name
    ob.matrix_parent_inverse = (rig.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))).inverted()
    ob.matrix_world = mw


# ------------------------------------------------------------------ build
def digit_frames(F, plate_c):
    out = {}
    for dg, (wo, no, splay, tilt, wd, th, LA, LB) in DIGITS.items():
        dirv = (F["d"] * math.cos(math.radians(splay)) + F["w"] * math.sin(math.radians(splay)))
        dirv = (dirv * math.cos(math.radians(tilt)) + F["n"] * math.sin(math.radians(tilt))).normalized()
        zc = (F["n"] - dirv * dirv.dot(F["n"])).normalized()
        if dg == "Thumb":
            zc = -zc
        X = dirv.cross(zc).normalized()
        j0 = plate_c + F["d"] * KN_R + F["w"] * (wo * CM) + F["n"] * (no * CM)
        out[dg] = dict(dir=dirv, z=zc, X=X, j0=j0, j1=j0 + dirv * (LA * CM), wd=wd * CM, th=th * CM,
                       LA=LA * CM, LB=LB * CM)
    return out


# ------------------------------------------------------------------ arm hose reroute
def _resample(P, n):
    L = [0.0]
    for a, b in zip(P, P[1:]):
        L.append(L[-1] + (b - a).length)
    out, j = [], 0
    for i in range(n):
        t = L[-1] * i / (n - 1)
        while j < len(P) - 2 and L[j + 1] < t:
            j += 1
        f = (t - L[j]) / max(L[j + 1] - L[j], 1e-9)
        out.append(P[j].lerp(P[j + 1], min(max(f, 0), 1)))
    return out


def _frames(P):
    T = [(P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized() for i in range(len(P))]
    a = Vector((0, 0, 1)) if abs(T[0].z) < 0.9 else Vector((1, 0, 0))
    N = [(a - T[0] * T[0].dot(a)).normalized()]
    for i in range(1, len(P)):
        n = T[i - 1].rotation_difference(T[i]) @ N[-1]
        N.append((n - T[i] * T[i].dot(n)).normalized())
    B = [t.cross(n) for t, n in zip(T, N)]
    return T, N, B


def reroute_hose(side, F, segs=12, join=70, a_anchor=0.060):
    """The hose used to leave the mitten tip on the arm axis (now the finger zone). Re-sweep its ribbed
    rings along a new path: plugs into the back of the forearm cuff, blends into the old loop at ring
    `join`. Vertex order is kept, so the existing forearm->body skin weights still apply."""
    ob = bpy.data.objects.get("RB_Hose_Arm_" + side)
    if ob is None:      # v004: arm hoses removed at the user's request
        return "hose %s: removed, skipped" % side
    oname = "RB_Hose_Arm_%s_orig" % side
    orig = bpy.data.meshes.get(oname)
    if orig is None:
        orig = ob.data.copy()
        orig.name = oname
        orig.use_fake_user = True
    old = ob.data
    me = orig.copy()
    ob.data = me
    if old.users == 0:
        bpy.data.meshes.remove(old)
    me.name = "RB_Hose_Arm_" + side
    me.use_fake_user = False
    mw = ob.matrix_world.copy()
    mwi = mw.inverted()
    V = [mw @ v.co for v in me.vertices]
    nv = len(V)
    rings = (nv - 2) // segs
    C = [sum(V[i * segs:(i + 1) * segs], Vector()) / segs for i in range(rings)]
    T, N, B = _frames(C)
    loc = [[((V[i * segs + j] - C[i]).dot(T[i]), (V[i * segs + j] - C[i]).dot(N[i]), (V[i * segs + j] - C[i]).dot(B[i]))
            for j in range(segs)] for i in range(rings)]
    cap0 = tuple((V[nv - 2] - C[0]).dot(x) for x in (T[0], N[0], B[0]))
    cap1 = tuple((V[nv - 1] - C[-1]).dot(x) for x in (T[-1], N[-1], B[-1]))
    # new path
    P0 = F["head"] + F["d"] * (a_anchor - 0.0468) * F["k"] - F["u"] * 0.0195
    T0 = (-F["u"] * 0.75 + F["d"] * 0.65).normalized()
    P3, T3 = C[join], T[join]
    L = (P3 - P0).length
    P1, P2 = P0 + T0 * L * 0.45, P3 - T3 * L * 0.45
    bez = []
    for i in range(80):
        t = i / 79
        bez.append(P0 * (1 - t) ** 3 + P1 * 3 * t * (1 - t) ** 2 + P2 * 3 * t * t * (1 - t) + P3 * t ** 3)
    Cn = _resample(bez + C[join + 1:], rings)
    Tn, Nn, Bn = _frames(Cn)
    for i in range(rings):
        for j in range(segs):
            lt, ln, lb = loc[i][j]
            me.vertices[i * segs + j].co = mwi @ (Cn[i] + Tn[i] * lt + Nn[i] * ln + Bn[i] * lb)
    me.vertices[nv - 2].co = mwi @ (Cn[0] + Tn[0] * cap0[0] + Nn[0] * cap0[1] + Bn[0] * cap0[2])
    me.vertices[nv - 1].co = mwi @ (Cn[-1] + Tn[-1] * cap1[0] + Nn[-1] * cap1[1] + Bn[-1] * cap1[2])
    me.update()
    return "hose %s rerouted: start %s cm" % (side, tuple(round(x * 100, 2) for x in Cn[0]))


def cleanup():
    for o in list(bpy.data.objects):
        if o.name.startswith(("RB_Finger", "RB_Thumb", "FX_Ring_Palm")):
            me = o.data
            bpy.data.objects.remove(o, do_unlink=True)
            if me and me.users == 0:
                bpy.data.meshes.remove(me)


def build_all(tube):
    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    report = []
    try:
        cleanup()
        frames = {}
        for side in ("L", "R"):
            F = frame(side)
            plate_c, rim = cut_forearm(side, F)
            frames[side] = (F, plate_c, rim, digit_frames(F, plate_c))
        # bones
        vl = bpy.context.view_layer
        if bpy.context.object and bpy.context.object.mode != "OBJECT":
            bpy.ops.object.mode_set(mode="OBJECT")
        for o in vl.objects:
            o.select_set(False)
        vl.objects.active = rig
        rig.select_set(True)
        bpy.ops.object.mode_set(mode="EDIT")
        eb = rig.data.edit_bones
        for b in [b for b in eb if b.name.startswith(("DEF-Finger", "DEF-Thumb"))]:
            eb.remove(b)
        for side, (F, plate_c, rim, D) in frames.items():
            for dg, f in D.items():
                a = eb.new("DEF-%s_A.%s" % (dg, side))
                a.head, a.tail = f["j0"], f["j1"]
                a.align_roll(f["z"])
                a.parent = eb["DEF-Forearm." + side]
                bb = eb.new("DEF-%s_B.%s" % (dg, side))
                bb.head, bb.tail = f["j1"], f["j1"] + f["dir"] * f["LB"]
                bb.align_roll(f["z"])
                bb.parent = a
                bb.use_connect = False
        bpy.ops.object.mode_set(mode="OBJECT")
        # pose settings + limits
        for pb in rig.pose.bones:
            if not pb.name.startswith(("DEF-Finger", "DEF-Thumb")):
                continue
            pb.rotation_mode = "XYZ"
            pb.lock_location = (True, True, True)
            pb.lock_rotation[1] = True
            for c in list(pb.constraints):
                pb.constraints.remove(c)
            c = pb.constraints.new("LIMIT_ROTATION")
            c.owner_space = "LOCAL"
            c.use_limit_x = c.use_limit_y = c.use_limit_z = True
            c.min_x, c.max_x = math.radians(-12), math.radians(105)
            c.min_y = c.max_y = 0
            lim = 20 if "_A." in pb.name else 0
            c.min_z, c.max_z = math.radians(-lim), math.radians(lim)
        # meshes
        for side, (F, plate_c, rim, D) in frames.items():
            for dg, f in D.items():
                M = Matrix((f["X"], f["dir"], f["z"])).transposed().to_4x4()
                for seg, L, tip, jt, tp in (("A", f["LA"], False, f["j0"], 1.0), ("B", f["LB"], True, f["j1"], 0.9)):
                    nm = "RB_%s_%s_%s" % (dg, seg, side)
                    me = segment_mesh(nm, L, f["wd"] * tp, f["th"] * tp, tip)
                    ob = bpy.data.objects.new(nm, me)
                    GEO.objects.link(ob)
                    Mj = M.copy()
                    Mj.translation = jt
                    parent_keep(ob, "DEF-%s_%s.%s" % (dg, seg, side), Mj)
                tipp = f["j1"] + f["dir"] * f["LB"]
                sh = rig.data.bones["DEF-Shoulder." + side].head_local
                report.append("%s.%s tip->shoulder %.2f cm" % (dg, side, (tipp - sh).length * 100))
            tube("FX_Ring_Palm_" + side, rim, 0.06 * CM, "M_FX_Glow", "DEF-Forearm." + side)
            report.append(reroute_hose(side, F))
    finally:
        rig.data.pose_position = "POSE"
        bpy.context.view_layer.update()
    return report
