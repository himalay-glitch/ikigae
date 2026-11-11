# rb_lib.py — procedural helpers for the RB robot build (Blender 4.4, bpy/bmesh only).
# Usage inside Blender:  exec(open(RB_LIB).read())
# All lengths in metres (scene unit = cm display, unit scale 1.0).
import bpy, bmesh, math
from mathutils import Vector, Matrix, Quaternion

# ---------------------------------------------------------------- collections / objects
def coll(name):
    c = bpy.data.collections.get(name)
    if c is None:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
    return c

def remove_obj(name):
    o = bpy.data.objects.get(name)
    if o:
        data = o.data
        bpy.data.objects.remove(o, do_unlink=True)
        if data is not None and getattr(data, "users", 1) == 0:
            if isinstance(data, bpy.types.Mesh): bpy.data.meshes.remove(data)
            elif isinstance(data, bpy.types.Curve): bpy.data.curves.remove(data)

def make_obj(name, verts, faces, collection="ROBOT_Geo", origin=(0, 0, 0),
             mats=None, mat_idx=None, smooth=True, recalc=False):
    """verts in WORLD space; origin = pivot (object location). Replaces existing object."""
    remove_obj(name)
    me = bpy.data.meshes.get(name)
    if me: bpy.data.meshes.remove(me)
    o_v = Vector(origin)
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(Vector(v) - o_v) for v in verts], [], [tuple(f) for f in faces])
    me.validate(clean_customdata=False)
    if recalc:
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(me); bm.free()
    if mats:
        for m in mats: me.materials.append(bpy.data.materials.get(m) if isinstance(m, str) else m)
    if mat_idx is not None:
        me.polygons.foreach_set("material_index", list(mat_idx))
    me.polygons.foreach_set("use_smooth", [smooth] * len(me.polygons))
    me.update()
    ob = bpy.data.objects.new(name, me)
    ob.location = o_v
    coll(collection).objects.link(ob)
    return ob

def set_origin_keep(ob, pivot):
    """Move object origin to world `pivot` without moving geometry."""
    mw = ob.matrix_world.copy()
    local = mw.inverted() @ Vector(pivot)
    ob.data.transform(Matrix.Translation(-local))
    ob.matrix_world = mw @ Matrix.Translation(local)

# ---------------------------------------------------------------- colour / materials
def srgb2lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def hexcol(h, alpha=1.0):
    h = h.lstrip("#")
    return tuple(srgb2lin(int(h[i:i + 2], 16) / 255.0) for i in (0, 2, 4)) + (alpha,)

def principled(mat):
    return next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")

def make_mat(name, hex_base, rough=0.5, metal=0.0, coat=0.0, coat_rough=0.05,
             emit_hex=None, emit_strength=0.0, alpha=1.0, spec_ior_level=0.5):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = principled(m)
    b.inputs["Base Color"].default_value = hexcol(hex_base)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Specular IOR Level"].default_value = spec_ior_level
    if "Coat Weight" in b.inputs:
        b.inputs["Coat Weight"].default_value = coat
        b.inputs["Coat Roughness"].default_value = coat_rough
    if emit_hex:
        b.inputs["Emission Color"].default_value = hexcol(emit_hex)
        b.inputs["Emission Strength"].default_value = emit_strength
    b.inputs["Alpha"].default_value = alpha
    m.diffuse_color = hexcol(hex_base, alpha)  # viewport solid colour
    m.roughness = rough; m.metallic = metal
    if alpha < 1.0:
        try: m.surface_render_method = "BLENDED"
        except Exception: m.blend_method = "BLEND"
    return m

# ---------------------------------------------------------------- rounded box (fillet-exact, quad grid)
def _axis_samples(lo, hi, r, nf, nflat, extra):
    s = set()
    for k in range(nf + 1):
        t = r * math.tan(math.radians(45.0 * k / nf))
        s.add(round(lo + r - t, 7)); s.add(round(hi - r + t, 7))
    for k in range(nflat + 1):
        s.add(round(lo + r + (hi - lo - 2 * r) * k / nflat, 7))
    for e in extra:
        if lo < e < hi: s.add(round(e, 7))
    return sorted(s)

