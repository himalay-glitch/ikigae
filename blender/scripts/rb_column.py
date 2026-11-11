"""rb_column.py - the page's central column: tube from the hero -> stasis capsule with a
mini robot -> (separate render) glass tube. Built in its own scene, front ortho camera.

Page units: 1u = 1px at 1440 wide. Scene scale: 1u = 0.68 mm (so the tube matches the
hero tube). Z is page-down negative: z = -(page_y_u) * K.
"""
import bpy, bmesh, math
from mathutils import Vector
from rb_web import srgb, simple_mat, hard_surface, add_rough_noise

K = 0.00068          # metres per page unit
D = bpy.data
OUT = '/private/tmp/claude-501/-Users-uxui-Documents-GitHub-ikigai/3a05833e-031a-45bf-b8f8-59482a7da215/scratchpad/bl/'


def Z(page_y):
    return -page_y * K


def scene(name):
    sc = D.scenes.get(name) or D.scenes.new(name)
    for o in list(sc.objects):
        if o.type != 'EMPTY' or not o.instance_collection:
            D.objects.remove(o)
        else:
            D.objects.remove(o)
    return sc


def link(sc, o):
    for c in o.users_collection: c.objects.unlink(o)
    sc.collection.objects.link(o)
    return o


def cyl(sc, name, r, z_top, z_bot, mat, verts=128, bevel=0.0015):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=z_top - z_bot, location=(0, 0, (z_top + z_bot) / 2), rotation=(0, 0, 0), align='WORLD')
    o = bpy.context.active_object; o.name = name; o.data.name = name
    link(sc, o)
    for p in o.data.polygons: p.use_smooth = True
    o.data.materials.append(mat)
    if bevel: hard_surface(o, bevel, 3)
    return o


def mats():
    m = {}
    m['white'] = simple_mat('M_Col_White', '#E6E5E9', 0.3, coat=0.4)
    add_rough_noise(m['white'], 0.3, 0.05, 30)
    m['tube'] = simple_mat('M_Col_Tube', '#C9C8CE', 0.22, coat=1.0)
    m['post'] = simple_mat('M_Col_Post', '#D9D8DC', 0.35, coat=0.2)
    m['orange'] = simple_mat('M_Col_Orange', '#FE5A10', 0.3, emit='#FF4A00', es=1.2)
    g = D.materials.get('M_Col_Glass') or D.materials.new('M_Col_Glass')
    g.use_nodes = True
    p = next(n for n in g.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = srgb('#F4F6F8')
    p.inputs['Roughness'].default_value = 0.04
    p.inputs['Transmission Weight'].default_value = 1.0
    p.inputs['IOR'].default_value = 1.45
    m['glass'] = g
    m['block_w'] = simple_mat('M_Col_Block_W', '#EDECEF', 0.4)
    m['block_g'] = simple_mat('M_Col_Block_G', '#A9A8AE', 0.45)
    return m


def build():
    sc = scene('COLUMN')
    M = mats()
    # (a) tube continuing from the hero, from behind the partner strip to the capsule
    cyl(sc, 'COL_Tube_Top', 83 * 0.001, Z(690), Z(1050), M['tube'], bevel=0)
    # (b) capsule
    R = 110.5 * 0.001
    cap = cyl(sc, 'COL_Cap', R, Z(1039), Z(1140), M['white'], bevel=0.006)
    cyl(sc, 'COL_Cap_Lip', R - 0.010, Z(1032), Z(1046), M['white'], bevel=0.003)
    cyl(sc, 'COL_Cap_Groove', R + 0.0008, Z(1112), Z(1116), M['post'], bevel=0)
    # glass + inner posts
    glass = cyl(sc, 'COL_Glass', R - 0.006, Z(1140), Z(1508), M['glass'], verts=160, bevel=0)
    sol = glass.modifiers.new('Solidify', 'SOLIDIFY'); sol.thickness = 0.004
    for a in (0, 90, 180, 270):
        ang = math.radians(a + 45)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(math.cos(ang) * (R - 0.012), math.sin(ang) * (R - 0.012), Z(1324)), rotation=(0, 0, 0), align='WORLD')
        p = bpy.context.active_object; p.name = f'COL_Post_{a}'; p.data.name = p.name
        p.scale = (0.012, 0.012, (Z(1140) - Z(1508)))
        p.rotation_euler = (0, 0, ang)
        link(sc, p); p.data.materials.append(M['post'])
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        hard_surface(p, 0.002, 2)
    # orange ring + base
    cyl(sc, 'COL_Ring', R + 0.0015, Z(1508), Z(1520), M['orange'], bevel=0.0015)
    cyl(sc, 'COL_Base_A', R, Z(1520), Z(1643), M['white'], bevel=0.005)
    cyl(sc, 'COL_Base_B', 126 * 0.001, Z(1643), Z(1760), M['white'], bevel=0.007)
    # pixel-block floor inside the glass
    import random
    random.seed(7)
    floor_z = Z(1508)
    s = 0.017
    for ix in range(-5, 6):
        for iy in range(-5, 6):
            x, y = ix * s, iy * s
            if math.hypot(x, y) > R - 0.022: continue
            h = s * random.choice([0.4, 0.7, 1.0, 1.0, 1.4]) if (ix + iy) % 2 == 0 else s * random.choice([0.3, 0.5, 0.8])
            bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, floor_z + h / 2), rotation=(0, 0, 0), align='WORLD')
            b = bpy.context.active_object; b.name = f'COL_Block_{ix}_{iy}'; b.data.name = b.name
            b.scale = (s * 0.98, s * 0.98, h)
            link(sc, b)
            b.data.materials.append(M['block_w'] if (ix + iy) % 2 == 0 else M['block_g'])
    # mini robot: instance of the hero robot collections, floating mid-capsule
    for cname in ('ROBOT_Geo', 'ROBOT_Eyes'):
        e = D.objects.new(f'COL_Robot_{cname}', None)
        e.instance_type = 'COLLECTION'; e.instance_collection = D.collections[cname]
        sc.collection.objects.link(e)
        e.scale = (0.55, 0.55, 0.55)
        e.location = (0.0, 0.0, Z(1452))
        e.rotation_euler = (0, 0, math.radians(-14))
    return sc


