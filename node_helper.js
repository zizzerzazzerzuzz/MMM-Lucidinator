const NodeHelper = require("node_helper");
const { spawn } = require("child_process");
const path = require("path");

module.exports = NodeHelper.create({
  start() {
    this.timer = null;
    this.running = false;
    this.options = null;
  },

  socketNotificationReceived(notification, payload) {
    if (notification !== "START") return;

    this.options = payload;
    this.poll();
    this.timer = setInterval(
      () => this.poll(),
      Math.max(60_000, Number(payload.updateInterval) || 5 * 60 * 1000)
    );
  },

  poll() {
    if (this.running || !this.options) return;

    const email = process.env.LUCID_EMAIL;
    const password = process.env.LUCID_PASSWORD;

    if (!email || !password) {
      this.sendSocketNotification("LUCID_ERROR", {
        message: "Set LUCID_EMAIL and LUCID_PASSWORD in the MagicMirror environment"
      });
      return;
    }

    this.running = true;

    const script = path.join(__dirname, this.options.scriptPath || "lucid_status.py");
    const python = this.options.pythonExecutable || "python3";

    const child = spawn(
      python,
      [
        script,
        "--vehicle-index",
        String(this.options.vehicleIndex ?? 0),
        "--range-unit",
        this.options.rangeUnit === "km" ? "km" : "mi"
      ],
      {
        env: {
          ...process.env,
          LUCID_EMAIL: email,
          LUCID_PASSWORD: password
        },
        stdio: ["ignore", "pipe", "pipe"]
      }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (error) => {
      this.running = false;
      console.error("[MMM-Lucidinator] Could not start Python:", error);
      this.sendSocketNotification("LUCID_ERROR", {
        message: "Could not start the Python client"
      });
    });

    child.on("close", (code) => {
      this.running = false;

      if (code !== 0) {
        console.error("[MMM-Lucidinator] Python error:", stderr || `exit ${code}`);
        this.sendSocketNotification("LUCID_ERROR", {
          message: "Lucid API request failed; check the MagicMirror log"
        });
        return;
      }

      try {
        const status = JSON.parse(stdout.trim());
        this.sendSocketNotification("LUCID_STATUS", status);
      } catch (error) {
        console.error("[MMM-Lucidinator] Invalid Python output:", stdout, stderr);
        this.sendSocketNotification("LUCID_ERROR", {
          message: "Could not read vehicle data"
        });
      }
    });
  },

  stop() {
    if (this.timer) clearInterval(this.timer);
  }
});