def rbox(mn, mx, r, nf=4, nflat=(8, 8, 8), pillow=None, extra=None):
    """Rounded box with exact R fillets. Returns (verts, faces, face_centers_cube, face_axis).
    pillow: dict face-> bulge in m, keys '+x','-x','+y','-y','+z','-z' (outward, max at face centre).
    extra: dict axis('x'/'y'/'z') -> list of coordinates to force grid lines (seams/material splits)."""
    pillow = pillow or {}; extra = extra or {}
    keys = "xyz"
    S = [_axis_samples(mn[a], mx[a], r, nf, nflat[a], extra.get(keys[a], [])) for a in range(3)]
    n = [len(s) for s in S]
    lo = Vector(mn); hi = Vector(mx); inner_lo = lo + Vector((r, r, r)); inner_hi = hi - Vector((r, r, r))
    idx = {}; verts = []
    def vid(i, j, k):
        key = (i, j, k)
        if key in idx: return idx[key]
        p = Vector((S[0][i], S[1][j], S[2][k]))
        inner = Vector(tuple(min(max(p[a], inner_lo[a]), inner_hi[a]) for a in range(3)))
        d = p - inner
        q = inner + d.normalized() * r if d.length > 1e-9 else p.copy()
        # pillow
        ijk = (i, j, k)
        for a in range(3):
            for sgn, b in ((-1, 0), (1, n[a] - 1)):
                if ijk[a] != b: continue
                pv = pillow.get(("+" if sgn > 0 else "-") + keys[a], 0.0)
                if not pv: continue
                o1, o2 = [x for x in range(3) if x != a]
                u = (2 * (p[o1] - lo[o1]) / (hi[o1] - lo[o1])) - 1
                v = (2 * (p[o2] - lo[o2]) / (hi[o2] - lo[o2])) - 1
                f = max(0.0, 1 - u * u) * max(0.0, 1 - v * v)
                q[a] += sgn * pv * f
        idx[key] = len(verts); verts.append(q)
        return idx[key]
    faces = []; centers = []; axes = []
    for a in range(3):
        o1, o2 = [x for x in range(3) if x != a]
        for sgn, b in ((-1, 0), (1, n[a] - 1)):
            for u in range(n[o1] - 1):
                for v in range(n[o2] - 1):
                    cells = []
                    for (du, dv) in ((0, 0), (1, 0), (1, 1), (0, 1)):
                        ijk = [0, 0, 0]; ijk[a] = b; ijk[o1] = u + du; ijk[o2] = v + dv
                        cells.append(tuple(ijk))
                    pts = [Vector((S[0][c[0]], S[1][c[1]], S[2][c[2]])) for c in cells]
                    nrm = (pts[1] - pts[0]).cross(pts[3] - pts[0])
                    want = Vector((0, 0, 0)); want[a] = sgn
                    if nrm.dot(want) < 0: cells.reverse()
                    faces.append([vid(*c) for c in cells])
                    centers.append(sum(pts, Vector()) / 4.0)
                    axes.append(("+" if sgn > 0 else "-") + keys[a])
    return verts, faces, centers, axes

def split_build(verts, faces, classify, **kw):
    """classify(i)-> key or None. Returns {key: (verts, faces, face_ids)} with compact reindexing."""
    groups = {}
    for fi, f in enumerate(faces):
        k = classify(fi)
        if k is None: continue
        groups.setdefault(k, []).append(fi)
    out = {}
    for k, fids in groups.items():
        remap = {}; vv = []; ff = []
        for fi in fids:
            nf = []
            for vi in faces[fi]:
                if vi not in remap: remap[vi] = len(vv); vv.append(verts[vi])
                nf.append(remap[vi])
            ff.append(nf)
        out[k] = (vv, ff, fids)
    return out

# ---------------------------------------------------------------- lathe (surface of revolution)
def frame_from(d, u_hint):
    d = Vector(d).normalized()
    u = Vector(u_hint); u = (u - d * u.dot(d))
    if u.length < 1e-6: u = d.orthogonal()
    u.normalize(); v = d.cross(u).normalized()
    return d, u, v

def lathe(profile, origin, d, u_hint=(1, 0, 0), segs=24, rx=1.0, ry=1.0, superexp=None):
    """profile: list of (t, r[, ou, ov]) along axis d from origin; r==0 at an end makes a pole.
    rx/ry scale the circle along u/v; superexp>2 gives a rounded-square section."""
    d, u, v = frame_from(d, u_hint); O = Vector(origin)
    verts = []; faces = []; rings = []
    for p in profile:
        t, r = p[0], p[1]; ou = p[2] if len(p) > 2 else 0.0; ov = p[3] if len(p) > 3 else 0.0
        c = O + d * t + u * ou + v * ov
        if r <= 1e-7:
            rings.append([len(verts)]); verts.append(c); continue
        ring = []
        for s in range(segs):
            a = 2 * math.pi * s / segs; ca, sa = math.cos(a), math.sin(a)
            if superexp:
                e = 2.0 / superexp
                ca = math.copysign(abs(ca) ** e, ca); sa = math.copysign(abs(sa) ** e, sa)
            ring.append(len(verts)); verts.append(c + u * (ca * r * rx) + v * (sa * r * ry))
        rings.append(ring)
    for A, B in zip(rings[:-1], rings[1:]):
        if len(A) == 1 and len(B) > 1:
            for s in range(segs): faces.append([A[0], B[(s + 1) % segs], B[s]])
        elif len(B) == 1 and len(A) > 1:
            for s in range(segs): faces.append([A[s], A[(s + 1) % segs], B[0]])
        else:
            for s in range(segs): faces.append([A[s], A[(s + 1) % segs], B[(s + 1) % segs], B[s]])
    return verts, faces

