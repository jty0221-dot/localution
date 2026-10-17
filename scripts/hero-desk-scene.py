"""Original Blender 3D scene: a shop owner's after-hours desk, not a real customer.
Run Blender --background --python scripts/hero-desk-scene.py -- --preview output.png
or --frames output-dir. No downloaded models, faces, customer data or paid service.
"""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=960; scene.render.resolution_y=540; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.fps=24; scene.frame_start=1; scene.frame_end=120
scene.world.color=(0.09,0.11,0.13)
scene.view_settings.view_transform='AgX'

def mat(name,color,metal=0,rough=.5):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 shader=m.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(*color,1)
 shader.inputs['Metallic'].default_value=metal;shader.inputs['Roughness'].default_value=rough
 return m
wood=mat('Walnut',(0.12,.065,.035),0,.4)
ivory=mat('Paper',(.82,.8,.71));ink=mat('Graphite',(.025,.035,.038),.2,.3)
green=mat('Deep teal',(.025,.19,.16),.2,.28);glass=mat('Quiet screen',(.04,.12,.11),.3,.17)
brass=mat('Brushed brass',(.45,.28,.1),.65,.28);ceramic=mat('Cream ceramic',(.66,.6,.48),0,.24)

def box(name,location,scale,material,bevel=.03):
 bpy.ops.mesh.primitive_cube_add(size=1,location=location);o=bpy.context.object;o.name=name;o.dimensions=scale
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.data.materials.append(material)
 if bevel:
  modifier=o.modifiers.new('Soft physical edges','BEVEL');modifier.width=bevel;modifier.segments=3
  o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def cylinder(name,location,radius,depth,material):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=radius,depth=depth,location=location)
 o=bpy.context.object;o.name=name;o.data.materials.append(material)
 modifier=o.modifiers.new('Edge highlights','BEVEL');modifier.width=.02;modifier.segments=3
 o.modifiers.new('Smooth normals','WEIGHTED_NORMAL');return o

box('Counter',(0,0,-.14),(9,6,.25),wood)
box('Back wall',(0,3,2),(12,.2,5),green)
# Out-of-focus architectural shapes identify a quiet shop without a named business.
for x in [-3,-1,1,3]:
 box('Shelf upright',(x,2.7,1.6),(.05,.08,2.6),brass,.01)
for z in [.8,1.8,2.8]:
 box('Shelf board',(0,2.6,z),(8,.4,.07),wood,.01)
 for x in [-2.7,-1.4,.2,1.6,2.8]:cylinder('Unbranded container',(x,2.55,z+.22),.16,.35,ceramic)

notebook=box('Open notebook',(-.4,.25,.04),(1.75,1.17,.07),ivory,.02)
box('Notebook binding',(-.4,.25,.09),(.025,1.1,.02),green,.005)
for side in [-1,1]:
 for n in range(7):
  box('Unwritten notebook rule',(-.4+side*.43,-.19+n*.13,.082),(.6,.008,.002),ceramic,.001)
