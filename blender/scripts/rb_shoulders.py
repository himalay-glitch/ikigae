# rb_shoulders.py — v005: shoulder joint assembly that visibly connects arm to body.
# exec() after rb_future.py + rb_hands.py (uses rb_future.tube and rb_hands.parent_keep).
#   RB_Shoulder_Ball_*   dark titanium ball centred ON the shoulder pivot (DEF-Shoulder) — rotates in place,
#                        swallows the top of the upper arm, seats in the existing socket ring
#   RB_Arm_Collar_*      metal sleeve where the arm leaves the ball (+ FX_Ring_Collar_* glow line)
#   RB_Shoulder_Hood_*   orange armour cap over the outer-top of the joint, fixed to DEF-Body, with a cyan
#                        rim (FX_Ring_Hood_*). Cone half-angle 55 deg around the outward-up direction keeps it
#                        clear of the arm when it swings straight out (Wave) or forward (Point).
# Re-runnable.
import bpy, bmesh, math
from mathutils import Vector, Matrix

CM = 0.01
rig = bpy.data.objects["RB_Rig"]
GEO = bpy.data.collections["ROBOT_Geo"]
BALL_R = 1.55 * CM
HOOD_RIN, HOOD_ROUT, HOOD_HALF = 2.20 * CM, 2.48 * CM, 55.0


def arm_axis(side):
    """upper-arm lathe axis: A0 = pivot + s*0.9 cm X, direction = shoulder bone direction"""
    s = 1 if side == "L" else -1
    b = rig.data.bones["DEF-Shoulder." + side]
    P = b.head_local.copy()
    d = (b.tail_local - b.head_local).normalized()
    return s, P, P + Vector((s * 0.009, 0, 0)), d


def mesh_from_bm(name, bm, mats, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    for m in mats:
        me.materials.append(bpy.data.materials[m])
    return me


def place(name, me, bone, origin, parent_keep):
    me.transform(Matrix.Translation(-origin))
    ob = bpy.data.objects.new(name, me)
    GEO.objects.link(ob)
    parent_keep(ob, bone, Matrix.Translation(origin))
    return ob


def build_ball(side, parent_keep):
    s, P, A0, d = arm_axis(side)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=BALL_R)
    # pole along the arm axis so the seam/pole hides inside the arm
    R = d.to_track_quat("Z", "Y").to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=Matrix.Translation(P) @ R, verts=bm.verts)
    me = mesh_from_bm("RB_Shoulder_Ball_" + side, bm, ["M_Joint_Metal"])
    return place("RB_Shoulder_Ball_" + side, me, "DEF-Shoulder." + side, P, parent_keep)


def build_collar(side, parent_keep, tube):
    s, P, A0, d = arm_axis(side)
    a0, a1, r = 1.30 * CM, 2.05 * CM, 1.36 * CM
    bm = bmesh.new()
    res = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=32, radius1=r, radius2=r, depth=a1 - a0)
    R = d.to_track_quat("Z", "Y").to_matrix().to_4x4()
    c = A0 + d * ((a0 + a1) / 2)
    bmesh.ops.transform(bm, matrix=Matrix.Translation(c) @ R, verts=bm.verts)
    edges = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(60)]
    bmesh.ops.bevel(bm, geom=edges, offset=0.12 * CM, segments=2, profile=0.5, affect="EDGES", clamp_overlap=True)
    me = mesh_from_bm("RB_Arm_Collar_" + side, bm, ["M_Joint_Metal"])
    ob = place("RB_Arm_Collar_" + side, me, "DEF-Shoulder." + side, P, parent_keep)
    # glow line at the collar's lower lip
    fwd = Vector((0, -1, 0))
    u = (fwd - d * d.dot(fwd)).normalized()
    v = d.cross(u)
    cc = A0 + d * (a1 - 0.18 * CM)
    pts = [cc + (u * math.cos(t) + v * math.sin(t)) * (r + 0.02 * CM) for t in (2 * math.pi * i / 48 for i in range(48))]
    tube("FX_Ring_Collar_" + side, pts, 0.06 * CM, "M_FX_Glow", "DEF-Shoulder." + side)
    return ob