def lights_camera(sc, top_u=690, bot_u=1760, width_u=440, px_per_u=2):
    for n in [o.name for o in sc.objects if o.type in ('LIGHT', 'CAMERA')]:
        D.objects.remove(D.objects[n])

    def area(name, loc, size, energy):
        L = D.lights.new(name, 'AREA'); L.size = size; L.energy = energy
        o = D.objects.new(name, L); sc.collection.objects.link(o)
        o.location = loc
        tgt = Vector((0, 0, Z((top_u + bot_u) / 2)))
        o.rotation_euler = (tgt - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    zc = Z((top_u + bot_u) / 2)
    area('COL_Key', (-0.9, -1.2, zc + 0.6), 1.4, 90)
    area('COL_Fill', (1.2, -1.0, zc), 1.6, 25)
    area('COL_Rim', (0.6, 1.0, zc + 0.5), 1.0, 50)
    w = D.worlds.get('WLD_Column') or D.worlds.new('WLD_Column'); w.use_nodes = True; sc.world = w
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = srgb('#E4E4E4'); bg.inputs['Strength'].default_value = 0.45
    cd = D.cameras.new('CAM_Column'); cd.type = 'ORTHO'
    h = (bot_u - top_u) * K
    cd.ortho_scale = max(h, width_u * K)
    cam = D.objects.new('CAM_Column', cd); sc.collection.objects.link(cam)
    tilt = math.radians(3)
    cam.location = (0, -3.0 * math.cos(tilt), zc + 3.0 * math.sin(tilt))
    cam.rotation_euler = (math.radians(90) - tilt, 0, 0)
    sc.camera = cam
    r = sc.render
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 128; sc.cycles.use_denoising = True
    r.film_transparent = True; sc.render.film_transparent = True
    sc.cycles.film_transparent_glass = True
    r.resolution_x = int(width_u * px_per_u); r.resolution_y = int((bot_u - top_u) * px_per_u)
    r.resolution_percentage = 100
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.view_settings.exposure = -0.4
    r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'
    return cam
