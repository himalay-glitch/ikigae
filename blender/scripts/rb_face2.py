"""rb_face2.py - face redesign v2: flush black glass visor in a thin titanium bezel,
with a small orange status bar below. Replaces the thick gradient frame."""
import bpy, bmesh, math
from rb_web import srgb, simple_mat, rrect, ring_mesh, hard_surface, parent_to_body, CM

D = bpy.data
CX = 0.135 * CM
VIS = dict(cx=CX, cz=17.0 * CM, w=19.4 * CM, h=16.0 * CM, r=3.0 * CM)
VIS_FRONT = -10.30 * CM


def slab_mesh(name, outline, y_back, y_front, mat, origin):
    ox, oy, oz = origin
    bm = bmesh.new()
    f = [bm.verts.new((x - ox, y_front - oy, z - oz)) for x, z in outline]
    b = [bm.verts.new((x - ox, y_back - oy, z - oz)) for x, z in outline]
    bm.faces.new(f)
    bm.faces.new(list(reversed(b)))
    n = len(outline)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((b[i], b[j], f[j], f[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = D.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    o = D.objects.new(name, me); o.location = origin
    me.materials.append(mat)
    return o


def build():
    coll = D.collections['ROBOT_Geo']
    for n in ['RB_Visor', 'RB_Visor_Bezel', 'RB_Status_Bar']:
        if n in D.objects: D.objects.remove(D.objects[n])
    # retire the v1 face
    for n in ['RB_Face_Frame', 'RB_Face_Lip', 'RB_Face_Screen', 'RB_Eye_L', 'RB_Eye_R']:
        o = D.objects.get(n)
        if o: o.hide_render = True; o.hide_viewport = True

    glass = simple_mat('M_Visor_Glass', '#0F0C0D', 0.12, coat=1.0)
    p = next(n for n in glass.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    p.inputs['Coat Roughness'].default_value = 0.04
    bezel = simple_mat('M_Visor_Bezel', '#9A999F', 0.28)
    next(n for n in bezel.node_tree.nodes if n.type == 'BSDF_PRINCIPLED').inputs['Metallic'].default_value = 1.0
    status = simple_mat('M_Status_Orange', '#FE6F22', 0.35, emit='#FE6F22', es=2.0)

    v = VIS
    outline = rrect(v['cx'], v['cz'], v['w'], v['h'], v['r'], seg=12)
    visor = slab_mesh('RB_Visor', outline, -9.70 * CM, VIS_FRONT, glass, (v['cx'], -10.0 * CM, v['cz']))
    hard_surface(visor, 0.28 * CM, 4)
    parent_to_body(visor, coll)

    pad = 0.38 * CM
    outer = rrect(v['cx'], v['cz'], v['w'] + 2 * pad, v['h'] + 2 * pad, v['r'] + pad, seg=12)
    ring = ring_mesh('RB_Visor_Bezel', outer, outline, -9.72 * CM, -10.16 * CM, bezel, (v['cx'], -9.95 * CM, v['cz']))
    hard_surface(ring, 0.12 * CM, 3)
    parent_to_body(ring, coll)

    bar_outline = rrect(v['cx'], 7.75 * CM, 4.6 * CM, 0.62 * CM, 0.30 * CM, seg=8)
    bar = slab_mesh('RB_Status_Bar', bar_outline, -9.72 * CM, -9.95 * CM, status, (v['cx'], -9.8 * CM, 7.75 * CM))
    hard_surface(bar, 0.08 * CM, 2)
    parent_to_body(bar, coll)
    print('face2 built')
