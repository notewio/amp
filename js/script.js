import { EndpointApp } from "./endpoint-level.js";
import { JointApp } from "./joint-level.js";
import { GUI } from "lil-gui";


const gui = new GUI();
let app;


const init_gui = gui.addFolder("Init options");
const init = {
  level: "joint",
  amplification: "2 2 2",
  hand: 0,
  task_type: "line",
  height: 1.8,
  start: () => start(),
};

init_gui.add(init, "level", ["joint", "endpoint"])
  .name("Amp level");

init_gui.add(init, "amplification")
  .name("Amp amount");

init_gui.add(init, "hand", { Left: 0, Right: 1 })
  .name("Dominant hand");

init_gui.add(init, "task_type", ["line", "circle"])
  .name("Task shape");

init_gui.add(init, "height")
  .name("Height (m)");

init_gui.add(init, "start")
  .name("Initialize");


function start() {
  init_gui.destroy();
  init.amplification = init.amplification.split(" ").map(x => parseFloat(x));
  if (init.level === "joint") {
    app = new JointApp(init);
  } else {
    app = new EndpointApp(init);
  }


  const live_gui = gui.addFolder("Actions");

  app.arm?.forEach((joint, i) => {
    live_gui.add(joint, "angle", 0, Math.PI * 2)
      .name(`Joint ${i}`)
      .listen()
      .disable();
  });

  live_gui.add(app, "reset")
    .name("Reset position");

  live_gui.add(app, "export")
    .name("Export position log");

}