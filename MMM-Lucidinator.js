Module.register("MMM-Lucidinator", {
  defaults: {
    updateInterval: 5 * 60 * 1000,
    vehicleIndex: 0,
    rangeUnit: "mi", // "mi" or "km"
    showHealth: false,
    title: "Lucid",
    pythonExecutable: "python3",
    scriptPath: "lucid_status.py"
  },

  start() {
    this.status = null;
    this.error = null;

    this.sendSocketNotification("START", {
      updateInterval: this.config.updateInterval,
      vehicleIndex: this.config.vehicleIndex,
      rangeUnit: this.config.rangeUnit,
      pythonExecutable: this.config.pythonExecutable,
      scriptPath: this.config.scriptPath
    });
  },

  getStyles() {
    return ["MMM-Lucidinator.css"];
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "lucidinator";

    const title = document.createElement("div");
    title.className = "lucidinator-title";
    title.textContent = this.config.title;
    wrapper.appendChild(title);

    if (this.error) {
      const error = document.createElement("div");
      error.className = "lucidinator-error";
      error.textContent = this.error;
      wrapper.appendChild(error);
      return wrapper;
    }

    if (!this.status) {
      const loading = document.createElement("div");
      loading.className = "dimmed";
      loading.textContent = "Loading vehicle status…";
      wrapper.appendChild(loading);
      return wrapper;
    }

    const charge = document.createElement("div");
    charge.className = "lucidinator-charge";
    charge.textContent = `${this.formatNumber(this.status.chargePercent)}%`;
    wrapper.appendChild(charge);

    const range = document.createElement("div");
    range.className = "lucidinator-range";
    range.textContent = `${this.formatNumber(this.status.range)} ${this.status.rangeUnit} range`;
    wrapper.appendChild(range);

    if (this.config.showHealth && this.status.batteryHealth !== null) {
      const health = document.createElement("div");
      health.className = "lucidinator-health";
      health.textContent = `Battery health: ${this.formatNumber(this.status.batteryHealth)}%`;
      wrapper.appendChild(health);
    }

    if (this.status.updatedAt) {
      const updated = document.createElement("div");
      updated.className = "lucidinator-updated dimmed";
      updated.textContent = `Updated ${new Date(this.status.updatedAt).toLocaleTimeString()}`;
      wrapper.appendChild(updated);
    }

    return wrapper;
  },

  formatNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * 10) / 10 : "—";
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "LUCID_STATUS") {
      this.status = payload;
      this.error = null;
      this.updateDom();
    } else if (notification === "LUCID_ERROR") {
      this.error = payload?.message || "Unable to update vehicle status";
      this.updateDom();
    }
  }
});
