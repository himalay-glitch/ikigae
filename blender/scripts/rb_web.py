"""rb_web.py - v007 "web hero" restyle of the robot, to match the reference site robot.

White satin shell, titanium joints, orange->yellow glowing face frame, dark maroon
grid screen with two round white eyes. Removes deck (hover ship), antenna and cyan FX.
Run after opening robot_v006.blend.
"""
import bpy, bmesh, math
from mathutils import Vector

CM = 0.01
D = bpy.data


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c) + (1.0,)


def bsdf(m):
    return next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')


def set_mat(name, base, rough=None, metal=None, emit=None, es=0.0, coat=None, coat_r=0.2):
    m = D.materials[name]
    p = bsdf(m)
    p.inputs['Base Color'].default_value = srgb(base) if isinstance(base, str) else base
    if rough is not None: p.inputs['Roughness'].default_value = rough
    if metal is not None: p.inputs['Metallic'].default_value = metal
    p.inputs['Emission Color'].default_value = srgb(emit) if emit else (1, 1, 1, 1)
    p.inputs['Emission Strength'].default_value = es
    if coat is not None:
        p.inputs['Coat Weight'].default_value = coat
        p.inputs['Coat Roughness'].default_value = coat_r
    return m


def add_rough_noise(m, base, amp, scale=40.0):
    """Roughness is never flat: base +- amp via noise."""
    nt = m.node_tree
    p = bsdf(m)
    for n in [n for n in nt.nodes if n.label.startswith('rn_')]:
        nt.nodes.remove(n)
    tc = nt.nodes.new('ShaderNodeTexCoord'); tc.label = 'rn_tc'
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.label = 'rn_noise'
    nz.inputs['Scale'].default_value = scale
    nz.inputs['Detail'].default_value = 6
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.label = 'rn_map'
    mr.inputs['To Min'].default_value = base - amp
    mr.inputs['To Max'].default_value = base + amp
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    nt.links.new(nz.outputs['Fac'], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], p.inputs['Roughness'])


# ---------------------------------------------------------------- materials
def restyle_materials():
    m = set_mat('M_Shell_Main', '#ECEBEF', 0.32, 0.0, coat=0.35, coat_r=0.18)
    add_rough_noise(m, 0.32, 0.07)
    set_mat('M_Accent', '#D6D4DA', 0.42, 0.0, coat=0.2)
    set_mat('M_Joint_Metal', '#A9A8AE', 0.3, 1.0)
    set_mat('M_Rubber', '#2F2E33', 0.72, 0.0)
    set_mat('M_Details', '#BEBCC2', 0.38, 0.0)
    set_mat('M_Backpack', '#DCDADF', 0.45, 0.0)
    set_mat('M_LED_Red', '#FF5A12', 0.4, 0.0, emit='#FF5A12', es=6.0)
    set_mat('M_FX_Glow', '#FF6A1A', 0.35, 0.0, emit='#FF6A1A', es=1.6)
    set_mat('M_FX_Seam', '#CFCDD2', 0.4, 0.0)           # seam reads as a line, no glow
    set_mat('M_Antenna', '#A9A8AE', 0.35, 1.0)


def frame_material():
    m = D.materials.get('M_Face_Frame') or D.materials.new('M_Face_Frame')
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    p = nt.nodes.new('ShaderNodeBsdfPrincipled')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    # object space: frame origin is the frame centre; Z runs -h/2..h/2, X -w/2..w/2
    # gradient runs bottom-left (orange) -> top-right (yellow), like the reference
    mz = nt.nodes.new('ShaderNodeMath'); mz.operation = 'MULTIPLY_ADD'
    mz.inputs[1].default_value = 1.0 / (0.19)
    mz.inputs[2].default_value = 0.5
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MULTIPLY'
    mx.inputs[1].default_value = 0.9
    add = nt.nodes.new('ShaderNodeMath'); add.operation = 'ADD'; add.use_clamp = True
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    els = ramp.color_ramp.elements
    els[0].position = 0.0; els[0].color = srgb('#FF5A00')
    els[1].position = 1.0; els[1].color = srgb('#FFE600')
    e = els.new(0.42); e.color = srgb('#FF8000')
    e = els.new(0.70); e.color = srgb('#FFB800')
    L = nt.links.new
    L(tc.outputs['Object'], sep.inputs[0])
    L(sep.outputs['Z'], mz.inputs[0])
    L(sep.outputs['X'], mx.inputs[0])
    L(mz.outputs[0], add.inputs[0]); L(mx.outputs[0], add.inputs[1])
    L(add.outputs[0], ramp.inputs['Fac'])
    L(ramp.outputs['Color'], p.inputs['Base Color'])
    L(ramp.outputs['Color'], p.inputs['Emission Color'])
    p.inputs['Emission Strength'].default_value = 0.35
    p.inputs['Roughness'].default_value = 0.3
    p.inputs['Coat Weight'].default_value = 0.6
    p.inputs['Coat Roughness'].default_value = 0.08
    L(p.outputs[0], out.inputs[0])
    return m


