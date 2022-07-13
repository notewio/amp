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
}

class TaskPath extends THREE.Mesh {
  constructor(scale = 1) {
    const geometry = new THREE.TubeGeometry(new Curve(scale), 30, 0.05, 8, false);
    const material = new THREE.MeshToonMaterial({
      color: 0xaaaaff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    super(geometry, material);

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