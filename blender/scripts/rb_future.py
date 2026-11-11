# rb_future.py — v003 "futuristic" pass. exec() inside the opened robot .blend (v002).
# Keeps every [SPEC] dimension, the orange shell colours, rig, animations and export path.
# Adds a cyan light layer (complementary to the orange): seam glow, screen ring, joint rings,
# elbow bands, antenna orb, glowing foot plates, cyan LED eyes, anodised-titanium joints,
# deeper clear-coat on the shell, and a cool rim light + glare for renders.
# Re-runnable: removes its own FX_ objects/materials first.
import bpy, math
from mathutils import Vector, Matrix

CM = 0.01
rig = bpy.data.objects["RB_Rig"]
GEO = bpy.data.collections["ROBOT_Geo"]


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def bsdf(m):
    return next(n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED")


def glow_mat(name, hexcol, strength, base_dim=0.15):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = bsdf(m)
    col = srgb(hexcol)
    b.inputs["Base Color"].default_value = (*[c * base_dim for c in col], 1)
    b.inputs["Roughness"].default_value = 0.3
    b.inputs["Metallic"].default_value = 0.0
    b.inputs["Emission Color"].default_value = (*col, 1)
    b.inputs["Emission Strength"].default_value = strength
    return m


def materials():
    cyan = "#14D8FF"
    glow_mat("M_FX_Glow", cyan, 2.6)          # rings, orb, foot plates (kept <5 so AgX keeps the hue)
    glow_mat("M_FX_Seam", cyan, 2.5, 0.3)      # inner frame seen through the 0.2 cm seams
    # LED eyes: soft cyan-white (readable dots, on-theme)
    b = bsdf(bpy.data.materials["M_LED_Eyes"])
    b.inputs["Base Color"].default_value = (*srgb("#5CEBFF"), 1)
    b.inputs["Emission Color"].default_value = (*srgb("#5CEBFF"), 1)
    b.inputs["Emission Strength"].default_value = 3.2
    # shell: deeper automotive clear-coat
    for n, coat, rough in (("M_Shell_Main", 0.7, 0.18), ("M_Accent", 0.45, 0.32)):
        b = bsdf(bpy.data.materials[n])
        b.inputs["Coat Weight"].default_value = coat
        b.inputs["Coat Roughness"].default_value = 0.03
        b.inputs["Roughness"].default_value = rough
    # joints: blue-black anodised titanium
    b = bsdf(bpy.data.materials["M_Joint_Metal"])
    b.inputs["Base Color"].default_value = (*srgb("#2A3640"), 1)
    b.inputs["Roughness"].default_value = 0.3
    # visor glass: glossier, faint cool tint
    b = bsdf(bpy.data.materials["M_Screen_Glass"])
    b.inputs["Base Color"].default_value = (*srgb("#0A1418"), 1)
    b.inputs["Roughness"].default_value = 0.015
    b.inputs["Coat Weight"].default_value = 1.0
    b.inputs["Coat Roughness"].default_value = 0.0


def cleanup():
    for o in list(bpy.data.objects):
        if o.name.startswith("FX_"):
            me = o.data
            bpy.data.objects.remove(o, do_unlink=True)
            if me and me.users == 0:
                bpy.data.meshes.remove(me)
    for c in list(bpy.data.curves):
        if c.name.startswith("FX_") and c.users == 0:
            bpy.data.curves.remove(c)


def tube(name, pts, radius, mat, bone, closed=True, res=3):
    """Sweep a round profile along world-space points (metres) -> mesh object parented to bone."""
    cu = bpy.data.curves.new(name + "_crv", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = res
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, v in zip(sp.points, pts):
        p.co = (v.x, v.y, v.z, 1)
    sp.use_cyclic_u = closed
    tmp = bpy.data.objects.new(name + "_tmp", cu)
    GEO.objects.link(tmp)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    me.name = name
    bpy.data.objects.remove(tmp, do_unlink=True)
    bpy.data.curves.remove(cu)
    return finish(name, me, mat, bone)


def finish(name, me, mat, bone):
    for p in me.polygons:
        p.use_smooth = True
    me.materials.clear()
    me.materials.append(bpy.data.materials[mat])
    ob = bpy.data.objects.new(name, me)
    GEO.objects.link(ob)
    # origin at geometry centre (verts are world-space)
    c = sum((v.co for v in me.vertices), Vector()) / len(me.vertices)
    me.transform(Matrix.Translation(-c))
    mw = Matrix.Translation(c)  # don't read ob.matrix_world here: it is stale until a depsgraph update
    b = rig.data.bones[bone]
    ob.parent = rig
    ob.parent_type = "BONE"
    ob.parent_bone = bone
    ob.matrix_parent_inverse = (rig.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))).inverted()
    ob.matrix_world = mw
    return ob


def ellipse(center, ax_u, ax_v, ru, rv, n=48):
    return [center + ax_u * (ru * math.cos(t)) + ax_v * (rv * math.sin(t))
            for t in (2 * math.pi * i / n for i in range(n))]


