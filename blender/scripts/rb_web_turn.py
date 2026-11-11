"""rb_web_turn.py - head-follow sprite grid for the website.

Renders the robot (no pedestal) over a yaw x pitch grid with the hero camera, cropped
to the region the robot can occupy, and records the screen quad of every frame so the
HTML eyes can be re-projected per angle. A separate static plate holds the tube."""
import bpy, math, json, os
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

OUT = '/private/tmp/claude-501/-Users-uxui-Documents-GitHub-ikigai/3a05833e-031a-45bf-b8f8-59482a7da215/scratchpad/bl/turn/'
YAWS = list(range(-20, 21, 4))
PITCHES = list(range(-8, 9, 4))
CROP = dict(x0=0.17, x1=0.83, y0=0.04, y1=0.60)   # top-left origin, fractions of the plate
RES = 1640


def _scene():
    return bpy.data.scenes['Scene']


def setup(samples=64):
    sc = _scene()
    sc.render.resolution_x = sc.render.resolution_y = RES
    sc.cycles.samples = samples
    sc.render.use_border = True; sc.render.use_crop_to_border = True
    sc.render.border_min_x = CROP['x0']; sc.render.border_max_x = CROP['x1']
    sc.render.border_min_y = 1 - CROP['y1']; sc.render.border_max_y = 1 - CROP['y0']
    for o in bpy.data.collections['WEB_Pedestal'].objects:
        o.hide_render = True
    for n in ['RB_Eye_L', 'RB_Eye_R']:
        bpy.data.objects[n].hide_render = True
    os.makedirs(OUT, exist_ok=True)


def quad():
    sc = _scene(); cam = sc.camera
    scr = bpy.data.objects['RB_Face_Screen']
    me = scr.data
    xs = [v.co.x for v in me.vertices]; zs = [v.co.z for v in me.vertices]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    y = me.vertices[0].co.y
    def p(x, z):
        v = world_to_camera_view(sc, cam, scr.matrix_world @ Vector((x, y, z)))
        return [round(v.x, 5), round(1 - v.y, 5)]
    return [p(x0, z1), p(x1, z1), p(x1, z0), p(x0, z0)]   # tl tr br bl


def render_range(start, count):
    sc = _scene(); piv = bpy.data.objects['WEB_HeadPivot']
    meta_p = OUT + 'quads.json'
    meta = json.load(open(meta_p)) if os.path.exists(meta_p) else {}
    frames = [(p, y) for p in PITCHES for y in YAWS]
    done = []
    for (p, y) in frames[start:start + count]:
        piv.rotation_euler = (math.radians(p), 0, math.radians(y))
        bpy.context.view_layer.update()
        key = f'{p}_{y}'
        meta[key] = quad()
        sc.render.filepath = OUT + f'r_p{p:+03d}_y{y:+03d}.png'
        bpy.ops.render.render(write_still=True)
        done.append(key)
    piv.rotation_euler = (0, 0, 0)
    json.dump(meta, open(meta_p, 'w'))
    return done


def render_tube_plate(samples=96):
    sc = _scene()
    sc.render.use_border = False; sc.render.use_crop_to_border = False
    sc.cycles.samples = samples
    for o in bpy.data.collections['WEB_Pedestal'].objects:
        o.hide_render = (o.name == 'WEB_Pedestal_Cap')
    hidden = []
    for o in sc.objects:
        if (o.name.startswith('RB_') or o.name.startswith('FX_')) and not o.hide_render:
            o.hide_render = True; hidden.append(o)
    sc.render.filepath = OUT + 'tube_plate.png'
    bpy.ops.render.render(write_still=True)
    for o in hidden: o.hide_render = False
