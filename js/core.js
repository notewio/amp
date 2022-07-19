import * as THREE from "three";
import { VRButton } from "vrbutton";
import { Path } from "./task.js";


class App {

  constructor(settings) {

    this.hand = settings.hand;
    this.approx_arm_length = settings.height * 0.461;

    this.initThree();
    this.initVR();
    this.initTask(settings.task_type);

  }

  initThree() {

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x888888);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.xr.enabled = true;
    this.renderer.setAnimationLoop(this.render.bind(this));
    document.body.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      50, window.innerWidth / window.innerHeight, 0.1, 10
    );
    this.scene.add(this.camera);

    // Lighting
    const sun = new THREE.DirectionalLight(0xffffff, 0.5);
    sun.position.set(1, 1, 1).normalize();
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight(0x606060, 0x404040));

    // Environment
    this.scene.add(new THREE.GridHelper(2, 10));

    let cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial()
    );
    cube.position.z = -2;
    this.scene.add(cube);

  }

  initVR() {

    document.body.appendChild(VRButton.createButton(this.renderer));

    this.controllers = [0, 1].map(index => {
      let controller = this.renderer.xr.getController(index);
      // TODO: controller.addEventListener("squeezestart", e => onSqueezeStart(e, index));
      this.scene.add(controller);

      let grip = this.renderer.xr.getControllerGrip(index);
      this.scene.add(grip);

      let object = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.07, 0.07),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
      );
      this.scene.add(object);

      return {
        controller: controller,
        grip: grip,
        object: object,
      }
    });

  }

  initTask(type) {
    this.path = new Path(type);
    this.scene.add(this.path);
  }

  render() {
    this.path.intersect(this.controllers[this.hand].object.position);

    this.renderer.render(this.scene, this.camera);
  }

  reset() { }

}

export { App }
