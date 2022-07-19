import * as THREE from "three";


class Path extends THREE.Mesh {
  constructor(type = "line", scale = 0.8) {

    let curve;
    switch (type) {
      case "circle":
        curve = new Circle(scale);
        break;
      case "line":
      default:
        curve = new Line(scale);
        break;
    }

    const geometry = new THREE.TubeGeometry(curve, 30, 0.05, 16, true);
    const material = new THREE.MeshToonMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    super(geometry, material);

    this.curve = curve;
    this.raycaster = new THREE.Raycaster();

  }

  intersect(point) {
    this.raycaster.set(point, new THREE.Vector3(1, 0, 0));
    const intersects = this.raycaster.intersectObject(this);
    if (intersects.length / 2 % 2 === 1) {
      this.material.color.setHex(0x88ff88);
    } else {
      this.material.color.setHex(0xaaaaaa);
    }
  }

  // NOTE: currently implementing distanceTo as only a 2D thing, within the sagittal plane
  // do we need full 3D here?
  distanceTo(point) {
    let translated = new THREE.Vector3().subVectors(point, this.position).applyEuler(this.rotation);
    return this.curve.distanceTo(translated);
  }
}

class Line extends THREE.Curve {
  constructor(scale) {
    super();
    this.scale = scale;
  }
  getPoint(t, optionalTarget = new THREE.Vector3()) {
    return optionalTarget.set(0, (t - 0.5) * this.scale, 0);
  }
  distanceTo(point) {
    return Math.abs(point.z);
  }
}

class Circle extends THREE.Curve {
  constructor(scale) {
    super();
    this.scale = scale;
  }
  getPoint(t, optionalTarget = new THREE.Vector3()) {
    return optionalTarget.set(
      0,
      Math.sin(t * 2 * Math.PI),
      Math.cos(t * 2 * Math.PI),
    ).multiplyScalar(this.scale / 2);
  }
  distanceTo(point) {
    return Math.abs(Math.sqrt(point.y ** 2 + point.z ** 2) - this.scale / 2);
  }
}


export { Path }
