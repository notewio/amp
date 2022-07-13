import * as THREE from "three";


class Curve extends THREE.Curve {
  constructor(scale = 1) {
    super();
    this.scale = scale;
  }
  getPoint(t, optionalTarget = new THREE.Vector3()) {
    return optionalTarget.set(
      0,
      t,
      0,
    ).multiplyScalar(this.scale);
  }
  /* pos is an array of x, y, z values, translated to be in the curve's space */
  distance_to(pos) {
    // TODO: actually do real math here for the more complex curves
    return Math.sqrt(pos[0] ** 2 + pos[2] ** 2);
  }
}

class TaskPath extends THREE.Mesh {
  constructor(scale = 1) {
    const curve = new Curve(scale);
    const geometry = new THREE.TubeGeometry(curve, 30, 0.05, 8, false);
    const material = new THREE.MeshToonMaterial({
      color: 0xaaaaff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    super(geometry, material);

    this.curve = curve;
    this.raycaster = new THREE.Raycaster();
  }
  intersect(position) {
    this.raycaster.set(position, new THREE.Vector3(1, 1, 1));
    const intersects = this.raycaster.intersectObject(this);
    if (intersects.length % 2 === 1) {
      this.material.color.setHex(0xaaffaa);
    } else {
      this.material.color.setHex(0xaaaaff);
    }
  }
}

export { TaskPath }