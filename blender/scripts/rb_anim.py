# rb_anim.py — Phase 4: example animations from the spec sheet (Idle, Wave, Point, Hold).
# exec() inside the opened robot .blend. Re-runnable: wipes previous RB_* clip actions first.
#
# Conventions (verified on the rig):
#   DEF-Shoulder.*  rot X +  = pitch forward (limit -40..120)
#                   rot Z +  = left arm outward, Z - = right arm outward (limit +-80)
#   DEF-Forearm.*   rot Y    = roll (+-180)
#   DEF-Body        loc Y    = up (bone points +Z world); rot Z = side tilt, rot X = fwd/back lean
#   DEF-Antenna     rot X / Z = fwd/back / side wiggle
# Every clip keys EVERY animated channel (rest values where unused) so that clips never
# inherit a pose from another clip when switched in three.js' AnimationMixer.
# Eye expressions are keyed CONSTANT (stepped) — LED panels switch, they don't morph.
import bpy, math

FPS = 24
R = math.radians
rig = bpy.data.objects["RB_Rig"]
EYE_OBJS = [bpy.data.objects[n] for n in ("RB_Eye_Dots", "RB_Eye_Dots_EXP") if n in bpy.data.objects]
EXPR = ["Neutral", "Blink", "Happy", "Thinking", "Excited", "Wink"]
BONES = ["DEF-Body", "DEF-Shoulder.L", "DEF-Shoulder.R", "DEF-Forearm.L", "DEF-Forearm.R", "DEF-Antenna"]
DIGITS = ["Finger1", "Finger2", "Finger3", "Thumb"]
if "DEF-Finger1_A.L" in rig.data.bones:          # v004+: robotic hands
    BONES += ["DEF-%s_%s.%s" % (d, s, side) for side in "LR" for d in DIGITS for s in "AB"]

if "RB_Deck" in bpy.data.objects:                 # v004+: hover deck rides on the root bone
    BONES.append("root")
HOVER_AMP = 0.005          # m, bob amplitude
HOVER_TILT = 0.8           # deg, wobble


def hover_keys(length, cycles=2):
    """seamless loop: 2 bob cycles + 1 offset wobble cycle over the clip (root: loc Z up, rot X pitch, rot Y roll)"""
    n = cycles * 4
    step = (length - 1) / n
    zs = [0, 1, 0, -1] * cycles + [0]
    loc = [(round(1 + i * step), (0, 0, HOVER_AMP * z)) for i, z in enumerate(zs)]
    q = (length - 1) / 4
    px = [0, 1, 0, -1, 0]
    py = [1, 0, -1, 0, 1]
    rot = [(round(1 + i * q), (HOVER_TILT * px[i], HOVER_TILT * 0.6 * py[i], 0)) for i in range(5)]
    return {"loc": loc, "rot": rot}


# Hand poses — per digit (A curl, B curl, A splay) in degrees. Curl = rot X (toward palm / thumb toward
# fingers); splay = rot Z (+ moves toward -w, i.e. Finger1 outward, Finger3 inward).
HAND = {
    "relaxed": {"Finger1": (18, 22, 0), "Finger2": (18, 22, 0), "Finger3": (18, 22, 0), "Thumb": (12, 15, 0)},
    "curl":    {"Finger1": (28, 32, 0), "Finger2": (26, 30, 0), "Finger3": (28, 32, 0), "Thumb": (18, 20, 0)},
    "open":    {"Finger1": (-8, -4, 12), "Finger2": (-8, -4, 0), "Finger3": (-8, -4, -12), "Thumb": (-10, -5, 0)},
    "fist":    {"Finger1": (90, 100, 0), "Finger2": (90, 100, 0), "Finger3": (90, 100, 0), "Thumb": (55, 70, 0)},
    "point":   {"Finger1": (90, 100, 4), "Finger2": (0, 0, 0), "Finger3": (90, 100, -4), "Thumb": (50, 65, 0)},
    "grip":    {"Finger1": (50, 55, 4), "Finger2": (50, 55, 0), "Finger3": (50, 55, -4), "Thumb": (35, 40, 0)},
}


