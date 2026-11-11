# rb_legs.py — v006: upgraded feet + legs. exec() after rb_hands.py (uses add_box / parent_keep).
# Foot keeps the [SPEC] envelope 6.80 W x 5.60 D x 4.80 H (toe panel adds 0.1 cm proud), centred on the
# DEF-Foot bone head (X +-5.2, Y 0.5). Leg = chrome piston on DEF-Body that telescopes into the foot's
# ankle socket (DEF-Foot), so the body bob/tilt in the clips reads as suspension travel, never a gap.
# Replaces RB_Foot_*, RB_Leg_*, RB_Hose_Leg_* (originals kept as fake-user meshes *_orig). Re-runnable.
import bpy, bmesh, math
from mathutils import Vector, Matrix

CM = 0.01
rig = bpy.data.objects["RB_Rig"]
GEO = bpy.data.collections["ROBOT_Geo"]
FOOT_MATS = ["M_Accent", "M_Rubber", "M_FX_Glow", "M_Deck_Dark", "M_Joint_Metal"]
LEG_MATS = ["M_Joint_Metal", "M_Chrome", "M_FX_Glow", "M_Accent"]
W, D, H = 6.8, 5.6, 4.8


def chrome():
    m = bpy.data.materials.get("M_Chrome") or bpy.data.materials.new("M_Chrome")
    m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    b.inputs["Base Color"].default_value = (0.86, 0.88, 0.9, 1)
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.12


def _new(bm, before, mat):
    for f in set(bm.faces) - before:
        f.material_index = mat


def box(bm, x0, x1, y0, y1, z0, z1, bev, mat, toe=None, segs=3):
    """rounded box (cm); toe=(y_from, z_drop): lowers the front-top edge for a sloped toe"""
    before = set(bm.faces)
    vs = bmesh.ops.create_cube(bm, size=1.0)["verts"]
    for v in vs:
        x = x0 if v.co.x < 0 else x1
        y = y0 if v.co.y < 0 else y1
        z = z0 if v.co.z < 0 else z1
        if toe and v.co.y < 0 and v.co.z > 0:
            z -= toe
        v.co = Vector((x, y, z)) * CM
    edges = list({e for v in vs for e in v.link_edges})
    bmesh.ops.bevel(bm, geom=edges, offset=bev * CM, segments=segs, profile=0.5, affect="EDGES", clamp_overlap=True)
    _new(bm, before, mat)


def cyl(bm, cx, cy, z0, z1, r, mat, bev=0.0, segs=32):
    before = set(bm.faces)
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segs, radius1=r * CM, radius2=r * CM,
                          depth=(z1 - z0) * CM, matrix=Matrix.Translation((cx * CM, cy * CM, (z0 + z1) / 2 * CM)))
    new = set(bm.faces) - before
    if bev > 0:
        edges = list({e for f in new for e in f.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(60)})
        bmesh.ops.bevel(bm, geom=edges, offset=bev * CM, segments=2, profile=0.5, affect="EDGES", clamp_overlap=True)
    _new(bm, before, mat)


