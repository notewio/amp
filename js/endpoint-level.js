import * as THREE from "three";
import { App } from "./core.js";

class EndpointApp extends App {

  constructor(settings) {

    super(settings);

    this.amplification = new THREE.Vector3().fromArray(settings.amplification);
    this.rest_position = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ];

  }

  render() {

    this.controllers.forEach((c, i) => {
      c.object.rotation.copy(c.grip.rotation);

      c.object.position.subVectors(c.grip.position, this.rest_position[i]);
      c.object.position.multiplyVectors(c.object.position, this.amplification);
      c.object.position.add(this.rest_position[i]);
    });

    super.render();

  }

  reset() {

    this.controllers.forEach((c, i) => this.rest_position[i].copy(c.grip.position));

    this.path.position.copy(this.controllers[this.hand].grip.position);
    this.path.position.y += this.approx_arm_length / 2; // TODO: do a real shoulder estimation
    this.path.position.z -= this.approx_arm_length * 0.5;

  }

}

export { EndpointApp }