def rrect_xz(cx, y, cz, w, h, r, n=10):
    pts = []
    corners = [(w / 2 - r, h / 2 - r, 0), (-(w / 2 - r), h / 2 - r, 90), (-(w / 2 - r), -(h / 2 - r), 180),
               (w / 2 - r, -(h / 2 - r), 270)]
    for x, z, a0 in corners:
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append(Vector((cx + x + r * math.cos(a), y, cz + z + r * math.sin(a))))
    return pts


def rrect_yz(x, cy, cz, w, h, r, n=10):
    # same outline as rrect_xz, laid in the YZ plane (local x -> world Y)
    return [Vector((x, cy + p.x, p.z)) for p in rrect_xz(0, 0, cz, w, h, r, n)]


def build_fx():
    out = []
    # 1. screen ring — on the bezel face, just outside the glass (glass 15.2 x 13.2 R2.8)
    out.append(tube("FX_Ring_Screen", rrect_xz(0, -9.12 * CM, 17.4 * CM, 15.75 * CM, 13.75 * CM, 3.05 * CM),
                    0.11 * CM, "M_FX_Glow", "DEF-Body"))
    for s, sfx, bs in ((1, "_L", ".L"), (-1, "_R", ".R")):
        # 2. shoulder rings — outer face of the Ø4.80 joint, inside the recess lip
        c = Vector((s * 12.52 * CM, -1.0 * CM, 15.5 * CM))
        out.append(tube("FX_Ring_Shoulder" + sfx, ellipse(c, Vector((0, 1, 0)), Vector((0, 0, 1)), 1.6 * CM, 1.6 * CM),
                        0.07 * CM, "M_FX_Glow", "DEF-Body"))
        # 2b. backpack outline — capsule just outside the grey vent panel (Y 2.95-6.05, Z 14.1-22.7)
        out.append(tube("FX_Ring_Backpack" + sfx, rrect_yz(s * 12.96 * CM, 4.5 * CM, 18.4 * CM, 3.4 * CM, 8.9 * CM, 1.55 * CM),
                        0.07 * CM, "M_FX_Glow", "DEF-Body"))
        # 3. elbow band — sits in the 0.2 cm upper/forearm seam
        b = rig.data.bones["DEF-Forearm" + bs]
        head, d = b.head_local.copy(), (b.tail_local - b.head_local).normalized()
        u = (Vector((0, -1, 0)) - d * d.dot(Vector((0, -1, 0)))).normalized()
        v = d.cross(u).normalized()
        out.append(tube("FX_Band_Elbow" + sfx, ellipse(head, u, v, 1.30 * CM, 1.30 * 0.92 * CM),
                        0.07 * CM, "M_FX_Glow", "DEF-Forearm" + bs))
    # 4. antenna orb (origin at its centre, follows the antenna wiggle)
    bm_me = bpy.data.meshes.new("FX_Orb_Antenna")
    import bmesh
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=0.42 * CM)
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((-11.9 * CM, 4.5 * CM, 35.75 * CM)))
    bm.to_mesh(bm_me)
    bm.free()
    out.append(finish("FX_Orb_Antenna", bm_me, "M_FX_Glow", "DEF-Antenna"))
    return [o.name for o in out]


def retarget():
    # inner frame glows through the seams; foot front plates become light bars
    fr = bpy.data.objects["RB_Frame_Inner"]
    fr.data.materials.clear()
    fr.data.materials.append(bpy.data.materials["M_FX_Seam"])
    for n in ("RB_Foot_L", "RB_Foot_R"):
        me = bpy.data.objects[n].data
        names = [m.name if m else None for m in me.materials]
        if "M_Details" in names:
            me.materials[names.index("M_Details")] = bpy.data.materials["M_FX_Glow"]


def lighting():
    rim = bpy.data.objects["LGT_Rim"].data
    rim.color = (0.55, 0.9, 1.0)
    if "orig_energy" not in rim:
        rim["orig_energy"] = rim.energy
    rim.energy = rim["orig_energy"] * 1.6
    key = bpy.data.objects["LGT_Key"].data
    key.color = (1.0, 0.95, 0.9)
    sc = bpy.context.scene
    sc.use_nodes = True
    nt = sc.node_tree
    for n in list(nt.nodes):
        if n.name == "FX_Glare":
            nt.nodes.remove(n)
    rl = next((n for n in nt.nodes if n.type == "R_LAYERS"), None) or nt.nodes.new("CompositorNodeRLayers")
    comp = next((n for n in nt.nodes if n.type == "COMPOSITE"), None) or nt.nodes.new("CompositorNodeComposite")
    g = nt.nodes.new("CompositorNodeGlare")
    g.name = "FX_Glare"
    try:
        g.glare_type = "BLOOM"
    except TypeError:
        g.glare_type = "FOG_GLOW"
    g.threshold = 1.2
    g.size = 7
    nt.links.new(rl.outputs["Image"], g.inputs["Image"])
    nt.links.new(g.outputs["Image"], comp.inputs["Image"])
    vw = next((n for n in nt.nodes if n.type == "VIEWER"), None)
    if vw:
        nt.links.new(g.outputs["Image"], vw.inputs["Image"])


def build_all():
    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    try:
        cleanup()
        materials()
        names = build_fx()
        retarget()
        lighting()
    finally:
        rig.data.pose_position = "POSE"
    return names
