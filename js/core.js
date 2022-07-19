import * as THREE from "three";
import { VRButton } from "vrbutton";
import { Path } from "./task.js";


function round(x, n = 4) {
  return Math.round(x * 10 ** n) / 10 ** n;
}


class App {

  constructor(settings) {

    this.hand = settings.hand;
    this.approx_arm_length = settings.height * 0.461;
    this.settings = settings;

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
      controller.addEventListener("selectstart", e => {
        this.log_data.push([]); // TODO: how to actually tell when a trial starts/ends?
      });
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

    this.log_data = [];
    this.log();

  }


  render() {
    this.path.intersect(this.controllers[this.hand].object.position);
    this.renderer.render(this.scene, this.camera);
  }

  log() {
    let now = performance.now();
    this.log_data.at(-1)?.push([
      now,
      ...this.controllers[this.hand].object.position.toArray(),
    ]);
    // NOTE: does this even need to be perfectly synchronous? how much data do we need?
    setTimeout(this.log.bind(this), 16);
  }


  reset() { }


  export() {

    let content = `Exported at ${new Date().toISOString()}

Amplification level,${this.settings.level}
Amplification amount,${this.settings.amplification}
Path type,${this.settings.task_type}
Path position,${this.path.position.toArray().map(x => round(x)).join(",")}

`;

    content += this.log_data.map((_, i) => `Trial ${i} Time (ms),x,y,z,err`).join(",");
    let p = new THREE.Vector3();
    for (let i = 0; i < Math.max(...this.log_data.map(x => x.length)); i++) {
      content += "\n";
      this.log_data.forEach(trial => {
        if (i < trial.length) {
          content += trial[i].map(x => round(x)).join(",") + ",";
          content += round(this.path.distanceTo(p.fromArray(trial[i], 1))) + ",";
        } else {
          content += ",".repeat(trial[0].length + 1);
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

}

export { App }
