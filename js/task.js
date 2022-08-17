import * as THREE from "three";


let util_quat = new THREE.Quaternion();


class Path extends THREE.Mesh {
  constructor(start_pos, end_pos, curve, dir) {

    const geometry = new THREE.TubeGeometry(curve, 30, 0.02, 16);
    const material = new THREE.MeshToonMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    super(geometry, material);

    this.add(new THREE.ArrowHelper(
      dir ?? curve.getTangent(0),
      start_pos.clone(),
      0.1,
      0x0000ff,
      0.2 * 0.1, 0.08 * 0.1
    ));

    this.curve = curve;
    this.start_pos = start_pos;
    this.end_pos = end_pos;

    // maximum distance hand has moved away from the start point.
    // this way, end pos checking only starts after you've moved some distance
    this.max_start_dist = -1;

  }

  toLocalSpace(point, optionalTarget = new THREE.Vector3()) {
    return optionalTarget
      .subVectors(point, this.position)
      .applyQuaternion(util_quat.setFromEuler(this.rotation).invert());
  }

  distanceTo(point) {
    // TODO: make this not take 100000 years to run (actually it's not half bad but would be nice)
    let translated = this.toLocalSpace(point);
    translated.x = 0;
    let points = this.curve.getSpacedPoints(200);
    let distances = points.map(p => translated.distanceTo(p));
    return Math.min(...distances);
  }

  update(point, start_callback, end_callback) {
    let translated = this.toLocalSpace(point);
    let dist_to_start = translated.distanceTo(this.start_pos);
    if (this.max_start_dist >= 0) {
      this.max_start_dist = Math.max(this.max_start_dist, dist_to_start);
    }

    if (this.max_start_dist >= 0.3) { // TODO: not hardcoded
      let dist_to_end = this.toLocalSpace(point, translated).distanceTo(this.end_pos);
      if (dist_to_end < 0.04) {
        this.material.color.setHex(0xaaaaaa);
        end_callback();
      }
    } else if (this.visible) {
      if (dist_to_start < 0.04) {
        this.max_start_dist = dist_to_start;
        this.material.color.setHex(0x88ff88);
        start_callback();
      }
    }
  }
}


class LinePath extends Path {
  constructor(scale = 0.4) {
    let start_pos = new THREE.Vector3(0, -scale / 2, 0);
    let end_pos = new THREE.Vector3(0, scale / 2, 0);
    let curve = new THREE.LineCurve3(start_pos, end_pos);
    super(start_pos, end_pos, curve);
  }
  distanceTo(point) {
    return Math.abs(this.toLocalSpace(point).z);
  }
}


class SineCurve extends THREE.Curve {
  constructor(scale = 1) {
    super();
    this.scale = scale;
  }
  getPoint(t, optionalTarget = new THREE.Vector3()) {
    return optionalTarget.set(
      0,
      t - 0.5,
      Math.sin(2 * Math.PI * t) / 3,
    ).multiplyScalar(this.scale);
  }
}
class SinePath extends Path {
  constructor(scale = 0.4) {
    let start_pos = new THREE.Vector3(0, -scale / 2, 0);
    let end_pos = new THREE.Vector3(0, scale / 2, 0);
    let curve = new SineCurve(scale);
    super(start_pos, end_pos, curve);
  }
}


class TriangleCurve extends THREE.Curve {
  constructor(scale = 1) {
    super();
    this.scale = scale;
  }
  getPoint(t, optionalTarget = new THREE.Vector3()) {
    // \left(\left\{t<\frac{1}{3}:3t,\frac{3}{2}-\frac{3}{2}t\right\},\left\{t<\frac{1}{3}:0,-\frac{3\sqrt{3}}{2}\left|t-\frac{2}{3}\right|+\frac{\sqrt{3}}{2}\right\}\right)
    return optionalTarget.set(
      0,
      (t < 1 / 3 ? 0 : - 3 * Math.sqrt(3) / 2 * Math.abs(t - 2 / 3) + Math.sqrt(3) / 2) - 0.5,
      (t < 1 / 3 ? 3 * t : 1.5 - 1.5 * t) - 0.5,
    ).multiplyScalar(this.scale);
  }
}
class TrianglePath extends Path {
  constructor(scale = 0.4) {
    let start_pos = new THREE.Vector3(0, -scale / 2, scale / 2);
    let end_pos = new THREE.Vector3(0, -scale / 2, scale / 2);
    let curve = new TriangleCurve(scale);
    let dir = new THREE.Vector3(0, 0, -1);
    super(start_pos, end_pos, curve, dir);
  }
}



export { LinePath, SinePath, TrianglePath }
