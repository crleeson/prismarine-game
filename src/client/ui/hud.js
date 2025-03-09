export default class HUD {
  constructor(player, controls) {
    this.player = player;
    this.controls = controls;
    this.healthBar = this.createBar(
      "health-bar",
      "calc(100% - 220px)",
      "20px",
      "200px",
      "20px",
      "#90EE90",
      "horizontal"
    );
    this.speedBar = this.createSpeedBar(
      "speed-bar",
      "calc(100% - 40px)",
      "50%",
      "20px",
      "200px",
      "#FFFF00",
      "vertical"
    );
    this.xpBar = this.createBar(
      "xp-bar",
      "50%",
      "calc(100% - 50px)",
      "200px",
      "20px",
      "#4682B4",
      "horizontal"
    );
  }

  createBar(id, left, top, width, height, color, orientation) {
    const container = document.createElement("div");
    container.id = id;
    container.style.position = "absolute";
    container.style.left = left; // Removed translateX(-50%)
    container.style.top = top;
    container.style.width = width;
    container.style.height = height;
    container.style.background = "rgba(255, 255, 255, 0.2)";
    container.style.border = "1px solid rgba(255, 255, 255, 0.5)";
    container.style.borderRadius = "10px";
    container.style.overflow = "hidden";

    const fill = document.createElement("div");
    fill.style.background = color;
    fill.style.opacity = "0.8";
    fill.style.borderRadius = "10px";
    if (orientation === "horizontal") {
      fill.style.height = "100%";
      fill.style.width = "0%";
    } else {
      fill.style.width = "100%";
      fill.style.height = "0%";
      fill.style.position = "absolute";
      fill.style.bottom = "0";
    }
    container.appendChild(fill);

    document.body.appendChild(container);
    return { container, fill, orientation };
  }

  createSpeedBar(id, left, top, width, height, color, orientation) {
    const container = document.createElement("div");
    container.id = id;
    container.style.position = "absolute";
    container.style.left = left;
    container.style.top = top;
    container.style.transform =
      orientation === "horizontal" ? "translateX(0%)" : "translateY(-50%)";
    container.style.width = width;
    container.style.height = height;
    container.style.background = "rgba(255, 255, 255, 0.2)";
    container.style.border = "2px solid #FFFFFF";
    container.style.borderRadius = "10px";
    container.style.overflow = "hidden";
    container.style.boxSizing = "border-box";

    const outlineFill = document.createElement("div");
    outlineFill.style.position = "absolute";
    outlineFill.style.top = "0";
    outlineFill.style.left = "0";
    outlineFill.style.width = "100%";
    outlineFill.style.height = "100%";
    outlineFill.style.border = "2px solid #FFFFFF";
    outlineFill.style.borderRadius = "10px";
    outlineFill.style.boxSizing = "border-box";
    outlineFill.style.clipPath = "inset(0% 0% 100% 0%)";
    outlineFill.style.background = "rgba(255, 255, 0, 0.3)";
    container.appendChild(outlineFill);

    const fill = document.createElement("div");
    fill.style.background = color;
    fill.style.opacity = "0.8";
    fill.style.borderRadius = "10px";
    fill.style.width = "100%";
    fill.style.height = "0%";
    fill.style.position = "absolute";
    fill.style.bottom = "0";
    container.appendChild(fill);

    document.body.appendChild(container);
    return { container, fill, outlineFill, orientation };
  }

  update() {
    const health = this.player.stats?.health || 100;
    this.healthBar.fill.style.width = `${health}%`;

    const speedPercent = Math.min(
      (this.controls.speed / this.controls.maxSpeed) * 100,
      100
    );
    this.speedBar.fill.style.height = `${speedPercent}%`;

    const dashCooldown = this.controls.dashCooldown;
    const cooldownPercent = Math.min(((2 - dashCooldown) / 2) * 100, 100);
    this.speedBar.outlineFill.style.clipPath = `inset(${
      100 - cooldownPercent
    }% 0% 0% 0%)`;
    this.speedBar.outlineFill.style.background =
      cooldownPercent >= 100
        ? "rgba(255, 255, 0, 0.5)"
        : "rgba(255, 255, 0, 0.3)";

    const xp = this.player.stats?.xp || 0;
    this.xpBar.fill.style.width = `${xp}%`;
  }
}