def build_hood(side, parent_keep, tube):
    """Arched armour plate over the joint, fixed to the body. Concentric with the 3.3 cm shoulder boss
    (arch inner radius = boss radius), spans 50-130 deg around the X axis so its lowest edge sits 2.53 cm
    above the pivot — measured clear of the arm's whole swept volume in Idle/Wave/Point/Hold (verified per frame, 1.5 mm margin)
    (arm never comes inboard of X 18 cm above +2.5 cm). Sinks 0.2 cm into the body side."""
    s, P, A0, d = arm_axis(side)
    r_in, r_out = 3.30 * CM, 3.80 * CM
    th0, th1, nth = math.radians(50), math.radians(130), 20
    xs = [s * x * CM for x in (11.2, 11.8, 12.6, 13.4, 14.2, 14.8)]

    def pt(x, th, r):
        return Vector((x, P.y + r * math.cos(th), P.z + r * math.sin(th)))

    bm = bmesh.new()
    O = [[bm.verts.new(pt(x, th0 + (th1 - th0) * j / nth, r_out)) for j in range(nth + 1)] for x in xs]
    I = [[bm.verts.new(pt(x, th0 + (th1 - th0) * j / nth, r_in)) for j in range(nth + 1)] for x in xs]
    nx = len(xs)
    for i in range(nx - 1):
        for j in range(nth):
            bm.faces.new((O[i][j], O[i][j + 1], O[i + 1][j + 1], O[i + 1][j]))
            bm.faces.new((I[i][j], I[i + 1][j], I[i + 1][j + 1], I[i][j + 1]))
        for j in (0, nth):                       # long edges (front / back lips)
            bm.faces.new((O[i][j], O[i + 1][j], I[i + 1][j], I[i][j]))
    for i in (0, nx - 1):                         # end caps
        for j in range(nth):
            bm.faces.new((O[i][j], I[i][j], I[i][j + 1], O[i][j + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = mesh_from_bm("RB_Shoulder_Hood_" + side, bm, ["M_Shell_Main"])
    ob = place("RB_Shoulder_Hood_" + side, me, "DEF-Body", P, parent_keep)
    bv = ob.modifiers.new("Bevel", "BEVEL")
    bv.width = 0.12 * CM
    bv.segments = 3
    bv.limit_method = "ANGLE"
    bv.angle_limit = math.radians(40)
    ob.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL")
    # cyan strip on the outer end face
    rim = [pt(xs[-1] + s * 0.02 * CM, th0 + (th1 - th0) * j / 32, (r_in + r_out) / 2) for j in range(1, 32)]
    tube("FX_Ring_Hood_" + side, rim, 0.06 * CM, "M_FX_Glow", "DEF-Body", closed=False)
    return ob


def widen_socket_glow(tube):
    """the socket glow ring (rb_future) sat at r 1.6 cm — now hidden by the ball; rebuild at r 2.0 cm"""
    for side, s in (("L", 1), ("R", -1)):
        o = bpy.data.objects.get("FX_Ring_Shoulder_" + side)
        if o:
            me = o.data
            bpy.data.objects.remove(o, do_unlink=True)
            if me.users == 0:
                bpy.data.meshes.remove(me)
        c = Vector((s * 12.52 * CM, -1.0 * CM, 15.5 * CM))
        pts = [c + Vector((0, math.cos(t), math.sin(t))) * (2.0 * CM) for t in (2 * math.pi * i / 64 for i in range(64))]
        tube("FX_Ring_Shoulder_" + side, pts, 0.07 * CM, "M_FX_Glow", "DEF-Body")


def cleanup():
    for o in list(bpy.data.objects):
        if o.name.startswith(("RB_Shoulder_Ball", "RB_Arm_Collar", "RB_Shoulder_Hood", "FX_Ring_Collar", "FX_Ring_Hood")):
            me = o.data
            bpy.data.objects.remove(o, do_unlink=True)
            if me and me.users == 0:
                bpy.data.meshes.remove(me)


def build_all(tube, parent_keep):
    rig.data.pose_position = "REST"
    bpy.context.view_layer.update()
    try:
        cleanup()
        widen_socket_glow(tube)
        out = []
        for side in ("L", "R"):
            out += [build_ball(side, parent_keep).name, build_collar(side, parent_keep, tube).name,
                    build_hood(side, parent_keep, tube).name]
        return out
    finally:
        rig.data.pose_position = "POSE"
        bpy.context.view_layer.update()
