import * as THREE from "three";
import { VRButton } from "vrbutton";
import { ComplexPath, LinePath, SemicirclePath } from "./task.js";
import { XRControllerModelFactory } from "xrcontrollermodelfactory";


function round(x, n = 4) {
  return Math.round(x * 10 ** n) / 10 ** n;
}


class App {

  constructor(settings) {

    this.hand = settings.hand;
    this.trials = settings.trials;
    this.approx_arm_length = settings.height * 0.461;
    this.settings = settings;

    this.initThree();
    this.initVR();
    this.initTask();

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

    const controllerModelFactory = new XRControllerModelFactory();

    this.controllers = [0, 1].map(index => {
      let controller = this.renderer.xr.getController(index);
      controller.addEventListener("squeezestart", this.reset.bind(this));
      this.scene.add(controller);

      let grip = this.renderer.xr.getControllerGrip(index);
      this.scene.add(grip);

      let object = new THREE.Object3D();
      object.add(controllerModelFactory.createControllerModel(grip));
      this.scene.add(object);

      return {
        controller: controller,
        grip: grip,
        object: object,
      }
    });
    this.dom_hand().controller.addEventListener("selectstart", this.onSelectStart.bind(this));

  }

  initTask() {

    this.paths = [
      new LinePath(this.settings.scale), // Vertical line
      new LinePath(this.settings.scale), // Horizontal line
      new LinePath(this.settings.scale), // Angled line
      new SemicirclePath(this.settings.scale), // Semicircle
      new ComplexPath(this.settings.scale), // Complex path
    ];
    this.paths[1].rotation.x = -Math.PI / 2;
    this.paths[2].rotation.x = -Math.PI / 4;
    this.paths.forEach(p => {
      this.scene.add(p);
      p.visible = false;
    });

    this.log_data = [];
    this.logging = false;
    this.log();

  }

  // Starts the experiment.
  onSelectStart(event) {
    if (this.log_data.length === 0) {
      this.log_data.push([]);
      this.paths.forEach(p => p.visible = false);
      this.current_path().visible = true;
    }
  }


  render() {

    let [started, ended] = this.current_path().update(this.dom_hand().object.position);
    if (started) { this.logging = true; }
    if (ended && this.logging) {
      this.logging = false;
      this.log_data.push([]);
      this.paths.forEach(p => p.visible = false);
      setTimeout(() => this.current_path().visible = true, 3000);
    }

    this.renderer.render(this.scene, this.camera);

  }

  log() {
    if (this.logging) {
      let now = performance.now();
      this.log_data.at(-1)?.push([
        now,
        ...this.dom_hand().object.position.toArray(),
      ]);
    }
    // NOTE: does this even need to be perfectly synchronous? how much data do we need?
    setTimeout(this.log.bind(this), 10);
  }


  reset() {
    this.paths.forEach(path => {
      path.position.copy(this.dom_hand().grip.position);
      path.position.y += this.approx_arm_length * 0.43;
    });
  }

  export() {

    this.log_data.forEach((trial, i) => {
      let path = this.paths[Math.floor(i / this.trials)];
      let v = new THREE.Vector3();
      trial.forEach(t => {
        v.fromArray(t, 1);
        t.push(path.distanceTo(v));
      });
    });

    let content = `Exported at ${new Date().toISOString()}

Amplification level,${this.settings.level}
Amplification amount,${this.settings.amplification}
Path position,${this.paths[0].position.toArray().map(x => round(x)).join(",")}

`;

    content += this.log_data.map((_, i) => `Trial ${i} Time (ms),x,y,z,err`).join(",");
    for (let i = 0; i < Math.max(...this.log_data.map(x => x.length)); i++) {
      content += "\n";
      this.log_data.forEach(trial => {
        // NOTE: in theory the only time a trial has no data is the very last one, so we don't have to worry about adding commas there.
        if (trial.length > 0) {
          if (i < trial.length) {
            content += trial[i].map(x => round(x)).join(",") + ",";
          } else {
            content += ",".repeat(trial[0].length);
          }
        }
      });
    }

    let blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    let url = URL.createObjectURL(blob);
    let link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', "export.csv");
    link.click();

  }


  current_path() {
    return this.paths.at(Math.floor((this.log_data.length - 1) / this.trials)) ?? this.paths.at(-1);
  }
  dom_hand() {
    return this.controllers[this.hand];
  }

}

export { App }
