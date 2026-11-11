"""rb_web_scene.py - pedestal, studio light and hero camera for the website render."""
import bpy, bmesh, math
from mathutils import Vector, Matrix
from rb_web import srgb, simple_mat, hard_surface, add_rough_noise, CM

D = bpy.data


def coll(name):
    c = D.collections.get(name)
    if not c:
        c = D.collections.new(name); bpy.context.scene.collection.children.link(c)
    return c


def rounded_box(name, w, d, h, top_z, r, mat):
    bpy.ops.mesh.primitive_cube_add(size=1)
    o = bpy.context.active_object
    o.name = name; o.data.name = name
    o.scale = (w, d, h); o.location = (0, 0, top_z - h / 2)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for c in o.users_collection: c.objects.unlink(o)
    b = o.modifiers.new('Bevel', 'BEVEL'); b.width = r; b.segments = 6; b.limit_method = 'ANGLE'
    o.modifiers.new('WeightedNormal', 'WEIGHTED_NORMAL').keep_sharp = True
    for p in o.data.polygons: p.use_smooth = True
    o.data.materials.append(mat)
    return o


def build_pedestal():
    c = coll('WEB_Pedestal')
    for o in list(c.objects): D.objects.remove(o)
    mat = simple_mat('M_Pedestal', '#E9E8EC', 0.36, coat=0.25)
    add_rough_noise(mat, 0.36, 0.06, 25)
    seam = simple_mat('M_Pedestal_Seam', '#BFBDC3', 0.5)
    # top block: slightly wider than the robot, like the reference neck block
    top = rounded_box('WEB_Pedestal_Top', 32 * CM, 25 * CM, 14 * CM, 0.0, 1.2 * CM, mat)
    c.objects.link(top)
    # lower block, a touch inset, separated by a seam groove
    low = rounded_box('WEB_Pedestal_Low', 31 * CM, 24 * CM, 16 * CM, -14.4 * CM, 1.2 * CM, mat)
    c.objects.link(low)
    groove = rounded_box('WEB_Pedestal_Groove', 30 * CM, 23 * CM, 0.8 * CM, -13.8 * CM, 0.3 * CM, seam)
    c.objects.link(groove)
    # tube that will run down through the next section of the page
    bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=8.2 * CM, depth=90 * CM, location=(0, 0, -30.4 * CM - 45 * CM))
    t = bpy.context.active_object; t.name = 'WEB_Pedestal_Tube'; t.data.name = 'WEB_Pedestal_Tube'
    for cc in t.users_collection: cc.objects.unlink(t)
    c.objects.link(t)
    for p in t.data.polygons: p.use_smooth = True
    tube_mat = simple_mat('M_Pedestal_Tube', '#E4E3E7', 0.3, coat=0.4)
    t.data.materials.append(tube_mat)
    hard_surface(t, 0.4 * CM, 3)


def build_lights():
    c = coll('ROBOT_Lights')
    for n in ['LGT_Key', 'LGT_Fill', 'LGT_Rim']:
        o = D.objects.get(n)
        if o: o.hide_render = True; o.hide_viewport = True
    for n in ['WEB_Key', 'WEB_Fill', 'WEB_Rim', 'WEB_Top']:
        if n in D.objects: D.objects.remove(D.objects[n])

    def area(name, loc, size, energy, color='#FFFFFF', target=(0, 0, 0.14)):
        L = D.lights.new(name, 'AREA'); L.size = size; L.energy = energy
        L.color = srgb(color)[:3]
        o = D.objects.new(name, L); c.objects.link(o)
        o.location = loc
        d = Vector(target) - Vector(loc)
        o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        return o
    area('WEB_Key', (-0.9, -1.2, 1.1), 1.2, 85, '#FFF8F2')      # big soft key, front-left-high
    area('WEB_Fill', (1.3, -0.8, 0.35), 1.6, 10, '#F4F4FF')     # fill from camera side
    area('WEB_Rim', (0.6, 1.1, 0.9), 0.8, 45, '#FFFFFF')        # back rim to separate from the grey page
    area('WEB_Top', (0, 0, 1.4), 1.2, 25, '#FFFFFF')            # top sheen on the head
    # world: flat light grey, matches the page so reflections/bounce feel native
    w = bpy.context.scene.world
    nt = w.node_tree
    bg = next(n for n in nt.nodes if n.type == 'BACKGROUND')
    for l in list(bg.inputs['Color'].links): nt.links.remove(l)
    bg.inputs['Color'].default_value = srgb('#E4E4E4')
    bg.inputs['Strength'].default_value = 0.32


