import * as THREE from "three";


class Path extends THREE.Mesh {
  constructor(start_pos, end_pos, curve) {

    const geometry = new THREE.TubeGeometry(curve, 30, 0.08, 16);
    const material = new THREE.MeshToonMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    super(geometry, material);

    this.curve = curve;
    this.start_pos = start_pos;
    this.end_pos = end_pos;

  }

  update(point) {
    let v = new THREE.Vector3();
    let start = point.distanceTo(v.copy(this.start_pos).applyEuler(this.rotation).add(this.position)) < 0.06;
    let end = point.distanceTo(v.copy(this.end_pos).applyEuler(this.rotation).add(this.position)) < 0.06;
    if (start && this.visible) {
      this.material.color.setHex(0x88ff88);
    }
    if (end) {
      this.material.color.setHex(0xaaaaaa);
    }
    return [start, end];
  }
}

class LinePath extends Path {
  constructor(scale = 0.4) {
    let start_pos = new THREE.Vector3(0, -scale / 2, 0);
    let end_pos = new THREE.Vector3(0, scale / 2, 0);
    let curve = new THREE.LineCurve3(start_pos, end_pos);
    super(start_pos, end_pos, curve);
  }

  // NOTE: currently implementing distanceTo as only a 2D thing, within the sagittal plane
  // do we need full 3D here?
  distanceTo(point) {
    let translated = new THREE.Vector3().subVectors(point, this.position).applyEuler(this.rotation);
    return Math.abs(translated.z);
  }
}

// NOTE: for some reason THREE.EllipseCurve does not work (position values become NaN???)
class SemicircleCurve extends THREE.Curve {
  constructor(scale = 1) {
    super();
    this.scale = scale;
  }

  getPoint(t, optionalTarget = new THREE.Vector3()) {
    const tx = 0;
    const ty = Math.sin(Math.PI * t + Math.PI / 2);
    const tz = Math.cos(Math.PI * t + Math.PI / 2);
    return optionalTarget.set(tx, ty, tz).multiplyScalar(this.scale);
  }
}
class SemicirclePath extends Path {
  constructor(scale = 0.4) {
    let start_pos = new THREE.Vector3(0, -scale / 2, 0);
    let end_pos = new THREE.Vector3(0, scale / 2, 0);
    let curve = new SemicircleCurve(scale / 2);
    super(start_pos, end_pos, curve);
  }
  distanceTo(point) {
    let translated = new THREE.Vector3().subVectors(point, this.position).applyEuler(this.rotation);
    return Math.abs(Math.sqrt(translated.y ** 2 + translated.z ** 2) - this.curve.scale / 2);
  }
}


export { LinePath, SemicirclePath }
