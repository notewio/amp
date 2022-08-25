import * as THREE from "three";
import { VRButton } from "vrbutton";
import { CirclePath, TrianglePath, SinePath, LinePath } from "./task.js";
import { XRControllerModelFactory } from "xrcontrollermodelfactory";


const COLOR_NAMES = {
  "aaaaaa": "gray",
  "88ff88": "green",
  "ff8888": "red",
};


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

    let canvas = document.querySelector("#texture");
    this.texture_canvas = canvas.getContext("2d");
    this.texture = new THREE.CanvasTexture(canvas);
    let plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true }),
    );
    plane.position.set(0, 1, -1.5);
    this.scene.add(plane);

  }

  initVR() {

    document.body.appendChild(VRButton.createButton(this.renderer));

    const controllerModelFactory = new XRControllerModelFactory();

    this.controllers = [0, 1].map(index => {
      let controller = this.renderer.xr.getController(index);
      this.scene.add(controller);

      let grip = this.renderer.xr.getControllerGrip(index);
      this.scene.add(grip);

      let object = new THREE.Object3D();
      if (this.settings.object === "controller") {
        object.add(controllerModelFactory.createControllerModel(grip));
      } else {
        object.add(
          new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.02, 0.02),
            new THREE.MeshStandardMaterial({ color: 0xff0000 })
          )
        );
      }
      this.scene.add(object);

      return {
        controller: controller,
        grip: grip,
        object: object,
      }
    });

  }

  initTask() {

    this.paths = [];
    this.settings.paths.split(" ").forEach(type => {
      switch (type) {
        case "line":
          for (let i = 0; i < this.trials; i++) { this.paths.push(new LinePath(this.settings.scale)) }
          break;
        case "angled-line":
          for (let i = 0; i < this.trials; i++) {
            let p = new LinePath(this.settings.scale);
            p.rotation.x = -Math.PI / 4;
            p.end.rotation.x = Math.PI / 4;
            this.paths.push(p);
          }
          break;
        case "sine":
          for (let i = 0; i < this.trials; i++) { this.paths.push(new SinePath(this.settings.scale)) }
          break;
        case "triangle":
          for (let i = 0; i < this.trials; i++) { this.paths.push(new TrianglePath(this.settings.scale)) }
          break;
        case "circle":
          for (let i = 0; i < this.trials; i++) { this.paths.push(new CirclePath(this.settings.scale)) }
          break;
      }
    });

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
      this.renderTexture();
    }
  }


  render() {

    this.current_path().update(
      this.dom_hand().object.position,
      () => this.logging = true,
      () => {
        if (this.logging) {
          this.logging = false;
          this.log_data.push([]);
          this.paths.forEach(p => p.visible = false);
          setTimeout(() => this.current_path().visible = true, 3000);
          this.renderTexture();
        }
      },
    )

    this.log();
    this.renderer.render(this.scene, this.camera);

  }

  renderTexture() {
    this.texture_canvas.clearRect(0, 0, 400, 400); // TODO: not hardcode
    this.texture_canvas.font = "50px Helvetica";
    this.texture_canvas.textAlign = "center";
    this.texture_canvas.fillStyle = "white";
    this.texture_canvas.fillText(`Trial ${this.log_data.length}`, 200, 200);
    this.texture.needsUpdate = true;
  }

  log() {
    let now = performance.now();
    this.log_data.at(-1)?.push([
      now,
      ...this.dom_hand().object.position.toArray(),
      ...this.dom_hand().grip.position.toArray(),
      this.current_path().visible ?
        COLOR_NAMES[this.current_path().material.color.getHexString()]
        : "invisible",
      ...(this.arm ? this.arm.map(j => j.angle) : []),
    ]);
  }


  reset() {
    this.paths.forEach(path => {
      path.position.copy(this.dom_hand().grip.position);
      path.position.y += this.approx_arm_length * 0.43;
      path.position.z -= 0.05;
    });
  }
  set_rest_position() {
    this.controllers.forEach(c => {
      c.object.position.copy(c.grip.position);
    });
  }

  export() {

    this.log_data.forEach((trial, i) => {
      let path = this.paths[i] ?? this.paths.at(-1);
      let v = new THREE.Vector3();
      trial.forEach(t => {
        v.fromArray(t, 1);
        while (t.length > (this.arm ? 10 : 8)) { t.pop() }
        t.push(path.distanceTo(v));
      });
    });

    let content = `Exported at ${new Date().toISOString()}

Amplification level,${this.settings.level}
Amplification amount,${this.settings.amplification}
Path position,${this.paths[0].position.toArray().join(",")}

`;

    // TODO: incredible formatting
    content += this.log_data.map((_, i) => `Trial ${i
      } ${this.paths[i]?.constructor.name
      } ${this.paths[i]?.rotation.x
      } Time (ms),Amplified hand x,Amplified hand y,Amplified hand z,Real hand x,Real hand y,Real hand z,Path color,${this.arm ? "Shoulder angle,Elbow angle," : ""
      }err`).join(",");
    for (let i = 0; i < Math.max(...this.log_data.map(x => x.length)); i++) {
      content += "\n";
      this.log_data.forEach(trial => {
        // NOTE: in theory the only time a trial has no data is the very last one, so we don't have to worry about adding commas there.
        if (trial.length > 0) {
          if (i < trial.length) {
            content += trial[i].join(",") + ",";
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

  export_json() {
    let content = {
      timestamp: new Date().toISOString(),
      level: this.settings.level,
      amount: this.settings.amplification,
      path: this.paths[0].position.toArray(),
      trials: [],
    }
    this.log_data.forEach((trial, i) => {
      let path = this.paths[i] ?? this.paths.at(-1);
      let v = new THREE.Vector3();
      trial.forEach(t => {
        v.fromArray(t, 1);
        t.push(path.distanceTo(v));
      });

      content.trials.push({
        path_type: path.constructor.name,
        path_rot: path.rotation.x,
        data: trial,
      });
    });

    let blob = new Blob([JSON.stringify(content)], { type: "text/json;charset=utf-8;" });
    let url = URL.createObjectURL(blob);
    let link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', "export.json");
    link.click();
  }

  export_paths() {
    for (let i = 0; i < this.settings.paths.split(" ").length; i++) {
      let path = this.paths[i * this.trials];
      let points = path.curve.getSpacedPoints(1000);

      let blob = new Blob([points.map(p => p.toArray().join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
      let url = URL.createObjectURL(blob);
      let link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${path.constructor.name}.csv`);
      link.click();
    }
  }


  current_path() {
    return this.paths.at(this.log_data.length - 1) ?? this.paths.at(-1);
  }
  dom_hand() {
    return this.controllers[this.hand];
  }

}

export { App }
