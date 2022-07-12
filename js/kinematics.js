import * as THREE from "three";


/*
  Represents a joint in the arm.
    axis: Vector3      Axis of rotation
    length: float      Length of arm segment
    angle: float       Angle of rotation around axis, in radians
    origin: Object3D   Position and orientation of joint in world space
*/
class Joint {
  constructor(axis, length = 0, angle = 0) {
    this.axis = axis;
    this.length = length;
    this.angle = angle;
    this.origin = new THREE.Object3D();
  }

  create_geometry(scene) {
    const material = new THREE.MeshStandardMaterial();
    const sphere = new THREE.SphereGeometry(0.03, 16, 8);
    const cylinder = new THREE.CylinderGeometry(0.02, 0.02, 1, 8, true);
    cylinder.scale(1, this.length, 1);
    cylinder.translate(0, this.length / 2, 0);

    this.sphere = new THREE.Mesh(sphere, material);
    this.cylinder = new THREE.Mesh(cylinder, material);
    this.origin.add(this.sphere);
    this.origin.add(this.cylinder);
    scene.add(this.origin);
  }

  set_length(length) {
    this.cylinder?.geometry.scale(1, 1 / this.length, 1);
    this.cylinder?.geometry.scale(1, length, 1);
    this.length = length;
  }
}


/*
  Calculate forward kinematics for an array of Joints
    arm: mutable Array<Joint>  The joints to do kinematics on
    pos: mutable Vector3       Base position for the arm (shoulder)
    
    Returns end effector position.
*/
function forward_kinematics(arm, pos) {
  let ang = new THREE.Quaternion();

  let rot = new THREE.Quaternion();
  let segment = new THREE.Vector3();
  arm.forEach(joint => {
    rot.setFromAxisAngle(joint.axis, joint.angle);
    ang.multiply(rot);

    joint.origin.position.copy(pos);
    joint.origin.rotation.setFromQuaternion(ang);

    segment.set(0, joint.length, 0);
    pos.add(segment.applyQuaternion(ang));
  })

  return pos;
}


/*
  Calculate joint angles from a current endpoint position and target position
    target: Vector3    Target position
    endpoint: Vector3  Current position of end effector
    arm: Array<Joint>  Joints in system
    damping: float     Damping to use in inverse

    Returns array of delta theta
*/
// NOTE: this still relies on mathjs. would be nice to remove a dependency, but manual matrix inversion implementation... ugh
function inverse_kinematics(target, endpoint, joints, damping = 0.2) {

  let v = math.subtract(target.toArray(), endpoint.toArray());

  /* Iterating over each joint gives us [dx, dy, dz] in a row of the matrix
     the Jacobian is the transpose of that */
  let L = new THREE.Vector3();
  let J_t = joints.map(joint => {
    L.subVectors(target, joint.origin.position);
    return joint.axis.clone().applyEuler(joint.origin.rotation).cross(L).toArray();
  });
  let J = math.transpose(J_t);

  let J_plus = math.multiply(
    J_t,
    math.inv(math.add(
      math.multiply(J, J_t),
      math.multiply(math.identity(v.length), damping ** 2)
    ))
  );

  return math.multiply(J_plus, v);

}


export {
  Joint,
  forward_kinematics, inverse_kinematics,
}
