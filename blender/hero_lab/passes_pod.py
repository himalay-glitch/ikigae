"""Pod-only passes for the grey-grid hero (2026-11-15).

The hero background is the site's flat grey grid again, so the room has to go — but the capsule
must stay pixel-identical to render_plate (lab-plate.webp). Instead of re-rendering the pod, these
passes cut it out of the existing plate. The frame is extended EXT px downward (same projection:
the top 1800 rows match the plate exactly) because the floor ring runs past the plate's bottom edge.

  mask   — Workbench, film transparent: alpha = capsule silhouette (room, plants, robot, front glass,
           floor ring and the under-floor shaft hidden). Plate RGB x this alpha = the capsule as it was.
  ring   — Cycles: the floor ring alone (it is emissive), full ellipse, same camera + DOF.
  shadow — Cycles, room hidden, ROOM_Floor = shadow catcher, capsule invisible to the camera but
           still casting: its dark footprint under the base drives the soft contact shadow.

usage: blender -b lab_v001.blend --python passes_pod.py -- mask|ring|shadow <out.png> [EXT=120]
"""
import bpy, sys, time

argv = sys.argv[sys.argv.index('--') + 1:]
which, out = argv[0], argv[1]
EXT = int(argv[2]) if len(argv) > 2 else 120
T0 = time.time()
sc = bpy.context.scene
cam = sc.camera.data

# extend the frame downward without changing the projection: pin the horizontal FOV (the plate
# used a VERTICAL fit on sensor_height at 2880x1800 → horizontal fit on sensor_height * 1.6), add
# EXT rows and shift the view down by half of them (shift is in units of the larger dimension)
W, H = 2880, 1800
if cam.sensor_fit == 'VERTICAL':
    cam.sensor_width = cam.sensor_height * W / H
elif cam.sensor_fit == 'AUTO':
    pass  # AUTO on a landscape frame already fits sensor_width horizontally
cam.sensor_fit = 'HORIZONTAL'
cam.shift_y -= (EXT / 2) / W
sc.render.resolution_x, sc.render.resolution_y = W, H + EXT
sc.render.resolution_percentage = 100
sc.render.film_transparent = True
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.render.image_settings.color_depth = '16'


def in_col(o, prefix):
    return any(c.name.startswith(prefix) for c in o.users_collection)


pod = [o for o in sc.objects if in_col(o, '02_Capsule')]
room = [o for o in sc.objects if in_col(o, '03_Room') or in_col(o, '04_Plants')]
ring = bpy.data.objects['POD_Floor_Ring']
for o in sc.objects:
    if in_col(o, 'ROBOT_'):
        o.hide_render = True
bpy.data.objects['POD_Glass_Front'].hide_render = True  # front glass is its own layer (lab-glass.webp)

if which == 'mask':
    sc.render.engine = 'BLENDER_WORKBENCH'
    cam.dof.use_dof = False  # the pod is the focus plane; keep the silhouette crisp
    sh = sc.display.shading
    sh.light = 'FLAT'
    sh.color_type = 'SINGLE'
    sh.single_color = (1, 1, 1)
    sh.show_xray = False
    sh.show_shadows = False
    sh.show_cavity = False
    sh.show_object_outline = False
    sc.display.render_aa = '32'
    for o in room:
        o.hide_render = True
    # the shaft hangs below the floor (seen only through the hatch glass, which covers it) —
    # with the floor gone it would poke out under the base. The ring comes from its own pass.
    for o in pod:
        if o.name.startswith('POD_Shaft') or o == ring:
            o.hide_render = True
elif which == 'ring':
    sc.cycles.samples = 64
    sc.cycles.use_denoising = True
    sc.render.image_settings.color_depth = '8'
    for o in sc.objects:
        if o.type in ('MESH', 'CURVE', 'FONT') and o != ring:
            o.hide_render = True
elif which == 'shadow':
    sc.render.resolution_percentage = 50  # soft shadow: half res is plenty
    sc.render.image_settings.color_depth = '8'
    sc.cycles.samples = 96
    sc.cycles.use_denoising = True
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.02
    for o in room:
        o.hide_render = True
    floor = bpy.data.objects['ROOM_Floor']
    floor.hide_render = False
    floor.is_shadow_catcher = True
    for o in pod:
        o.visible_camera = False  # still casts, never seen

sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print('DONE', which, sc.render.resolution_x, sc.render.resolution_y, round(time.time() - T0), 's', flush=True)