def screen_material():
    m = D.materials.get('M_Screen_Grid') or D.materials.new('M_Screen_Grid')
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    p = nt.nodes.new('ShaderNodeBsdfPrincipled')
    tc = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    L = nt.links.new
    L(tc.outputs['Object'], sep.inputs[0])
    cell = 1.95 * CM
    width = 0.014          # line half-width as fraction of a cell

    def lines(axis_out):
        mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.inputs[1].default_value = 1 / cell
        fr = nt.nodes.new('ShaderNodeMath'); fr.operation = 'FRACT'
        # distance to nearest integer: |fract(v) - 0.5| close to 0.5 => line
        sub = nt.nodes.new('ShaderNodeMath'); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = 0.5
        ab = nt.nodes.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'
        gt = nt.nodes.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0.5 - width
        L(axis_out, mul.inputs[0]); L(mul.outputs[0], fr.inputs[0]); L(fr.outputs[0], sub.inputs[0])
        L(sub.outputs[0], ab.inputs[0]); L(ab.outputs[0], gt.inputs[0])
        return gt.outputs[0]
    lx = lines(sep.outputs['X'])
    lz = lines(sep.outputs['Z'])
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'
    L(lx, mx.inputs[0]); L(lz, mx.inputs[1])
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    mix.inputs['A'].default_value = srgb('#2B1216')
    mix.inputs['B'].default_value = srgb('#6E5056')
    L(mx.outputs[0], mix.inputs['Factor'])
    L(mix.outputs['Result'], p.inputs['Base Color'])
    em = nt.nodes.new('ShaderNodeMath'); em.operation = 'MULTIPLY'; em.inputs[1].default_value = 0.12
    L(mx.outputs[0], em.inputs[0])
    p.inputs['Emission Color'].default_value = srgb('#F3D7DA')
    L(em.outputs[0], p.inputs['Emission Strength'])
    p.inputs['Roughness'].default_value = 0.12
    p.inputs['Coat Weight'].default_value = 1.0
    p.inputs['Coat Roughness'].default_value = 0.03
    L(p.outputs[0], out.inputs[0])
    return m


def simple_mat(name, base, rough, emit=None, es=0.0, coat=0.0):
    m = D.materials.get(name) or D.materials.new(name)
    m.use_nodes = True
    p = bsdf(m)
    p.inputs['Base Color'].default_value = srgb(base)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Coat Weight'].default_value = coat
    if emit:
        p.inputs['Emission Color'].default_value = srgb(emit)
        p.inputs['Emission Strength'].default_value = es
    return m


# ---------------------------------------------------------------- geometry
def rrect(cx, cz, w, h, r, seg=8):
    """Rounded-rect outline in XZ, counter-clockwise, 4*(seg+1) points."""
    pts = []
    corners = [(cx + w / 2 - r, cz + h / 2 - r, 0), (cx - w / 2 + r, cz + h / 2 - r, 90),
               (cx - w / 2 + r, cz - h / 2 + r, 180), (cx + w / 2 - r, cz - h / 2 + r, 270)]
    for x0, z0, a0 in corners:
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((x0 + r * math.cos(a), z0 + r * math.sin(a)))
    return pts


def ring_mesh(name, outer, inner, y_back, y_front, mat, origin):
    """Extruded ring between two outlines with equal point counts. Built in local
    space around `origin` so object-space shading coordinates are centred."""
    ox, oy, oz = origin
    bm = bmesh.new()
    n = len(outer)

    def loop(pts, y):
        return [bm.verts.new((x - ox, y - oy, z - oz)) for x, z in pts]
    of, ob = loop(outer, y_front), loop(outer, y_back)
    inf, inb = loop(inner, y_front), loop(inner, y_back)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((of[i], of[j], inf[j], inf[i]))      # front
        bm.faces.new((ob[j], ob[i], inb[i], inb[j]))      # back
        bm.faces.new((ob[i], ob[j], of[j], of[i]))        # outer wall
        bm.faces.new((inf[i], inf[j], inb[j], inb[i]))    # inner wall
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = D.meshes.new(name); bm.to_mesh(me); bm.free()
    for poly in me.polygons: poly.use_smooth = True
    ob_ = D.objects.new(name, me)
    ob_.location = origin
    me.materials.append(mat)
    return ob_


