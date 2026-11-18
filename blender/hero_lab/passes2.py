import bpy, sys, time
which = sys.argv[sys.argv.index('--') + 1]
T0 = time.time()
sc = bpy.context.scene
sc.render.resolution_percentage = 100
sc.cycles.use_denoising = True
sc.cycles.use_adaptive_sampling = True
sc.cycles.adaptive_threshold = 0.03
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA' if which == 'glass' else 'RGB'
sc.render.image_settings.color_depth = '8'
# the robot is drawn live on the page: keep it out of these renders entirely
for o in bpy.data.objects:
    if any(c.name.startswith('ROBOT_') for c in o.users_collection): o.hide_render = True
front = bpy.data.objects['POD_Glass_Front']
if which == 'plate':
    sc.cycles.samples = 80; sc.render.film_transparent = False
    front.hide_render = True
elif which == 'glass':
    sc.cycles.samples = 48; sc.render.film_transparent = True
    for o in bpy.data.objects:
        if o.type in ('MESH', 'CURVE', 'FONT') and o != front: o.visible_camera = False
    front.visible_camera = True
sc.render.filepath = bpy.path.abspath('//render_' + which + '.png')
bpy.ops.render.render(write_still=True)
print('DONE', which, round(time.time() - T0), 's', flush=True)
