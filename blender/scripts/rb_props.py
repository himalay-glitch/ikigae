"""rb_props.py - section props: glass tube, three spheres, glass orb, glass molecule."""
import bpy, math
from mathutils import Vector
from rb_web import srgb, simple_mat, hard_surface
from rb_column import K, Z, link

D = bpy.data
OUT = '/private/tmp/claude-501/-Users-uxui-Documents-GitHub-ikigai/3a05833e-031a-45bf-b8f8-59482a7da215/scratchpad/bl/'


def fresh(name):
    sc = D.scenes.get(name) or D.scenes.new(name)
    for o in list(sc.objects): D.objects.remove(o)
    return sc


def glass_mat(name='M_Prop_Glass', tint='#F4F6F8', rough=0.03):
    g = D.materials.get(name) or D.materials.new(name)
    g.use_nodes = True
    p = next(n for n in g.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value = srgb(tint)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Transmission Weight'].default_value = 1.0
    p.inputs['IOR'].default_value = 1.45
    return g


def prim(sc, kind, name, mat, smooth=True, **kw):
    kw.setdefault('rotation', (0, 0, 0)); kw['align'] = 'WORLD'
    getattr(bpy.ops.mesh, f'primitive_{kind}_add')(**kw)
    o = bpy.context.active_object; o.name = name; o.data.name = name
    link(sc, o)
    if smooth:
        for p in o.data.polygons: p.use_smooth = True
    o.data.materials.append(mat)
    return o


def studio(sc, target=(0, 0, 0), scale=1.0, world='#E4E4E4', world_strength=0.45, key=90, transparent=True):
    def area(name, loc, size, energy):
        L = D.lights.new(name, 'AREA'); L.size = size * scale; L.energy = energy * scale * scale
        o = D.objects.new(name, L); sc.collection.objects.link(o)
        o.location = Vector(target) + Vector(loc) * scale
        o.rotation_euler = (Vector(target) - o.location).to_track_quat('-Z', 'Y').to_euler()
    area(f'{sc.name}_Key', (-0.9, -1.2, 0.9), 1.3, key)
    area(f'{sc.name}_Fill', (1.2, -1.0, 0.1), 1.6, key * 0.28)
    area(f'{sc.name}_Rim', (0.6, 1.0, 0.6), 1.0, key * 0.55)
    w = D.worlds.get(f'WLD_{sc.name}') or D.worlds.new(f'WLD_{sc.name}'); w.use_nodes = True; sc.world = w
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = srgb(world); bg.inputs['Strength'].default_value = world_strength
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 160; sc.cycles.use_denoising = True
    sc.render.film_transparent = transparent; sc.cycles.film_transparent_glass = True
    sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'; sc.view_settings.exposure = -0.4
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'


def ortho_cam(sc, center, scale, rx, ry, tilt=3, dist=3.0, yaw=0):
    cd = D.cameras.new(f'CAM_{sc.name}'); cd.type = 'ORTHO'; cd.ortho_scale = scale
    cam = D.objects.new(f'CAM_{sc.name}', cd); sc.collection.objects.link(cam)
    t = math.radians(tilt); y = math.radians(yaw)
    d = Vector((math.sin(y) * math.cos(t), -math.cos(y) * math.cos(t), math.sin(t)))
    cam.location = Vector(center) + d * dist
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    sc.render.resolution_x = rx; sc.render.resolution_y = ry; sc.render.resolution_percentage = 100
    return cam


# ------------------------------------------------------------- glass tube (section 3)
def glass_tube():
    sc = fresh('GLASSTUBE')
    g = glass_mat()
    t = prim(sc, 'cylinder', 'GT_Tube', g, vertices=160, radius=0.083, depth=1.2, location=(0, 0, Z(2290)))
    s = t.modifiers.new('Solidify', 'SOLIDIFY'); s.thickness = 0.005
    # a frosted inner core gives the tube body like the reference's milky glass
    core = prim(sc, 'cylinder', 'GT_Core', glass_mat('M_Prop_Frost', '#EEF0F3', 0.18), vertices=96, radius=0.072, depth=1.2, location=(0, 0, Z(2290)))
    core.hide_render = True
    studio(sc, target=(0, 0, Z(2290)), key=80)
    ortho_cam(sc, (0, 0, Z(2290)), (2665 - 1915) * K, 300 * 2, (2665 - 1915) * 2, tilt=0)
    return sc


# ------------------------------------------------------------- three spheres (section 2 tile)
def spheres():
    sc = fresh('SPHERES')
    m = simple_mat('M_Prop_Clay', '#E8E8EA', 0.55)
    for name, loc, r in [('SP_A', (-0.036, 0.01, -0.004), 0.031), ('SP_B', (0.016, 0.02, 0.022), 0.031), ('SP_C', (0.012, -0.012, -0.018), 0.031)]:
        prim(sc, 'uv_sphere', name, m, segments=96, ring_count=48, radius=r, location=loc)
    studio(sc, key=60, world_strength=0.55)
    ortho_cam(sc, (0, 0, 0), 0.15, 352, 352, tilt=10)
    return sc


# ------------------------------------------------------------- glass orb (section 3 tile)
def orb():
    sc = fresh('ORB')
    prim(sc, 'uv_sphere', 'ORB_Glass', glass_mat('M_Orb_Glass', '#F7F8FA', 0.02), segments=128, ring_count=64, radius=0.05)
    prim(sc, 'uv_sphere', 'ORB_Core', simple_mat('M_Orb_Core', '#BDBCC1', 0.5), segments=96, ring_count=48, radius=0.026, location=(-0.004, -0.012, -0.004))
    ring = prim(sc, 'torus', 'ORB_Ring', simple_mat('M_Orb_Ring', '#F2F2F4', 0.25, coat=0.6), major_radius=0.034, minor_radius=0.0035,
                major_segments=128, minor_segments=24, location=(0.014, -0.018, 0.022))
    ring.rotation_euler = (math.radians(70), math.radians(-25), math.radians(20))
    studio(sc, key=70, world='#F6F6F6', world_strength=0.6)
    ortho_cam(sc, (0, 0, 0), 0.15, 352, 352, tilt=8)
    return sc


# ------------------------------------------------------------- glass molecule (section 4)
def molecule():
    sc = fresh('MOLECULE')
    g = glass_mat('M_Mol_Glass', '#F3F5F7', 0.02)
    frost = glass_mat('M_Mol_Rod', '#EDEFF2', 0.22)
    white = simple_mat('M_Mol_White', '#ECEBEE', 0.35, coat=0.4)
    orange = simple_mat('M_Mol_Orange', '#FF8A1E', 0.3, emit='#FF6A00', es=0.6)
    nodes = {
        'A': ((-0.20, 0, 0.10), 'glass'), 'B': ((0.26, 0, 0.10), 'cube'),
        'C': ((-0.20, 0, -0.06), 'glass'), 'D': ((-0.32, 0, -0.06), 'glass'),
        'E': ((-0.20, 0, -0.06), 'cube'), 'F': ((-0.02, 0, -0.06), 'glass'),
        'G': ((-0.20, 0, -0.22), 'orange'),
    }
    # layout tuned to read like the reference: an upper bar ending in a cube, a lower cross
    nodes = {
        'A': (Vector((-0.10, 0.0, 0.12)), 'glass'),
        'B': (Vector((0.36, 0.0, 0.12)), 'cube'),
        'C': (Vector((-0.10, 0.0, -0.04)), 'cube'),
        'D': (Vector((-0.30, 0.0, -0.04)), 'glass'),
        'E': (Vector((0.10, 0.0, -0.04)), 'glass'),
        'F': (Vector((-0.10, 0.0, -0.20)), 'orange'),
    }
    edges = [('A', 'B'), ('A', 'C'), ('C', 'D'), ('C', 'E'), ('C', 'F')]
    for k, (p, kind) in nodes.items():
        if kind == 'glass':
            prim(sc, 'uv_sphere', f'MOL_{k}', g, segments=96, ring_count=48, radius=0.048, location=p)
            prim(sc, 'uv_sphere', f'MOL_{k}_in', simple_mat('M_Mol_Core', '#D9D9DD', 0.4), segments=48, ring_count=24, radius=0.018, location=p)
        elif kind == 'cube':
            o = prim(sc, 'cube', f'MOL_{k}', white, size=0.07, location=p); hard_surface(o, 0.012, 5)
        else:
            o = prim(sc, 'cube', f'MOL_{k}', orange, size=0.075, location=p); hard_surface(o, 0.014, 5)
    for a, b in edges:
        pa, pb = nodes[a][0], nodes[b][0]
        mid = (pa + pb) / 2; d = pb - pa
        o = prim(sc, 'cylinder', f'MOL_Rod_{a}{b}', frost, vertices=48, radius=0.016, depth=d.length, location=mid)
        o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    root = D.objects.new('MOL_Root', None); sc.collection.objects.link(root)
    for o in sc.objects:
        if o is not root and o.type == 'MESH': o.parent = root
    root.rotation_euler = (math.radians(8), math.radians(0), math.radians(-28))
    studio(sc, target=(0.03, 0, -0.02), key=110, world_strength=0.5)
    ortho_cam(sc, (0.03, 0, -0.02), 0.82, 1200, 760, tilt=14)
    return sc


def render(sc, path):
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True, scene=sc.name)