def plane_mesh(name, pts, y, mat, origin):
    ox, oy, oz = origin
    bm = bmesh.new()
    vs = [bm.verts.new((x - ox, y - oy, z - oz)) for x, z in pts]
    f = bm.faces.new(vs)
    f.normal_update()
    if f.normal.y > 0: f.normal_flip()
    me = D.meshes.new(name); bm.to_mesh(me); bm.free()
    ob_ = D.objects.new(name, me); ob_.location = origin
    me.materials.append(mat)
    return ob_


def disc(name, cx, y, cz, r, mat, seg=48):
    pts = [(cx + r * math.cos(2 * math.pi * i / seg), cz + r * math.sin(2 * math.pi * i / seg)) for i in range(seg)]
    return plane_mesh(name, pts, y, mat, (cx, y, cz))


def hard_surface(ob, width=0.6 * CM, segs=3):
    b = ob.modifiers.new('Bevel', 'BEVEL'); b.width = width; b.segments = segs
    b.limit_method = 'ANGLE'; b.angle_limit = math.radians(40); b.harden_normals = False
    ob.modifiers.new('WeightedNormal', 'WEIGHTED_NORMAL').keep_sharp = True


def parent_to_body(ob, coll):
    rig = D.objects['RB_Rig']
    from mathutils import Matrix
    coll.objects.link(ob)
    mw = Matrix.Translation(ob.location)   # objects are built unrotated at their origin
    ob.parent = rig; ob.parent_type = 'BONE'; ob.parent_bone = 'DEF-Body'
    bpy.context.view_layer.update()
    ob.matrix_world = mw


def build_face():
    coll = D.collections['ROBOT_Geo']
    for n in ['RB_Face_Frame', 'RB_Face_Lip', 'RB_Face_Screen', 'RB_Eye_L', 'RB_Eye_R']:
        if n in D.objects: D.objects.remove(D.objects[n])
    cx = 0.135 * CM
    # outer frame  (thicker at the bottom, like the reference)
    fo = rrect(cx, 16.25 * CM, 20.3 * CM, 17.6 * CM, 2.5 * CM)
    fi = rrect(cx, 16.45 * CM, 14.8 * CM, 11.8 * CM, 1.3 * CM)
    frame = ring_mesh('RB_Face_Frame', fo, fi, -9.74 * CM, -11.0 * CM, frame_material(), (cx, -10.0 * CM, 16.25 * CM))
    hard_surface(frame, 0.35 * CM, 4)
    parent_to_body(frame, coll)
    # inner lip (light grey bezel)
    lip_mat = simple_mat('M_Face_Lip', '#D9D5DA', 0.35, coat=0.3)
    li = rrect(cx, 16.45 * CM, 13.7 * CM, 10.7 * CM, 0.8 * CM)
    lip = ring_mesh('RB_Face_Lip', fi, li, -9.58 * CM, -9.98 * CM, lip_mat, (cx, -9.8 * CM, 16.45 * CM))
    hard_surface(lip, 0.12 * CM, 2)
    parent_to_body(lip, coll)
    # screen (grid glass), slightly larger than the lip opening
    scr_pts = rrect(cx, 16.45 * CM, 14.0 * CM, 11.0 * CM, 0.9 * CM)
    scr = plane_mesh('RB_Face_Screen', scr_pts, -9.62 * CM, screen_material(), (cx, -9.62 * CM, 16.45 * CM))
    parent_to_body(scr, coll)
    # eyes
    eye_mat = simple_mat('M_Eye_Dot', '#FFFFFF', 0.4, emit='#FFFFFF', es=4.0)
    eyes = D.collections['ROBOT_Eyes']
    for side, sx in (('L', +1), ('R', -1)):
        e = disc(f'RB_Eye_{side}', cx + sx * 3.05 * CM, -9.66 * CM, 15.85 * CM, 1.22 * CM, eye_mat)
        parent_to_body(e, eyes)
    return frame


HIDE = ['RB_Screen_Bezel', 'RB_Screen_Glass', 'RB_Eye_Display', 'RB_Eye_Dots', 'FX_Ring_Screen',
        'RB_Detail_Front', 'RB_Antenna', 'FX_Orb_Antenna', 'ENV_Ground', 'LGT_Hover', 'LGT_DeckSheen']


def hide(names):
    for n in names:
        o = D.objects.get(n)
        if o: o.hide_render = True; o.hide_viewport = True
    for o in D.collections['ROBOT_Deck'].objects:
        o.hide_render = True; o.hide_viewport = True


def run():
    restyle_materials()
    hide(HIDE)
    # face bottom strip becomes shell white so the face reads as one white surface
    fa = D.objects['RB_Shell_Front_Accent']
    for s in fa.material_slots: s.material = D.materials['M_Shell_Main']
    build_face()
    print('rb_web: done')


if __name__ == '__main__':
    run()
