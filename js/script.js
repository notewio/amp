import * as THREE from "three";
import { VRButton } from "vrbutton";
import { Joint, forward_kinematics, inverse_kinematics } from "./kinematics.js";
import { TaskPath } from "./task.js";
import { GUI } from "lil-gui";


let HEIGHT = 0;
let ARM_LENGTH = 0.5;
let DOM_HAND = 0;
let JOINT_LEVEL = true;
let AMPLIFICATION = [2, 2, 2];

let scene, renderer, camera;
let controllers;
let arm, amplified_arm;
let shoulder = new THREE.Vector3();
let path;
let logging_started = false;
let position_data = [];


initGUI();


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
    controller.addEventListener("selectstart", e => onSelectStart(e, index));
    controller.addEventListener("selectend", e => onSelectEnd(e, index));
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

  path.intersect(controllers[DOM_HAND].object.position);

  if (logging_started) {
    position_data.push([performance.now(), ...controllers[DOM_HAND].object.position.toArray()]);
  }

  renderer.render(scene, camera);
}

function update_joint_level(iterations = 1) {
  // TODO: this is a lot of cloning
  let endpoint = forward_kinematics(arm, shoulder.clone());
  for (let i = 0; i < iterations && endpoint.distanceTo(controllers[DOM_HAND].grip.position) > 0.001; i++) {
    let dth = inverse_kinematics(controllers[DOM_HAND].grip.position, endpoint, arm);
    dth.forEach((th, i) => {
      arm[i].angle += th;
      arm[i].angle = angle_modulo(arm[i].angle);

      amplified_arm[i].angle += AMPLIFICATION[i] * th;
      amplified_arm[i].angle = angle_modulo(amplified_arm[i].angle);
    });
    endpoint = forward_kinematics(arm, shoulder.clone());
  }

  let amplified = forward_kinematics(amplified_arm, shoulder.clone());
  controllers[DOM_HAND].object.rotation.copy(controllers[DOM_HAND].grip.rotation);
  controllers[DOM_HAND].object.position.copy(amplified);

  controllers[1 - DOM_HAND].object.rotation.copy(controllers[1 - DOM_HAND].grip.rotation);
  controllers[1 - DOM_HAND].object.position.copy(controllers[1 - DOM_HAND].grip.position);
}

function update_endpoint_level() {
  controllers.forEach(c => {
    c.object.rotation.copy(c.grip.rotation);

    c.object.position.copy(c.grip.position);
    c.object.position.sub(c.rest_position);
    c.object.position.x *= AMPLIFICATION[0];
    c.object.position.y *= AMPLIFICATION[1];
    c.object.position.z *= AMPLIFICATION[2];
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
    shoulder.z += 0.05;

    // Set arm segment lengths:
    //   Arm should be in saggital plane,
    //   upper arm is vertical, elbow should be bent 90 degrees
    let upper_arm, forearm;
    if (HEIGHT > 0) {
      upper_arm = 0.202 * HEIGHT;
      forearm = 0.151 * HEIGHT;
    } else {
      upper_arm = Math.abs(shoulder.y - controllers[1 - index].grip.position.y);
      forearm = Math.abs(shoulder.z - controllers[1 - index].grip.position.z);
    }
    arm[0].set_length(upper_arm);
    amplified_arm[0].set_length(upper_arm);
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
    path.position.x = controllers[DOM_HAND].grip.position.x;
    path.position.y = camera.position.y - ARM_LENGTH;
    path.position.z = -ARM_LENGTH;

  }
}
function onSelectStart(event, index) { logging_started = index === DOM_HAND }
function onSelectEnd(event, index) { logging_started = false }


/*
  Initialize controls display
*/
function initGUI() {
  const gui = new GUI();
  const init_options = {
    ratios: false,
    height: 1.8,
    hand: "left",
    amplification: "joint level",
    amount: "2 2 2",
    start: () => {
      init();
      if (JOINT_LEVEL) {
        initIK();
      }
      options.destroy();
    },
  };
  const options = gui.addFolder("Init options");
  options.add(init_options, "ratios")
    .name("Use anatomic ratios")
    .onChange(v => { HEIGHT = v ? init_options.height : 0 });
  options.add(init_options, "height")
    .name("Height (meters)")
    .onChange(v => { HEIGHT = v; ARM_LENGTH = 0.353 * HEIGHT; });
  options.add(init_options, "hand", ["left", "right"])
    .name("Hand")
    .onChange(v => DOM_HAND = v === "left" ? 0 : 1);
  options.add(init_options, "amplification", ["joint level", "endpoint level"])
    .name("Amplify on")
    .onChange(v => JOINT_LEVEL = v === "joint level");
  options.add(init_options, "amount")
    .name("Amp amount")
    .onChange(v => AMPLIFICATION = v.split(" ").map(x => parseFloat(x)));
  options.add(init_options, "start")
    .name("Initialize");

  const action_options = {
    positions: () => {
      let csvContent = "data:text/csv;charset=utf-8," + position_data.map(p => p.join(",")).join("\n");
      let encodedUri = encodeURI(csvContent);
      window.open(encodedUri);
    },
    distances: () => {
      let csvContent = "data:text/csv;charset=utf-8," + position_data.map(p => {
        let dist = path.curve.distance_to(math.subtract(p.slice(1, 4), path.position.toArray()));
        return [p[0], dist].join(",");
      }).join("\n");
      let encodedUri = encodeURI(csvContent);
      window.open(encodedUri);
    }
  };
  const actions = gui.addFolder("Live actions");
  actions.add(action_options, "positions").name("Download position data");
  actions.add(action_options, "distances").name("Download error (distance) data");
}


/*
  Utility
*/
const TWOPI = Math.PI * 2;
function angle_modulo(th) {
  return ((th % TWOPI) + TWOPI) % TWOPI;
}
