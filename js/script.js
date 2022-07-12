import * as THREE from "three";
import { VRButton } from "vrbutton";
import { Joint, forward_kinematics, inverse_kinematics } from "./kinematics.js";


const JOINT_LEVEL = true // true for joint amplification, false for endpoint
let scene, renderer, camera;
let controllers;
let arm;


init();
if (JOINT_LEVEL) {
  initIK();
}


/*
  Initialize graphics
*/
function init() {
  
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
  
  const sun = new THREE.DirectionalLight(0xffffff, 0.5);
    sun.position.set(1, 1, 1).normalize();
    scene.add(sun);

  scene.add(new THREE.HemisphereLight(0x606060, 0x404040));

  scene.add(new THREE.GridHelper(2, 10));

  document.body.appendChild(VRButton.createButton(renderer));
  
  controllers = [0, 1].map(index => {
    let controller = renderer.xr.getController(index);
    scene.add(controller);

    let grip = renderer.xr.getControllerGrip(index);
    scene.add(grip);

    let object = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
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
    new Joint( new THREE.Vector3(1, 0, 0), 0 ), // Shoulder: 3DOF
    new Joint( new THREE.Vector3(0, 1, 0), 0 ),
    new Joint( new THREE.Vector3(0, 0, 1), 1 ),

    new Joint( new THREE.Vector3(0, 0, 1), 1 ), // Elbow: 1DOF
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

function update_joint_level() {
  let endpoint = forward_kinematics(arm, new THREE.Vector3());
  let dth = inverse_kinematics(controllers[0].grip.position, endpoint, arm);
  dth.forEach((th, i) => {
    arm[i].angle += th
  });

  controllers.forEach(c => {
    c.object.rotation.copy(c.grip.rotation);
    c.object.position.copy(c.grip.position);
  });
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
