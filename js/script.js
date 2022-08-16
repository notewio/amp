import { EndpointApp } from "./endpoint-level.js";
import { DefaultApp } from "./no-level.js";
import { JointApp } from "./joint-level.js";
import { DoubleApp } from "./double-level.js";
import { GUI } from "lil-gui";


const gui = new GUI();
let app;


const init_gui = gui.addFolder("Init options");
const init = {
  level: "joint",
  trials: 10,
  randomized: false,
  amplification: "2 2 2",
  hand: 0,
  height: 1.8,
  shoulder: 0.05,
  scale: 0.4,
  object: "controller",
  hide_arm: false,
  start: () => start(),
};

init_gui.add(init, "level", ["joint", "endpoint", "none", "double"])
  .name("Amp level");

init_gui.add(init, "trials")
  .name("Trials per shape");

init_gui.add(init, "randomized")
  .name("Randomize order");

init_gui.add(init, "amplification")
  .name("Amp amount");

init_gui.add(init, "hand", { Left: 0, Right: 1 })
  .name("Dominant hand");

init_gui.add(init, "height")
  .name("Height (m)");

init_gui.add(init, "shoulder")
  .name("Shoulder (+behind)");

init_gui.add(init, "scale")
  .name("Task scale (m)");

init_gui.add(init, "object", ["controller", "cube"])
  .name("Controller object");

init_gui.add(init, "hide_arm")
  .name("Hide arm during test");

init_gui.add(init, "start")
  .name("Initialize");


function start() {
  init_gui.destroy();
  init.amplification = init.amplification.split(" ").map(x => parseFloat(x));
  if (init.level === "joint") {
    app = new JointApp(init);
  } else if (init.level === "endpoint") {
    app = new EndpointApp(init);
  } else if (init.level === "double") {
    app = new DoubleApp(init);
  } else {
    app = new DefaultApp(init);
  }


  const live_gui = gui.addFolder("Actions");

  app.arm?.forEach((joint, i) => {
    live_gui.add(joint, "angle", 0, Math.PI * 2)
      .name(`Joint ${i}`)
      .listen()
      .disable();
  });

  app.arm?.forEach((joint, i) => {
    live_gui.add(joint, "length")
      .name(`Segment ${i}`)
      .listen()
      .disable();
  });

  live_gui.add(app.dom_hand().object.position, "x").listen().disable();
  live_gui.add(app.dom_hand().object.position, "y").listen().disable();
  live_gui.add(app.dom_hand().object.position, "z").listen().disable();

  let canvas = document.createElement("canvas");
  canvas.width = 250;
  canvas.height = 250;
  let ctx = canvas.getContext("2d");
  live_gui.domElement.appendChild(canvas);
  setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    app.current_path().curve.getPoints(8).forEach(p => {
      // TODO: for some gogddamn reason SemicircleCurve is flipped?????
      // why the hell does this happen IDK
      // not really essential anyways so ill just leave it broken
      p.applyEuler(app.current_path().rotation);
      ctx.lineTo(
        125 + p.z * 150,
        125 + p.y * 150,
      );
    });
    ctx.strokeStyle = "white";
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(
      (app.paths[0].position.z - app.dom_hand().object.position.z) * 150 + 125,
      (app.paths[0].position.y - app.dom_hand().object.position.y) * 150 + 125,
      4, 0, 2 * Math.PI, false
    );
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.closePath();
  }, 125);

  live_gui.add(app, "reset")
    .name("Reset position");

  live_gui.add(app, "export")
    .name("Export position log (CSV)");

  live_gui.add(app, "export_json")
    .name("Export position log (JSON)");

}