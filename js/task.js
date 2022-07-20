import * as THREE from "three";


class LinePath extends THREE.Mesh {
  constructor(scale = 0.4) {

    let start_pos = new THREE.Vector3(0, -scale / 2, 0);
    let end_pos = new THREE.Vector3(0, scale / 2, 0);
    let curve = new THREE.LineCurve3(start_pos, end_pos);
    const geometry = new THREE.TubeGeometry(curve, 30, 0.05, 16, true);
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
    let start = point.distanceTo(v.copy(this.start_pos).applyEuler(this.rotation).add(this.position)) < 0.04;
    let end = point.distanceTo(v.copy(this.end_pos).applyEuler(this.rotation).add(this.position)) < 0.04;
    if (start && this.visible) {
      this.material.color.setHex(0x88ff88);
    }
    if (end) {
      this.material.color.setHex(0xaaaaaa);
    }
    return [start, end];
  }

  // NOTE: currently implementing distanceTo as only a 2D thing, within the sagittal plane
  // do we need full 3D here?
  distanceTo(point) {
    let translated = new THREE.Vector3().subVectors(point, this.position).applyEuler(this.rotation);
    return Math.abs(translated.z);
  }
}


export { LinePath }