def hand_keys(side, seq, length, stagger=0):
    """seq: [(frame, pose)] -> bone key dict. Fingers lag `stagger` frames each (first/last keys pinned)."""
    if "DEF-Finger1_A." + side not in rig.data.bones:
        return {}
    out = {}
    for i, dg in enumerate(DIGITS):
        off = 0 if dg == "Thumb" else i * stagger
        ka, kb = [], []
        for f, pose in seq:
            ff = f if f in (1, length) else min(f + off, length - 1)
            a, b, z = HAND[pose][dg]
            ka.append((ff, (a, 0, z)))
            kb.append((ff, (b, 0, 0)))
        out["DEF-%s_A.%s" % (dg, side)] = {"rot": ka}
        out["DEF-%s_B.%s" % (dg, side)] = {"rot": kb}
    return out


def reset_pose():
    for pb in rig.pose.bones:
        pb.location = (0, 0, 0)
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.rotation_euler = (0, 0, 0)
        pb.scale = (1, 1, 1)


def clear_anim():
    ad = rig.animation_data_create()
    for t in list(ad.nla_tracks):
        ad.nla_tracks.remove(t)
    ad.action = None
    for o in EYE_OBJS:
        kad = o.data.shape_keys.animation_data_create()
        for t in list(kad.nla_tracks):
            kad.nla_tracks.remove(t)
        kad.action = None
    for a in list(bpy.data.actions):
        if a.name.startswith("RB_"):
            bpy.data.actions.remove(a)
    for pb in rig.pose.bones:
        if pb.name in BONES:
            pb.rotation_mode = "XYZ"
    reset_pose()


def _key_bone(pb, path, frames, conv):
    for f, v in frames:
        setattr(pb, path, conv(v))
        pb.keyframe_insert(path, frame=f, group=pb.name)


def build_clip(name, length, bones, eyes):
    """bones: {bone: {"rot": [(frame, (x,y,z) deg)], "loc": [(frame, (x,y,z) m)]}}
       eyes:  {expr: [(frame, weight)]}  — unspecified exprs held at rest (Neutral 1, others 0)."""
    reset_pose()
    ad = rig.animation_data
    act = bpy.data.actions.new("RB_" + name)
    act.use_fake_user = True
    ad.action = act
    if "root" in BONES and "root" not in bones:
        bones = dict(bones, root=hover_keys(length))
    for bn in BONES:
        pb = rig.pose.bones[bn]
        ch = bones.get(bn, {})
        _key_bone(pb, "rotation_euler", ch.get("rot") or [(1, (0, 0, 0)), (length, (0, 0, 0))],
                  lambda v: tuple(R(x) for x in v))
        _key_bone(pb, "location", ch.get("loc") or [(1, (0, 0, 0)), (length, (0, 0, 0))], lambda v: v)
    ad.action = None
    tr = ad.nla_tracks.new()
    tr.name = name
    tr.strips.new(name, 1, act)

    # eyes — one action shared by the preview mesh and its export copy
    eact = bpy.data.actions.new("RB_" + name + "_Eyes")
    eact.use_fake_user = True
    k0 = EYE_OBJS[0].data.shape_keys
    k0.animation_data.action = eact
    for e in EXPR:
        frames = eyes.get(e) or [(1, 1.0 if e == "Neutral" else 0.0)]
        kb = k0.key_blocks[e]
        for f, w in frames:
            kb.value = w
            kb.keyframe_insert("value", frame=f)
    for fc in _fcurves(eact):
        for kp in fc.keyframe_points:
            kp.interpolation = "CONSTANT"
    slot = k0.animation_data.action_slot if hasattr(k0.animation_data, "action_slot") else None
    for o in EYE_OBJS:
        kad = o.data.shape_keys.animation_data
        kad.action = None
        t = kad.nla_tracks.new()
        t.name = name
        st = t.strips.new(name, 1, eact)
        if slot is not None and hasattr(st, "action_slot"):
            st.action_slot = slot
    return act, eact


def _fcurves(act):
    if hasattr(act, "layers") and len(act.layers):  # slotted actions (4.4+)
        out = []
        for L in act.layers:
            for s in L.strips:
                for cb in s.channelbags:
                    out += list(cb.fcurves)
        return out
    return list(act.fcurves)


def solo(name):
    """Preview one clip in the viewport: mute every other NLA track."""
    owners = [rig.animation_data] + [o.data.shape_keys.animation_data for o in EYE_OBJS]
    for ad in owners:
        for t in ad.nla_tracks:
            t.mute = t.name != name
    L = {"Idle": 97, "Wave": 73, "Point": 73, "Hold": 73}[name]
    sc = bpy.context.scene
    sc.frame_start, sc.frame_end = 1, L
    sc.frame_set(1)


