import * as THREE from "three";
import { VRButton } from "vrbutton";
import { Joint, forward_kinematics, inverse_kinematics } from "./kinematics.js";
import { TaskPath } from "./task.js";


let scene, renderer, camera;
let controllers;
let arm, amplified_arm;
let shoulder = new THREE.Vector3();
let path;


// true for joint amplification, false for endpoint
const JOINT_LEVEL = window.confirm("Do you want joint-level amplification?");
init();
if (JOINT_LEVEL) {
  initIK();
}


/*
  Initialize graphics
*/
function init() {

  // Scene, renderer, camera
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x888888);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;
  renderer.setAnimationLoop(animate);
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10);
  scene.add(camera);

  // Lighting
  const sun = new THREE.DirectionalLight(0xffffff, 0.5);
  sun.position.set(1, 1, 1).normalize();
  scene.add(sun);

  scene.add(new THREE.HemisphereLight(0x606060, 0x404040));

  // Environment
  scene.add(new THREE.GridHelper(2, 10));

  let cube = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial());
  cube.position.z = -2;
  scene.add(cube);

  path = new TaskPath();
  path.position.set(0, 1.5, -1);
  scene.add(path);

  // VR, controllers
  document.body.appendChild(VRButton.createButton(renderer));

  controllers = [0, 1].map(index => {
    let controller = renderer.xr.getController(index);
    controller.addEventListener("squeezestart", e => onSqueezeStart(e, index));
    scene.add(controller);

    let grip = renderer.xr.getControllerGrip(index);
    scene.add(grip);

    let object = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.07, 0.07),
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    scene.add(object);

    return {
      controller: controller,
      grip: grip,
      object: object,
      rest_position: grip.position.clone(),
    }
  });

}

/*
  Initialize joints and inverse kinematics solver
*/
function initIK() {

  arm = [
    new Joint(new THREE.Vector3(1, 0, 0), 1, 0, 3 * Math.PI / 2), // Shoulder
    new Joint(new THREE.Vector3(1, 0, 0), 1, 0, Math.PI / 2), // Elbow
  ];

  // TODO: this is so unclean. is there a better way to clone an array with objects in it 
  amplified_arm = [
    new Joint(new THREE.Vector3(1, 0, 0), 1, 0, 3 * Math.PI / 2), // Shoulder
    new Joint(new THREE.Vector3(1, 0, 0), 1, 0, Math.PI / 2), // Elbow
  ];

  arm.forEach(joint => joint.create_geometry(scene));

}

/*
  Animation loop
*/
function animate() {
  if (JOINT_LEVEL) {
    update_joint_level();
  } else {
    update_endpoint_level();
  }

  renderer.render(scene, camera);
}

function update_joint_level(iterations = 1) {
  // TODO: this is a lot of cloning
  let endpoint = forward_kinematics(arm, shoulder.clone());
  for (let i = 0; i < iterations && endpoint.distanceTo(controllers[0].grip.position) > 0.001; i++) {
    let dth = inverse_kinematics(controllers[0].grip.position, endpoint, arm);
    dth.forEach((th, i) => {
      arm[i].angle += th;
      arm[i].angle = angle_modulo(arm[i].angle);

      amplified_arm[i].angle += 2 * th;
      amplified_arm[i].angle = angle_modulo(amplified_arm[i].angle);
    });
    endpoint = forward_kinematics(arm, shoulder.clone());
  }

  let amplified = forward_kinematics(amplified_arm, shoulder.clone());
  controllers[0].object.rotation.copy(controllers[1].grip.rotation);
  controllers[0].object.position.copy(amplified);

  controllers[1].object.rotation.copy(controllers[1].grip.rotation);
  controllers[1].object.position.copy(controllers[1].grip.position);
}

function update_endpoint_level() {
  controllers.forEach(c => {
    c.object.rotation.copy(c.grip.rotation);

    c.object.position.copy(c.grip.position);
    c.object.position.sub(c.rest_position);
    c.object.position.multiplyScalar(2);
    c.object.position.add(c.rest_position);
  });
}


function onSqueezeStart(event, index) {
  if (JOINT_LEVEL) {
    // TODO: based on camera orientation instead of hardcoded?

    // Set shoulder position:
    //   Place controller in front of shoulder,
    //   offset behind squeezed controller position
    shoulder.copy(controllers[index].grip.position);
    shoulder.z += 0.05

    // Set arm segment lengths:
    //   Arm should be in saggital plane,
    //   upper arm is vertical, elbow should be bent 90 degrees
    let upper_arm = Math.abs(shoulder.y - controllers[1 - index].grip.position.y);
    arm[0].set_length(upper_arm);
    amplified_arm[0].set_length(upper_arm);

    let forearm = Math.abs(shoulder.z - controllers[1 - index].grip.position.z);
    arm[1].set_length(forearm);
    amplified_arm[1].set_length(forearm);

    // Reset the amplified angles to be equal to real angles
    update_joint_level(10);
    amplified_arm.forEach((joint, i) => {
      joint.angle = arm[i].angle;
    });

    // Update path position
    path.position.x = shoulder.x;
    path.position.y = shoulder.y;
    path.position.z = shoulder.z - (upper_arm + forearm) / 2;

  } else {

    // Reset rest position
    controllers.forEach(c => c.rest_position.copy(c.grip.position));

    // Update path position
    path.position.x = controllers[0].grip.position.x;
    // TODO: how to get Y and Z position from this?
    //       maybe eye level instead?

  }
}


/*
  Utility
*/
const TWOPI = Math.PI * 2;
function angle_modulo(th) {
  return ((th % TWOPI) + TWOPI) % TWOPI;
}