def foot_mesh(name, s):
    """built at local origin = foot bone head (sole centre); +X is the robot's outer side when s=+1"""
    bm = bmesh.new()
    hx, hy = W / 2, D / 2
    box(bm, -hx, hx, -hy, hy, 0.08, 0.75, 0.28, 1)                                 # rubber sole
    for i in range(7):                                                              # tread ribs underneath
        y = -hy + 0.6 + i * (D - 1.2) / 6
        box(bm, -hx + 0.5, hx - 0.5, y - 0.12, y + 0.12, 0.0, 0.12, 0.04, 1, segs=1)  # ribs bottom = Z 0 [SPEC]
    box(bm, -hx + 0.12, hx - 0.12, -hy + 0.12, hy - 0.12, 0.75, 0.9, 0.06, 2, segs=1)  # glowing midsole line
    box(bm, -hx + 0.1, hx - 0.1, -hy + 0.1, hy - 0.1, 0.9, 3.95, 0.55, 0, toe=1.35)   # orange armour upper, sloped toe
    # toe panel: dark plate on the front face + two cyan slits
    box(bm, -2.3, 2.3, -hy - 0.02, -hy + 0.25, 1.15, 2.25, 0.12, 3, segs=2)
    for z in (1.5, 1.9):
        box(bm, -1.8, 1.8, -hy - 0.1, -hy + 0.1, z - 0.06, z + 0.06, 0.02, 2, segs=1)
    # outer-side vents + status LED
    xo = s * (hx - 0.02)
    for z in (1.75, 2.2, 2.65):
        box(bm, xo - 0.12, xo + 0.12, 0.6, 2.2, z - 0.1, z + 0.1, 0.04, 3, segs=1)
    box(bm, xo - 0.1, xo + 0.1, -1.6, -1.2, 2.05, 2.45, 0.05, 2, segs=1)
    # rubber heel bumper
    box(bm, -2.0, 2.0, hy - 0.25, hy + 0.12, 0.95, 2.3, 0.15, 1, segs=2)
    # ankle socket (top = 4.80 [SPEC] foot height) + glow lip
    cyl(bm, 0, 0.3, 3.4, 4.8, 1.45, 4, bev=0.18)
    cyl(bm, 0, 0.3, 4.62, 4.72, 1.5, 2)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = p.material_index in (0, 1, 4)
    for m in FOOT_MATS:
        me.materials.append(bpy.data.materials[m])
    return me


def leg_mesh(name):
    """local origin = foot bone head; parts above the socket, hanging from the body underside (Z 6.5)"""
    bm = bmesh.new()
    cyl(bm, 0, 0.3, 3.9, 6.0, 1.05, 1)                     # chrome piston (enters the socket below 4.8)
    cyl(bm, 0, 0.3, 5.15, 5.27, 1.12, 2)                   # glow band on the piston
    cyl(bm, 0, 0.3, 5.75, 6.9, 2.0, 0, bev=0.25)           # hip actuator housing (sinks into body)
    cyl(bm, 0, 0.3, 5.78, 5.9, 2.05, 2)                    # glow ring at its lip
    for ang in (45, 135, 225, 315):                        # bolt heads around the housing
        a = math.radians(ang)
        cyl(bm, 1.75 * math.cos(a), 0.3 + 1.75 * math.sin(a), 5.68, 5.78, 0.16, 1, segs=12)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = p.material_index in (0, 1)
    for m in LEG_MATS:
        me.materials.append(bpy.data.materials[m])
    return me


def retire(name):
    o = bpy.data.objects.get(name)
    if o is None:
        return
    keep = bpy.data.meshes.get(name + "_orig")
    if keep is None:
        o.data.name = name + "_orig"
        o.data.use_fake_user = True
    me = o.data
    bpy.data.objects.remove(o, do_unlink=True)
    if me.users == 0:
        bpy.data.meshes.remove(me)


def build_all(parent_keep):
    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    try:
        chrome()
        out = []
        for side, s in (("L", 1), ("R", -1)):
            for n in ("RB_Foot_", "RB_Leg_", "RB_Hose_Leg_"):
                retire(n + side)
            head = rig.data.bones["DEF-Foot." + side].head_local.copy()
            M = Matrix.Translation(head)
            fo = bpy.data.objects.new("RB_Foot_" + side, foot_mesh("RB_Foot_" + side, s))
            GEO.objects.link(fo)
            parent_keep(fo, "DEF-Foot." + side, M)
            lg = bpy.data.objects.new("RB_Leg_" + side, leg_mesh("RB_Leg_" + side))
            GEO.objects.link(lg)
            parent_keep(lg, "DEF-Body", M)
            out += [fo.name, lg.name]
        return out
    finally:
        rig.data.pose_position = "POSE"
        bpy.context.view_layer.update()
