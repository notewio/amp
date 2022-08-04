import * as THREE from "three";
import { JointApp } from "./joint-level.js";

let prev_position = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 0),
];
class DoubleApp extends JointApp {
  constructor(settings) {
    super(settings);
    this.endpoint_amplification = new THREE.Vector3().fromArray(settings.amplification, 2).subScalar(1);
  }

  render() {
    prev_position.forEach((e, i) => e.copy(this.controllers[i].object.position));
    super.render();
    prev_position.forEach((e, i) => e.subVectors(this.controllers[i].object.position, e));
    prev_position.forEach(e => e.multiply(this.endpoint_amplification));
    this.controllers.forEach((e, i) => e.object.position.add(prev_position[i]));
  }
}

export { DoubleApp }