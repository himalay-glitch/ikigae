# rb_deck.py — v004: hovering metal deck the robot stands on. exec() after rb_future.py (uses tube()).
# Deck top = Z 0 (robot feet stay on Z 0 per [SPEC]); the deck hangs below, the floor is lowered so it
# hovers. Deck is parented to the rig's root bone, so the hover bob (keyed on root in rb_anim) carries
# deck + robot together. Re-runnable.
import bpy, bmesh, math
from mathutils import Vector, Matrix

CM = 0.01
rig = bpy.data.objects["RB_Rig"]
HOVER_GAP = 0.13       # floor drop below deck top (m)


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def coll(name):
    c = bpy.data.collections.get(name)
    if not c:
        c = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(c)
    return c


def materials():
    def principled(name):
        m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        m.use_nodes = True
        return m, next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    # brushed steel with circular (radial-tangent) brushing
    m, b = principled("M_Deck_Metal")
    b.inputs["Base Color"].default_value = (*srgb("#C3C9D1"), 1)
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.26
    b.inputs["Anisotropic"].default_value = 0.65
    nt = m.node_tree
    tg = next((n for n in nt.nodes if n.type == "TANGENT"), None) or nt.nodes.new("ShaderNodeTangent")
    tg.direction_type = "RADIAL"
    tg.axis = "Z"
    nt.links.new(tg.outputs["Tangent"], b.inputs["Tangent"])
    # fine brushed streak variation (render-only nicety)
    m, b = principled("M_Deck_Dark")
    b.inputs["Base Color"].default_value = (*srgb("#232A31"), 1)
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.34
    m, b = principled("M_FX_Thruster")
    col = srgb("#14D8FF")
    b.inputs["Base Color"].default_value = (*[c * 0.2 for c in col], 1)
    b.inputs["Emission Color"].default_value = (*col, 1)
    b.inputs["Emission Strength"].default_value = 5.0


# (r cm, z cm, material index of the segment ENDING at this point)
# 0 metal top, 1 dark metal, 2 cyan glow, 3 thruster glow
PROFILE = [
    (0.0, 0.0, 0),
    (5.6, 0.0, 0), (5.6, -0.08, 1), (5.85, -0.08, 2), (5.85, 0.0, 1),            # engraved ring 1
    (10.6, 0.0, 0), (10.6, -0.10, 1), (10.9, -0.10, 2), (10.9, 0.0, 1),          # engraved ring 2
    (14.9, 0.0, 0), (14.9, -0.16, 1), (15.3, -0.16, 2), (15.3, 0.0, 1),          # main glow ring
    (16.3, 0.0, 0), (16.65, -0.12, 0), (16.9, -0.42, 0),                         # rounded top edge
    (17.0, -0.55, 1), (17.0, -0.85, 1), (16.88, -0.88, 1),                       # rim band
    (16.88, -1.22, 2), (17.0, -1.25, 1), (17.0, -1.65, 1),                       # rim light strip
    (16.7, -2.05, 1), (16.1, -2.3, 1), (12.0, -2.4, 1),                          # under chamfer
    (11.2, -2.6, 1), (10.0, -3.5, 1), (7.0, -3.75, 1),                           # thruster housing cone
    (6.6, -3.85, 1), (6.1, -3.85, 2), (6.1, -3.95, 1), (5.7, -3.95, 1),          # thruster lip + ring
    (0.0, -4.05, 3),                                                              # thruster disc
]


def lathe_deck(segs=96):
    bm = bmesh.new()
    rings = []
    for r, z, _ in PROFILE:
        if r == 0.0:
            rings.append([bm.verts.new((0, 0, z * CM))])
        else:
            rings.append([bm.verts.new((r * CM * math.cos(2 * math.pi * i / segs),
                                        r * CM * math.sin(2 * math.pi * i / segs), z * CM)) for i in range(segs)])
    for k in range(1, len(rings)):
        a, b = rings[k - 1], rings[k]
        mat = PROFILE[k][2]
        for i in range(segs):
            j = (i + 1) % segs
            if len(a) == 1:
                f = bm.faces.new((a[0], b[j], b[i]))
            elif len(b) == 1:
                f = bm.faces.new((a[i], a[j], b[0]))
            else:
                f = bm.faces.new((a[i], a[j], b[j], b[i]))
            f.material_index = mat
            f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new("RB_Deck")
    bm.to_mesh(me)
    bm.free()
    for n in ("M_Deck_Metal", "M_Deck_Dark", "M_FX_Glow", "M_FX_Thruster"):
        me.materials.append(bpy.data.materials[n])
    return me


