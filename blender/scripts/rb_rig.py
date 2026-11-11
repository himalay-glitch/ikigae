# rb_rig.py — armature, parenting, limits, lights/camera/world, export. exec() after rb_lib + rb_build.
import bpy, math
from mathutils import Vector, Matrix

def _ensure_object_mode():
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")

def build_rig():
    _ensure_object_mode()
    remove_obj("RB_Rig")
    if bpy.data.armatures.get("RB_Rig"): bpy.data.armatures.remove(bpy.data.armatures["RB_Rig"])
    arm = bpy.data.armatures.new("RB_Rig"); rig = bpy.data.objects.new("RB_Rig", arm)
    coll("ROBOT_Rig").objects.link(rig)
    arm.display_type = "OCTAHEDRAL"; rig.show_in_front = True
    vl = bpy.context.view_layer
    for o in vl.objects: o.select_set(False)
    vl.objects.active = rig; rig.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.edit_bones
    def bone(name, head, tail, parent=None, roll_to=None, deform=True):
        b = eb.new(name); b.head = Vector(head); b.tail = Vector(tail)
        if roll_to is not None: b.align_roll(Vector(roll_to))
        if parent: b.parent = eb[parent]; b.use_connect = False
        b.use_deform = deform
        return b
    bone("root", (0, 0, 0), (0, 0.08, 0), deform=False)
    bone("DEF-Body", (0, 0, 0.065), (0, 0, 0.20), "root", roll_to=(0, -1, 0))
    for s, sfx in ((1, ".L"), (-1, ".R")):
        P, A0, d, T, u, v = arm_frame(s); k = T / 0.1137
        bone("DEF-Shoulder" + sfx, P, P + d * 0.045, "DEF-Body", roll_to=(0, -1, 0))
        bone("DEF-Forearm" + sfx, A0 + d * (0.0468 * k), A0 + d * T, "DEF-Shoulder" + sfx, roll_to=(0, -1, 0))
        cx, cy = s * D['foot_c'][0], D['foot_c'][1]
        bone("DEF-Foot" + sfx, (cx, cy, 0.0), (cx, cy - 0.045, 0.0), "root", roll_to=(0, 0, 1))
    ab = bpy.data.objects["RB_Antenna"].location
    bone("DEF-Antenna", ab, ab + Vector((0, 0, D['ant_len'])), "DEF-Body", roll_to=(0, -1, 0))
    bpy.ops.object.mode_set(mode="OBJECT")
    # pose limits  [SPEC] pitch -40..+120 (X, +ve = forward raise), yaw +-80 (Z), forearm roll +-180 (Y)
    for sfx in (".L", ".R"):
        pb = rig.pose.bones["DEF-Shoulder" + sfx]; pb.rotation_mode = "XYZ"; pb.lock_rotation[1] = True
        c = pb.constraints.new("LIMIT_ROTATION"); c.owner_space = "LOCAL"
        c.use_limit_x = True; c.min_x = math.radians(-40); c.max_x = math.radians(120)
        c.use_limit_y = True; c.min_y = c.max_y = 0
        c.use_limit_z = True; c.min_z = math.radians(-80); c.max_z = math.radians(80)
        pb = rig.pose.bones["DEF-Forearm" + sfx]; pb.rotation_mode = "XYZ"
        pb.lock_rotation[0] = True; pb.lock_rotation[2] = True; pb.lock_location = (True, True, True)
        c = pb.constraints.new("LIMIT_ROTATION"); c.owner_space = "LOCAL"
        c.use_limit_y = True; c.min_y = math.radians(-180); c.max_y = math.radians(180)
        c.use_limit_x = c.use_limit_z = True
        rig.pose.bones["DEF-Shoulder" + sfx].lock_location = (True, True, True)
    rig.pose.bones["DEF-Antenna"].rotation_mode = "XYZ"
    return [b.name for b in arm.bones]

BONE_MAP = {
    "RB_Shell_Main": "DEF-Body", "RB_Shell_Front": "DEF-Body", "RB_Shell_Front_Accent": "DEF-Body",
    "RB_Shell_Rear": "DEF-Body", "RB_Screen_Glass": "DEF-Body", "RB_Screen_Bezel": "DEF-Body",
    "RB_Frame_Inner": "DEF-Body", "RB_Panel_Back": "DEF-Body", "RB_Vent_Back_Grille": "DEF-Body",
    "RB_Detail_Front": "DEF-Body", "RB_Detail_Bottom": "DEF-Body", "RB_Buttons_Side_L": "DEF-Body",
    "RB_Buttons_Side_R": "DEF-Body", "RB_Backpack_L": "DEF-Body", "RB_Backpack_R": "DEF-Body",
    "RB_Shoulder_Boss_L": "DEF-Body", "RB_Shoulder_Boss_R": "DEF-Body",
    "RB_Shoulder_L": "DEF-Body", "RB_Shoulder_R": "DEF-Body",
    "RB_Leg_L": "DEF-Body", "RB_Leg_R": "DEF-Body",
    "RB_Arm_Upper_L": "DEF-Shoulder.L", "RB_Arm_Upper_R": "DEF-Shoulder.R",
    "RB_Arm_Fore_L": "DEF-Forearm.L", "RB_Arm_Fore_R": "DEF-Forearm.R",
    "RB_Foot_L": "DEF-Foot.L", "RB_Foot_R": "DEF-Foot.R",
    "RB_Hose_Leg_L": "DEF-Foot.L", "RB_Hose_Leg_R": "DEF-Foot.R",
    "RB_Antenna": "DEF-Antenna", "RB_Eye_Dots": "DEF-Body", "RB_Eye_Display": "DEF-Body",
}