def build_camera(direction=(0.42, -1.0, 0.10), target=(0.0, 0.0, 0.05), lens=70, dist=2.2):
    cam = D.objects['CAM_Hero']
    cam.data.lens = lens
    d = Vector(direction).normalized()
    cam.location = Vector(target) + d * dist
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    cam.data.shift_x = 0; cam.data.shift_y = 0
    return cam


def render_settings(rx, ry, samples=128):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.render.film_transparent = True
    sc.render.resolution_x = rx; sc.render.resolution_y = ry; sc.render.resolution_percentage = 100
    sc.cycles.samples = samples
    sc.cycles.use_denoising = True
    sc.view_settings.view_transform = 'AgX'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '8'
    sc.camera = D.objects['CAM_Hero']


def build_pedestal_v2():
    """Hero framing: the robot's legs sit behind the partner strip, so the pedestal is a
    hidden cap plus a long glossy tube that continues below the strip (as in the reference)."""
    c = coll('WEB_Pedestal')
    for o in list(c.objects): D.objects.remove(o)
    mat = simple_mat('M_Pedestal', '#DCDBDF', 0.36, coat=0.25)
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=9.6 * CM, depth=1.5 * CM, location=(0, 0, -0.75 * CM))
    cap = bpy.context.active_object; cap.name = 'WEB_Pedestal_Cap'; cap.data.name = 'WEB_Pedestal_Cap'
    for cc in cap.users_collection: cc.objects.unlink(cap)
    c.objects.link(cap); cap.data.materials.append(mat); hard_surface(cap, 0.3 * CM, 3)
    for p in cap.data.polygons: p.use_smooth = True
    bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=8.2 * CM, depth=100 * CM, location=(0, 0, -1.5 * CM - 50 * CM))
    t = bpy.context.active_object; t.name = 'WEB_Pedestal_Tube'; t.data.name = 'WEB_Pedestal_Tube'
    for cc in t.users_collection: cc.objects.unlink(t)
    c.objects.link(t)
    for p in t.data.polygons: p.use_smooth = True
    tube = simple_mat('M_Pedestal_Tube', '#E2E1E5', 0.22, coat=0.6)
    t.data.materials.append(tube)


def hero_camera(yaw_dir=(0.42, -1.0), dist=1.30, cam_z=0.30, frame_center_z=0.025, frame_h=0.55, lens=85, pitch_deg=1.0):
    cam = D.objects['CAM_Hero']
    cam.data.lens = lens; cam.data.sensor_fit = 'AUTO'; cam.data.sensor_width = 36
    d = Vector((yaw_dir[0], yaw_dir[1], 0)).normalized()
    cam.location = d * dist + Vector((0, 0, cam_z))
    look = (-d)
    look.z = -math.tan(math.radians(pitch_deg))
    cam.rotation_euler = look.normalized().to_track_quat('-Z', 'Y').to_euler()
    # frame height at the subject distance for this lens (square render)
    fov_h = 2 * dist * math.tan(math.atan(18 / lens))
    cam.data.shift_y = (frame_center_z - cam_z + dist * math.tan(math.radians(pitch_deg))) / fov_h
    cam.data.shift_x = 0
    return cam, fov_h