def radial_inlays(segs_n=12):
    """dark radial panel lines on the top between the glow rings (thin raised strips, no booleans)"""
    bm = bmesh.new()
    for i in range(segs_n):
        a = 2 * math.pi * (i + 0.5) / segs_n
        vs = bmesh.ops.create_cube(bm, size=1.0)["verts"]
        M = Matrix.Rotation(a, 4, "Z") @ Matrix.Translation(((6.3 + 10.3) / 2 * CM, 0, 0.012 * CM)) @ \
            Matrix.Diagonal((4.0 * CM, 0.12 * CM, 0.024 * CM, 1))
        bmesh.ops.transform(bm, matrix=M, verts=vs)
        vs = bmesh.ops.create_cube(bm, size=1.0)["verts"]
        M = Matrix.Rotation(a, 4, "Z") @ Matrix.Translation(((11.4 + 14.4) / 2 * CM, 0, 0.012 * CM)) @ \
            Matrix.Diagonal((3.0 * CM, 0.12 * CM, 0.024 * CM, 1))
        bmesh.ops.transform(bm, matrix=M, verts=vs)
    me = bpy.data.meshes.new("RB_Deck_Inlays")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(bpy.data.materials["M_Deck_Dark"])
    return me


def parent_root(ob):
    b = rig.data.bones["root"]
    mw = ob.matrix_world.copy() if ob.parent else Matrix.Translation(ob.location)
    ob.parent = rig
    ob.parent_type = "BONE"
    ob.parent_bone = "root"
    ob.matrix_parent_inverse = (rig.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))).inverted()
    ob.matrix_world = mw


def cleanup():
    for o in list(bpy.data.objects):
        if o.name.startswith(("RB_Deck", "FX_Deck", "LGT_Hover")):
            d = o.data
            bpy.data.objects.remove(o, do_unlink=True)
            if d is not None and d.users == 0:
                (bpy.data.meshes if isinstance(d, bpy.types.Mesh) else bpy.data.lights).remove(d)


def build_all(tube):
    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    try:
        cleanup()
        materials()
        C = coll("ROBOT_Deck")
        out = []
        for me in (lathe_deck(), radial_inlays()):
            ob = bpy.data.objects.new(me.name, me)
            C.objects.link(ob)
            parent_root(ob)
            out.append(ob.name)
        # glowing footprint docks around each foot (foot 6.8 x 5.6 at X +-5.2; outline 7.8 x 6.8)
        import importlib
        for s, sfx in ((1, "L"), (-1, "R")):
            fo = bpy.data.objects["RB_Foot_" + sfx]
            dg = bpy.context.evaluated_depsgraph_get()
            e = fo.evaluated_get(dg)
            vs = [fo.matrix_world @ v.co for v in e.data.vertices]
            cx = (min(v.x for v in vs) + max(v.x for v in vs)) / 2
            cy = (min(v.y for v in vs) + max(v.y for v in vs)) / 2
            pts = []
            w, h, r, n = 7.8 * CM, 7.0 * CM, 1.6 * CM, 8
            for (x, y, a0) in ((w / 2 - r, h / 2 - r, 0), (-(w / 2 - r), h / 2 - r, 90),
                               (-(w / 2 - r), -(h / 2 - r), 180), (w / 2 - r, -(h / 2 - r), 270)):
                for i in range(n + 1):
                    a = math.radians(a0 + 90 * i / n)
                    pts.append(Vector((cx + x + r * math.cos(a), cy + y + r * math.sin(a), 0.0)))
            ob = tube("FX_Deck_Dock_" + sfx, pts, 0.06 * CM, "M_FX_Glow", "root")
            for c in list(ob.users_collection):
                c.objects.unlink(ob)
            C.objects.link(ob)
            out.append(ob.name)
        # floor drop + hover glow light (render only)
        g = bpy.data.objects.get("ENV_Ground")
        if g:
            g.location.z = -HOVER_GAP
        L = bpy.data.lights.new("LGT_Hover", "AREA")
        L.shape = "DISK"
        L.size = 0.11
        L.energy = 6.0
        L.color = (0.35, 0.85, 1.0)
        lo = bpy.data.objects.new("LGT_Hover", L)
        coll("ROBOT_Lights").objects.link(lo)
        lo.location = (0, 0, -0.045)
        parent_root(lo)
        out.append(lo.name)
        return out
    finally:
        rig.data.pose_position = "POSE"
        bpy.context.view_layer.update()
