import { App } from "./core.js";

class DefaultApp extends App {
  render() {
    this.controllers.forEach(c => {
      c.object.rotation.copy(c.grip.rotation);
      c.object.position.copy(c.grip.position);
    });
    super.render();
  }
}

export { DefaultApp }