# ---------------------------------------------------------------- swept tube (corrugated hose)
def catmull(points, n):
    P = [Vector(p) for p in points]; P = [P[0] + (P[0] - P[1])] + P + [P[-1] + (P[-1] - P[-2])]
    out = []
    segs = len(P) - 3
    for i in range(segs):
        p0, p1, p2, p3 = P[i], P[i + 1], P[i + 2], P[i + 3]
        steps = n // segs
        for s in range(steps):
            t = s / steps; t2 = t * t; t3 = t2 * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P[-2].copy())
    return out

def sweep(points, radius, segs=12, samples=120, rib_pitch=0.0035, rib_amp=0.12, cap=True):
    pts = catmull(points, samples)
    L = [0.0]
    for a, b in zip(pts[:-1], pts[1:]): L.append(L[-1] + (b - a).length)
    T = []
    for i in range(len(pts)):
        a = pts[max(i - 1, 0)]; b = pts[min(i + 1, len(pts) - 1)]; T.append((b - a).normalized())
    N = T[0].orthogonal().normalized(); verts = []; faces = []; rings = []
    for i, p in enumerate(pts):
        if i > 0:
            q = T[i - 1].rotation_difference(T[i]); N = (q @ N).normalized()
        B = T[i].cross(N).normalized()
        r = radius * (1 + rib_amp * math.cos(2 * math.pi * L[i] / rib_pitch)) if rib_pitch else radius
        ring = []
        for s in range(segs):
            a = 2 * math.pi * s / segs
            ring.append(len(verts)); verts.append(p + N * (math.cos(a) * r) + B * (math.sin(a) * r))
        rings.append(ring)
    for A, Bv in zip(rings[:-1], rings[1:]):
        for s in range(segs): faces.append([A[s], A[(s + 1) % segs], Bv[(s + 1) % segs], Bv[s]])
    if cap:
        c0 = len(verts); verts.append(pts[0].copy())
        for s in range(segs): faces.append([c0, rings[0][(s + 1) % segs], rings[0][s]])
        c1 = len(verts); verts.append(pts[-1].copy())
        for s in range(segs): faces.append([rings[-1][s], rings[-1][(s + 1) % segs], c1])
    return verts, faces, L[-1]