# ---------------------------------------------------------------- clips
def idle():
    # 4 s loop: breathing bob, side sway, lazy arm swing, antenna follow-through, one blink.
    return build_clip("Idle", 97, {
        "DEF-Body": {
            "loc": [(1, (0, 0, 0)), (25, (0, 0.002, 0)), (49, (0, 0, 0)), (73, (0, 0.002, 0)), (97, (0, 0, 0))],
            "rot": [(1, (0, 0, 0)), (25, (0, 0, 1.5)), (49, (0, 0, 0)), (73, (0, 0, -1.5)), (97, (0, 0, 0))]},
        "DEF-Shoulder.L": {"rot": [(1, (3, 0, 3)), (49, (-3, 0, 5)), (97, (3, 0, 3))]},
        "DEF-Shoulder.R": {"rot": [(1, (-3, 0, -5)), (49, (3, 0, -3)), (97, (-3, 0, -5))]},
        "DEF-Antenna": {"rot": [(1, (0, 0, 0)), (31, (0, 0, -4)), (55, (2, 0, 0)), (79, (0, 0, 4)), (97, (0, 0, 0))]},
        **hand_keys("L", [(1, "relaxed"), (49, "curl"), (97, "relaxed")], 97, 3),
        **hand_keys("R", [(1, "relaxed"), (55, "curl"), (97, "relaxed")], 97, 3),
    }, {
        "Neutral": [(1, 1), (59, 0), (65, 1)],
        "Blink": [(1, 0), (59, 1), (65, 0)],
    })


def wave():
    # 3 s: left arm (viewer's right) swings out to ~horizontal in the front plane, three waves.
    # NOTE: the [SPEC] limits (pitch <=120, yaw +-80) make an overhead raise impossible, so the
    # wave lives in the frontal plane — reads clearly from the front-facing hero camera.
    up = (15, 0, 58)
    out = (15, 0, 80)
    return build_clip("Wave", 73, {
        "DEF-Shoulder.L": {"rot": [(1, (0, 0, 0)), (12, up), (19, out), (26, up), (33, out), (40, up), (47, out),
                                    (54, up), (64, (15, 0, 10)), (73, (0, 0, 0))]},
        "DEF-Forearm.L": {"rot": [(1, (0, 0, 0)), (12, (0, -20, 0)), (19, (0, 20, 0)), (26, (0, -20, 0)),
                                   (33, (0, 20, 0)), (40, (0, -20, 0)), (47, (0, 20, 0)), (54, (0, -20, 0)),
                                   (64, (0, 0, 0)), (73, (0, 0, 0))]},
        "DEF-Shoulder.R": {"rot": [(1, (0, 0, 0)), (14, (-6, 0, -6)), (60, (-6, 0, -6)), (73, (0, 0, 0))]},
        "DEF-Body": {"rot": [(1, (0, 0, 0)), (14, (0, 0, -3)), (60, (0, 0, -3)), (73, (0, 0, 0))],
                     "loc": [(1, (0, 0, 0)), (8, (0, -0.0015, 0)), (14, (0, 0.003, 0)), (22, (0, 0, 0)),
                             (73, (0, 0, 0))]},
        "DEF-Antenna": {"rot": [(1, (0, 0, 0)), (12, (0, 0, 5)), (18, (0, 0, -6)), (26, (0, 0, 4)), (33, (0, 0, -4)),
                                (40, (0, 0, 4)), (47, (0, 0, -4)), (56, (0, 0, 3)), (66, (0, 0, -2)), (73, (0, 0, 0))]},
        **hand_keys("L", [(1, "relaxed"), (10, "open"), (54, "open"), (64, "relaxed"), (73, "relaxed")], 73, 2),
        **hand_keys("R", [(1, "relaxed"), (73, "relaxed")], 73),
    }, {
        "Neutral": [(1, 1), (9, 0), (63, 1)],
        "Happy": [(1, 0), (9, 1), (63, 0)],
    })


