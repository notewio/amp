import { EndpointApp } from "./endpoint-level.js";
import { JointApp } from "./joint-level.js";
import { GUI } from "lil-gui";


const gui = new GUI();
let app;


const init_gui = gui.addFolder("Init options");
const init = {
  level: "joint",
  amplification: "1 1.5",
  paths: "angled-line sine",
  trials: 50,
  hand: 1,
  object: "cube",
  hide_arm: false,
  shoulder: 0.07,
  scale: 0.4,
  start: () => start(),
};

init_gui.add(init, "level", ["joint", "endpoint"])
  .name("Amplification type")
  .onChange(v => {
    if (v === "endpoint" && init.amplification.match(/ /g)?.length < 2) {
      init.amplification += " 1";
    }
  });

init_gui.add(init, "amplification")
  .name("Amp amount")
  .listen();

init_gui.add(init, "paths")
  .name("Shapes to test");

init_gui.add(init, "trials")
  .name("Trials per shape");

init_gui.add(init, "hand", { Left: 0, Right: 1 })
  .name("Dominant hand");

init_gui.add(init, "object", ["controller", "cube"])
  .name("Controller object");

init_gui.add(init, "hide_arm")
  .name("Hide arm during test");

init_gui.add(init, "shoulder")
  .name("Shoulder offset");

init_gui.add(init, "scale")
  .name("Size of path (m)");

init_gui.add(init, "start")
  .name("Initialize");


function start() {
  init_gui.destroy();
  init.amplification = init.amplification.split(" ").map(x => parseFloat(x));
  if (init.level === "joint") {
    app = new JointApp(init);
  } else if (init.level === "endpoint") {
    app = new EndpointApp(init);
  }


  const live_gui = gui.addFolder("Actions");

  live_gui.add(app.log_data, "length")
    .name("Trial no.")
    .listen()
    .disable();

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
    app.current_path().curve.getPoints(20).forEach(p => {
      p.applyEuler(app.current_path().rotation);
      ctx.lineTo(
        125 + p.z * 150,
        125 - p.y * 150,
      );
    });
    ctx.strokeStyle = "white";
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(
      (app.dom_hand().object.position.z - app.paths[0].position.z) * 150 + 125,
      -(app.dom_hand().object.position.y - app.paths[0].position.y) * 150 + 125,
      4, 0, 2 * Math.PI, false
    );
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.closePath();
  }, 125);

  live_gui.add(app, "reset")
    .name("Recalibrate IK");

  live_gui.add(app, "set_rest_position")
    .name("Set rest position");

  live_gui.add(app, "onSelectStart")
    .name("Start task");

  live_gui.add(app, "export")
    .name("Export position log (CSV)");

  live_gui.add(app, "export_json")
    .name("Export position log (JSON)");

  live_gui.add(app, "export_paths")
    .name("Export path points (CSV)");

}