# ---------------------------------------------------------------- rounded-rect slab (panels, glass, plates)
def rr_outline(w, h, r, cs):
    r = max(min(r, w / 2 - 1e-5, h / 2 - 1e-5), 1e-5); pts = []
    for (cx, cy, a0) in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90),
                         (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for k in range(cs + 1):
            a = math.radians(a0 + 90.0 * k / cs); pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

def slab(w, h, r, thick, bev, bulge=0.0, back_bulge=0.0, cs=6, rings=3, bev_segs=3, flat_back=False):
    """Rounded-rect slab in local XY, thickness along Z (front at +Z). Quarter-round edge bevel.
    Returns (verts, faces) local. Centre poles are triangle fans (flat/near-flat areas only)."""
    bev = min(bev, thick / 2 - 1e-5, w / 2 - 1e-4, h / 2 - 1e-4)
    def ring_at(inset, z, scale=1.0, bul=0.0):
        O = rr_outline(w - 2 * inset, h - 2 * inset, r - inset, cs)
        return [Vector((x * scale, y * scale, z + bul * (1 - scale * scale))) for x, y in O]
    seq = []  # list of rings (list of Vector) or single Vector pole
    seq.append(Vector((0, 0, thick / 2 + bulge)))
    for k in range(1, rings): seq.append(ring_at(bev, thick / 2, k / rings, bulge))
    for k in range(bev_segs + 1):
        ph = math.radians(90.0 * k / bev_segs)
        seq.append(ring_at(bev * (1 - math.sin(ph)), thick / 2 - bev * (1 - math.cos(ph))))
    for k in range(bev_segs + 1):
        ph = math.radians(90.0 * k / bev_segs)
        seq.append(ring_at(bev * (1 - math.cos(ph)), -thick / 2 + bev * (1 - math.sin(ph))))
    for k in range(rings - 1, 0, -1): seq.append(ring_at(bev, -thick / 2, k / rings, -back_bulge))
    seq.append(Vector((0, 0, -thick / 2 - back_bulge)))
    verts = []; ids = []
    for s in seq:
        if isinstance(s, Vector): ids.append([len(verts)]); verts.append(s)
        else:
            ids.append(list(range(len(verts), len(verts) + len(s)))); verts.extend(s)
    faces = []; n = len(ids[1])
    for A, B in zip(ids[:-1], ids[1:]):
        if len(A) == 1: faces += [[A[0], B[s], B[(s + 1) % n]] for s in range(n)]
        elif len(B) == 1: faces += [[A[(s + 1) % n], A[s], B[0]] for s in range(n)]
        else: faces += [[A[s], B[s], B[(s + 1) % n], A[(s + 1) % n]] for s in range(n)]
    return verts, faces

def xform(verts, M):
    return [M @ Vector(v) for v in verts]

# local slab (X=width, Y=height, Z=front) -> world facing -Y (front view)
M_FRONT = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
# facing +Y (back)
M_BACK = Matrix(((-1, 0, 0, 0), (0, 0, 1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
# facing +X (robot's left side): local X -> world -Y? use: local X->+Y... (width along Y)
M_SIDE_PX = Matrix(((0, 0, 1, 0), (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
M_SIDE_NX = Matrix(((0, 0, -1, 0), (-1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 0, 1)))

def place(M, loc):
    return Matrix.Translation(Vector(loc)) @ M

# ---------------------------------------------------------------- modifiers
def add_bevel(ob, width=0.0008, segs=3, angle=35.0, harden=True, name="Bevel"):
    m = ob.modifiers.new(name, "BEVEL")
    m.width = width; m.segments = segs; m.limit_method = "ANGLE"
    m.angle_limit = math.radians(angle); m.harden_normals = harden; m.use_clamp_overlap = True
    return m

def add_wn(ob):
    m = ob.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL"); m.keep_sharp = True; m.weight = 50
    return m

def add_solidify(ob, thick=0.0025, offset=-1.0):
    m = ob.modifiers.new("Solidify", "SOLIDIFY"); m.thickness = thick; m.offset = offset
    m.use_even_offset = True; m.use_rim = True; m.use_quality_normals = True
    return m

def add_subsurf(ob, lv=1, render=2):
    m = ob.modifiers.new("Subdivision", "SUBSURF"); m.levels = lv; m.render_levels = render
    return m

def add_bool(ob, cutter, name=None):
    m = ob.modifiers.new(name or ("Bool_" + cutter.name), "BOOLEAN")
    m.operation = "DIFFERENCE"; m.solver = "EXACT"; m.object = cutter
    return m

def cutter_obj(name, verts, faces):
    ob = make_obj(name, verts, faces, collection="ROBOT_Cutters", smooth=False, recalc=True)
    ob.display_type = "WIRE"; ob.hide_render = True
    return ob

# ---------------------------------------------------------------- reporting
def bbox_world(ob, eval_mods=True):
    dg = bpy.context.evaluated_depsgraph_get()
    oe = ob.evaluated_get(dg) if eval_mods else ob
    pts = [ob.matrix_world @ Vector(c) for c in oe.bound_box]
    mn = Vector(tuple(min(p[a] for p in pts) for a in range(3)))
    mx = Vector(tuple(max(p[a] for p in pts) for a in range(3)))
    return mn, mx

def report(names=None, coll_name="ROBOT_Geo"):
    obs = [bpy.data.objects[n] for n in names] if names else list(bpy.data.collections[coll_name].all_objects)
    lines = []
    for ob in sorted(obs, key=lambda o: o.name):
        if ob.type != "MESH": continue
        mn, mx = bbox_world(ob); d = mx - mn
        lines.append(f"{ob.name:24s} size {d.x*100:6.2f} x {d.y*100:6.2f} x {d.z*100:6.2f} cm | "
                     f"X {mn.x*100:6.2f}..{mx.x*100:6.2f}  Y {mn.y*100:6.2f}..{mx.y*100:6.2f}  Z {mn.z*100:6.2f}..{mx.z*100:6.2f}")
    print("\n".join(lines))

def tri_count(obs):
    dg = bpy.context.evaluated_depsgraph_get(); total = 0
    for ob in obs:
        if ob.type != "MESH": continue
        me = ob.evaluated_get(dg).to_mesh()
        total += sum(len(p.vertices) - 2 for p in me.polygons)
        ob.evaluated_get(dg).to_mesh_clear()
    return total