def parent_to_bones():
    rig = bpy.data.objects["RB_Rig"]; done = []
    for name, bn in BONE_MAP.items():
        ob = bpy.data.objects.get(name)
        if not ob: continue
        mw = ob.matrix_world.copy(); b = rig.data.bones[bn]
        ob.parent = rig; ob.parent_type = "BONE"; ob.parent_bone = bn
        ob.matrix_parent_inverse = (rig.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))).inverted()
        ob.matrix_world = mw
        done.append(name)
    return done

def skin_arm_hoses():
    rig = bpy.data.objects["RB_Rig"]
    for s, sfx in ((1, ".L"), (-1, ".R")):
        ob = bpy.data.objects["RB_Hose_Arm" + ("_L" if s > 0 else "_R")]
        mw = ob.matrix_world.copy(); ob.parent = rig; ob.parent_type = "OBJECT"; ob.matrix_parent_inverse = rig.matrix_world.inverted(); ob.matrix_world = mw
        for g in list(ob.vertex_groups): ob.vertex_groups.remove(g)
        gf = ob.vertex_groups.new(name="DEF-Forearm" + sfx); gb = ob.vertex_groups.new(name="DEF-Body")
        segs = 12; nv = len(ob.data.vertices); rings = (nv - 2) // segs
        for vi in range(nv):
            if vi < rings * segs: t = (vi // segs) / max(rings - 1, 1)
            else: t = 0.0 if vi == nv - 2 else 1.0
            w = 1.0 - min(max((t - 0.10) / 0.45, 0.0), 1.0); w = w * w * (3 - 2 * w)
            if w > 0: gf.add([vi], w, "REPLACE")
            if w < 1: gb.add([vi], 1 - w, "REPLACE")
        m = ob.modifiers.get("Armature") or ob.modifiers.new("Armature", "ARMATURE"); m.object = rig
    return "ok"

# ------------------------------------------------------------------ lights / camera / world
def build_lights_camera():
    tgt = Vector((0, 0, 0.15))
    def area(name, loc, power, size, color=(1, 1, 1)):
        remove_obj(name); L = bpy.data.lights.get(name) or bpy.data.lights.new(name, "AREA")
        L.type = "AREA"; L.energy = power; L.size = size; L.shape = "DISK" if False else "SQUARE"; L.color = color
        ob = bpy.data.objects.new(name, L); coll("ROBOT_Lights").objects.link(ob); ob.location = loc
        ob.rotation_euler = (tgt - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
        return ob
    # [SHEET] key 1000-1500 W 45deg front-left, fill 300-600 W front-right, rim 500-800 W back
    area("LGT_Key", (-1.10, -1.10, 1.00), 1200, 0.8)
    area("LGT_Fill", (1.20, -0.90, 0.45), 450, 1.0)
    area("LGT_Rim", (0.35, 1.25, 0.95), 650, 0.6)
    remove_obj("CAM_Hero"); cd = bpy.data.cameras.get("CAM_Hero") or bpy.data.cameras.new("CAM_Hero")
    cd.lens = 85; cd.clip_start = 0.01; cd.clip_end = 100; cd.sensor_width = 36
    cam = bpy.data.objects.new("CAM_Hero", cd); coll("ROBOT_Camera").objects.link(cam)
    cam.location = (0.62, -1.45, 0.42)
    cam.rotation_euler = (Vector((0, 0, 0.165)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc = bpy.context.scene; sc.camera = cam
    sc.render.resolution_x = 4096; sc.render.resolution_y = 2304; sc.render.resolution_percentage = 100
    # ground / backdrop (render only, not exported)
    remove_obj("ENV_Ground")
    v, f = slab(6.0, 6.0, 0.01, 0.002, 0.0005, cs=1, rings=1)
    g = make_obj("ENV_Ground", xform(v, Matrix.Translation((0, 0, -0.001))), f, collection="ENV", origin=(0, 0, 0), recalc=True)
    m = make_mat("M_Env_Floor", "#1C1C1E", rough=0.55)
    g.data.materials.clear(); g.data.materials.append(m)
    return "ok"

def tri_report():
    obs = [o for c in ("ROBOT_Geo", "ROBOT_Eyes") for o in bpy.data.collections[c].all_objects if o.type == "MESH"]
    return tri_count(obs)