def point():
    # 3 s: anticipation dip, left arm shoots forward-out to point, holds, returns. Excited eyes.
    aim = (85, 0, 30)
    return build_clip("Point", 73, {
        "DEF-Shoulder.L": {"rot": [(1, (0, 0, 0)), (6, (-12, 0, 2)), (14, (90, 0, 30)), (18, aim), (54, aim),
                                    (66, (8, 0, 4)), (73, (0, 0, 0))]},
        "DEF-Forearm.L": {"rot": [(1, (0, 0, 0)), (14, (0, 0, 0)), (18, (0, 25, 0)), (54, (0, 25, 0)), (66, (0, 0, 0)),
                                   (73, (0, 0, 0))]},
        "DEF-Shoulder.R": {"rot": [(1, (0, 0, 0)), (14, (-10, 0, -4)), (54, (-10, 0, -4)), (73, (0, 0, 0))]},
        "DEF-Body": {"rot": [(1, (0, 0, 0)), (6, (-2, 0, 0)), (16, (4, 0, -2)), (54, (3, 0, -2)), (68, (0, 0, 0)),
                             (73, (0, 0, 0))],
                     "loc": [(1, (0, 0, 0)), (6, (0, -0.0015, 0)), (16, (0, 0.002, 0)), (26, (0, 0, 0)), (73, (0, 0, 0))]},
        "DEF-Antenna": {"rot": [(1, (0, 0, 0)), (8, (5, 0, 0)), (17, (-7, 0, 2)), (24, (4, 0, -1)), (32, (-2, 0, 0)),
                                (40, (0, 0, 0)), (60, (3, 0, 0)), (73, (0, 0, 0))]},
        **hand_keys("L", [(1, "relaxed"), (6, "fist"), (13, "point"), (54, "point"), (66, "relaxed"), (73, "relaxed")], 73, 1),
        **hand_keys("R", [(1, "relaxed"), (14, "curl"), (54, "curl"), (73, "relaxed")], 73, 2),
    }, {
        "Neutral": [(1, 1), (14, 0), (40, 0), (44, 0), (60, 1)],
        "Excited": [(1, 0), (14, 1), (40, 0), (44, 1), (60, 0)],
        "Blink": [(1, 0), (40, 1), (44, 0)],
    })


def hold():
    # 3 s: both arms come forward and in as if holding/offering something; thinks, then happy.
    hl = (68, 0, -14)
    hr = (68, 0, 14)
    return build_clip("Hold", 73, {
        "DEF-Shoulder.L": {"rot": [(1, (0, 0, 0)), (16, hl), (36, (72, 0, -12)), (58, hl), (73, (0, 0, 0))]},
        "DEF-Shoulder.R": {"rot": [(1, (0, 0, 0)), (18, hr), (38, (72, 0, 12)), (58, hr), (73, (0, 0, 0))]},
        "DEF-Forearm.L": {"rot": [(1, (0, 0, 0)), (16, (0, -35, 0)), (58, (0, -35, 0)), (73, (0, 0, 0))]},
        "DEF-Forearm.R": {"rot": [(1, (0, 0, 0)), (18, (0, 35, 0)), (58, (0, 35, 0)), (73, (0, 0, 0))]},
        "DEF-Body": {"rot": [(1, (0, 0, 0)), (18, (3, 0, 0)), (30, (3, 0, 2)), (44, (3, 0, -1.5)), (58, (3, 0, 0)),
                             (73, (0, 0, 0))],
                     "loc": [(1, (0, 0, 0)), (40, (0, 0.0015, 0)), (73, (0, 0, 0))]},
        "DEF-Antenna": {"rot": [(1, (0, 0, 0)), (20, (-4, 0, 0)), (32, (2, 0, -3)), (46, (0, 0, 3)), (60, (2, 0, 0)),
                                (73, (0, 0, 0))]},
        **hand_keys("L", [(1, "relaxed"), (10, "open"), (18, "grip"), (58, "grip"), (68, "relaxed"), (73, "relaxed")], 73, 2),
        **hand_keys("R", [(1, "relaxed"), (12, "open"), (20, "grip"), (58, "grip"), (68, "relaxed"), (73, "relaxed")], 73, 2),
    }, {
        "Neutral": [(1, 1), (16, 0), (60, 1)],
        "Thinking": [(1, 0), (16, 1), (36, 0)],
        "Happy": [(1, 0), (36, 1), (60, 0)],
    })


def build_all():
    clear_anim()
    out = []
    for fn in (idle, wave, point, hold):
        a, e = fn()
        out.append(f"{a.name} ({len(_fcurves(a))} fc) + {e.name} ({len(_fcurves(e))} fc)")
    sc = bpy.context.scene
    sc.render.fps = FPS
    solo("Idle")
    return out
