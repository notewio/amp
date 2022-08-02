import * as THREE from "three";


class Path extends THREE.Mesh {
  constructor(start_pos, end_pos, curve) {

    const geometry = new THREE.TubeGeometry(curve, 30, 0.02, 16);
    const material = new THREE.MeshToonMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    super(geometry, material);

    const line_geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(32));
    const line_material = new THREE.LineBasicMaterial({ color: 0x0000ff });
    this.line = new THREE.Line(line_geometry, line_material);
    this.add(this.line);

    const dir = new THREE.Vector3().subVectors(end_pos, start_pos).normalize();
    const length = 0.1;
    const origin = new THREE.Vector3().copy(dir).negate().multiplyScalar(0.5 * length);
    this.arrow = new THREE.ArrowHelper(dir, origin, length, 0x0000ff, 0.2 * length, 0.08 * length);
    this.add(this.arrow);

    this.curve = curve;
    this.start_pos = start_pos;
    this.end_pos = end_pos;

  }

  update(point) {
    let v = new THREE.Vector3();
    let start = point.distanceTo(v.copy(this.start_pos).applyEuler(this.rotation).add(this.position)) < 0.02 && this.visible;
    let end = point.distanceTo(v.copy(this.end_pos).applyEuler(this.rotation).add(this.position)) < 0.02;
    if (start) {
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

// NOTE: for some reason THREE.EllipseCurve does not work (position values become NaN???) (I think it's because it's only a 2D curve)
class SemicircleCurve extends THREE.Curve {
  constructor(scale = 1) {
    super();
    this.scale = scale;
  }

  getPoint(t, optionalTarget = new THREE.Vector3()) {
    return optionalTarget.set(
      0,
      Math.sin(Math.PI * t + Math.PI / 2),
      Math.cos(Math.PI * t + Math.PI / 2),
    ).multiplyScalar(this.scale);
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


class ComplexCurve extends THREE.Curve {
  constructor(scale = 1) {
    super();
    this.scale = scale;
  }

  getPoint(t, optionalTarget = new THREE.Vector3()) {
    // TODO: make this the actual complex curve
    return optionalTarget.set(
      0,
      t - 0.5,
      0.7 * Math.sin(2 * Math.PI * t) + 0.3 * Math.cos(4 * Math.PI * t + 0.5),
    ).multiplyScalar(this.scale);
  }
}
class ComplexPath extends Path {
  constructor(scale = 0.4) {
    let start_pos = new THREE.Vector3(0, -scale / 2, 0.263 * scale);
    let end_pos = new THREE.Vector3(0, scale / 2, 0.263 * scale);
    let curve = new ComplexCurve(scale);
    super(start_pos, end_pos, curve);
  }
  distanceTo(point) {
    // TODO: make this not take 100000 years to run (actually it's not half bad but would be nice)
    let translated = new THREE.Vector3().subVectors(point, this.position).applyEuler(this.rotation);
    translated.x = 0;
    let points = this.curve.getSpacedPoints(200);
    let distances = points.map(p => translated.distanceTo(p));
    return Math.min(...distances);
  }
}


export { LinePath, SemicirclePath, ComplexPath }
