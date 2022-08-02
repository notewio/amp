import * as THREE from "three";
import { App } from "./core.js";
import { Joint, forward_kinematics, inverse_kinematics } from "./kinematics.js";

class JointApp extends App {

  constructor(settings) {

    super(settings);

    this.initIK();
    this.amplification = settings.amplification;

  }

  initIK() {

    this.arm = [
      new Joint(new THREE.Vector3(1, 0, 0), 1, 0, Math.PI, 3 * Math.PI / 2), // Shoulder
      new Joint(new THREE.Vector3(1, 0, 0), 1, 0, Math.PI / 2, Math.PI), // Elbow
    ];
    this.amplified_arm = this.arm.map(x => x.clone());

    this.arm.forEach(joint => joint.create_geometry(this.scene));

    this.shoulder = new THREE.Vector3(0, 1.5, 0);

  }

  onSelectStart(event) {
    if (this.log_data.length === 0) {
      this.arm.forEach(joint => {
        joint.sphere.visible = false;
        joint.cylinder.visible = false;
      });
    }
    super.onSelectStart(event);
  }

  render() {
    this.kinematics();
    super.render();
  }

  kinematics(iterations = 1) {

    let target = this.controllers[this.hand].grip.position;
    let endpoint = forward_kinematics(this.arm, this.shoulder);

    for (let i = 0; i < iterations && endpoint.manhattanDistanceTo(target) > 0.001; i++) {
      let dth = inverse_kinematics(target, endpoint, this.arm);
      dth.forEach((th, i) => {
        this.arm[i].set_angle(this.arm[i].angle + th);
        this.amplified_arm[i].set_angle(this.amplified_arm[i].angle + this.amplification[i] * th);
      });
      forward_kinematics(this.arm, this.shoulder, endpoint);
    }

    let hand = this.controllers[this.hand];
    let offhand = this.controllers[1 - this.hand];

    forward_kinematics(this.amplified_arm, this.shoulder, endpoint);
    hand.object.rotation.copy(hand.grip.rotation);
    hand.object.position.copy(endpoint);

    offhand.object.rotation.copy(offhand.grip.rotation);
    offhand.object.position.copy(offhand.grip.position);

  }

  reset() {

    let hand = this.controllers[this.hand];
    let offhand = this.controllers[1 - this.hand];

    // Set shoulder position:
    //   Place controller in front of shoulder,
    //   offset behind squeezed controller position
    this.shoulder.copy(offhand.grip.position);
    this.shoulder.z += 0.05; // TODO: not hardcoded?

    // Set arm segment lengths:
    //   Arm should be in saggital plane,
    //   upper arm is vertical, elbow should be bent 90 degrees
    let upper_arm = Math.abs(this.shoulder.y - hand.grip.position.y);
    let forearm = Math.abs(this.shoulder.z - hand.grip.position.z);
    this.arm.at(-2).set_length(upper_arm);
    this.amplified_arm.at(-2).set_length(upper_arm);
    this.arm.at(-1).set_length(forearm);
    this.amplified_arm.at(-1).set_length(forearm);

    // Reset the amplified angles to be equal to real angles
    this.arm.forEach(joint => joint.angle = joint.rest_angle);
    this.kinematics();
    this.amplified_arm.forEach((joint, i) => joint.angle = this.arm[i].angle);

    // Set path position
    this.paths.forEach(path => {
      path.position.copy(this.shoulder);
      path.position.z -= this.approx_arm_length * 0.43;
    });

  }

}

export { JointApp }