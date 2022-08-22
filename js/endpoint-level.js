import * as THREE from "three";
import { App } from "./core.js";
import { JointApp } from "./joint-level.js";
import { forward_kinematics, inverse_kinematics } from "./kinematics.js";

class EndpointApp extends JointApp {

  constructor(settings) {

    super(settings);

    this.amplification = new THREE.Vector3().fromArray(settings.amplification);
    this.rest_position = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ];

  }

  initIK() {
    super.initIK();
    this.arm.forEach(joint => joint.create_geometry(this.scene));
    this.amplified_arm.forEach(joint => {
      joint.sphere.visible = false;
      joint.cylinder.visible = false;
    });
  }

  onSelectStart() {
    this.arm.forEach(joint => {
      joint.sphere.visible = false;
      joint.cylinder.visible = false;
    });
    super.onSelectStart();
  }

  render() {
    this.kinematics();

    this.controllers.forEach((c, i) => {
      c.object.rotation.copy(c.grip.rotation);

      c.object.position.subVectors(c.grip.position, this.rest_position[i]);
      c.object.position.multiplyVectors(c.object.position, this.amplification);
      c.object.position.add(this.rest_position[i]);
    });

    App.prototype.render.call(this);
  }

  kinematics(iterations = 1) {

    let target = this.controllers[this.hand].grip.position;
    let endpoint = forward_kinematics(this.arm, this.shoulder);

    for (let i = 0; i < iterations && endpoint.manhattanDistanceTo(target) > 0.001; i++) {
      let dth = inverse_kinematics(target, endpoint, this.arm);
      dth.forEach((th, i) => {
        this.arm[i].set_angle(this.arm[i].angle + th);
      });
      forward_kinematics(this.arm, this.shoulder, endpoint);
    }

  }

  reset() {
    super.reset();
    this.set_rest_position();
  }

  set_rest_position() {
    this.controllers.forEach((c, i) => this.rest_position[i].copy(c.grip.position));
    this.dom_hand().object.position.x = this.shoulder.x;
  }

}

export { EndpointApp }