phone=box('Phone body',(1.35,-.15,.1),(.64,1.2,.13),ink,.08)
box('Phone screen',(1.35,-.15,.173),(.56,1.04,.015),glass,.055)
for i in range(3):box('Abstract unread marker',(1.35,-.43+i*.28,.184),(.4,.12,.003),green,.015)
# A physical monitor displays a real, publicly generated UTM example capture.
box('Monitor foot',(0,1.1,.06),(.8,.5,.08),ink,.04)
box('Monitor stand',(0,1.25,.37),(.12,.12,.58),brass,.03)
box('Monitor casing',(0,1.34,1.12),(2.62,.12,1.25),ink,.06)
capture=Path(__file__).resolve().parents[1]/'public/tutorials/campaign-url-source.png'
screen_material=bpy.data.materials.new('Real Localution production UTM capture');screen_material.use_nodes=True
nodes=screen_material.node_tree.nodes;nodes.clear()
tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(capture))
em=nodes.new('ShaderNodeEmission');em.inputs['Strength'].default_value=.75
output=nodes.new('ShaderNodeOutputMaterial')
screen_material.node_tree.links.new(tex.outputs['Color'],em.inputs['Color']);screen_material.node_tree.links.new(em.outputs[0],output.inputs['Surface'])
bpy.ops.mesh.primitive_plane_add(size=1,location=(0,1.267,1.12),rotation=(math.pi/2,0,0))
screen=bpy.context.object;screen.name='Actual UTM result screen';screen.scale=(2.44,1.107,1);screen.data.materials.append(screen_material)
box('Pen',(-1.5,-.2,.07),(.09,1.25,.09),ink,.03).rotation_euler[2]=-.25
cylinder('Cup',(-2,.9,.25),.28,.5,ceramic)
cylinder('Coffee',(-2,.9,.505),.235,.008,wood)
bpy.ops.mesh.primitive_torus_add(major_radius=.19,minor_radius=.045,location=(-2.3,.9,.29),rotation=(math.pi/2,0,0))
bpy.context.object.name='Cup handle';bpy.context.object.data.materials.append(ceramic)
for i in range(6):
 p=box('Anonymous receipt '+str(i),(-1.9+i*.36,-1.25+i*.07,.03+i*.007),(.32,.85,.009),ivory,.004)
 p.rotation_euler[2]=-.65+i*.18
 p.keyframe_insert(data_path='location',frame=1);p.keyframe_insert(data_path='rotation_euler',frame=1)
 p.location=(-1.55,-1.1,.03+i*.014);p.rotation_euler=(0,0,0)
 p.keyframe_insert(data_path='location',frame=72);p.keyframe_insert(data_path='rotation_euler',frame=72)
 p.keyframe_insert(data_path='location',frame=120);p.keyframe_insert(data_path='rotation_euler',frame=120)

def area(name,loc,energy,color,size,target):
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name
 o.data.energy=energy;o.data.color=color;o.data.shape='DISK';o.data.size=size
 o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm closing light',(-3,-2,5),650,(1,.69,.39),4,(0,0,0))
area('Cool evening window',(4,1,4),900,(.48,.72,1),3,(0,0,.2))
area('Soft tabletop fill',(0,-4,2),100,(.9,1,.94),3,(0,0,0))
bpy.ops.object.camera_add(location=(4.6,-6.4,5.4));camera=bpy.context.object
camera.rotation_euler=(Vector((0,0,.05))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.lens=45;camera.data.dof.use_dof=True;camera.data.dof.focus_distance=(camera.location-Vector((0,0,.1))).length;camera.data.dof.aperture_fstop=4
scene.camera=camera
camera.keyframe_insert(data_path='location',frame=1);camera.keyframe_insert(data_path='rotation_euler',frame=1)
camera.data.keyframe_insert(data_path='dof.focus_distance',frame=1)
camera.location=(2.9,-4.9,3.5);camera.rotation_euler=(Vector((0,.5,.5))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.keyframe_insert(data_path='location',frame=62);camera.keyframe_insert(data_path='rotation_euler',frame=62)
camera.data.dof.focus_distance=(camera.location-Vector((0,.5,.5))).length;camera.data.keyframe_insert(data_path='dof.focus_distance',frame=62)
camera.location=(0,-1.9,1.12);camera.rotation_euler=(Vector((0,1.25,1.12))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.keyframe_insert(data_path='location',frame=120);camera.keyframe_insert(data_path='rotation_euler',frame=120)
camera.data.dof.focus_distance=3.15;camera.data.keyframe_insert(data_path='dof.focus_distance',frame=120)
scene.frame_set(int(args[args.index('--frame')+1]) if '--frame' in args else 1)
if '--frames' in args:
 out=Path(args[args.index('--frames')+1]);out.mkdir(parents=True,exist_ok=True)
 scene.render.filepath=str(out/'desk-');bpy.ops.render.render(animation=True)
else:
 out=Path(args[args.index('--preview')+1]) if '--preview' in args else Path('hero-desk-preview.png')
 out.parent.mkdir(parents=True,exist_ok=True);scene.render.filepath=str(out);bpy.ops.render.render(write_still=True)
