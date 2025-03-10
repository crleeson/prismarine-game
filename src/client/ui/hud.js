export default class HUD {
  constructor(player, controls) {
    this.player = player;
    this.controls = controls;
    this.healthBar = this.createBar(
      "health-bar",
      "20px",
      "20px",
      "300px",
      "15px",
      "#90EE90",
      "horizontal"
    );
    this.speedBar = this.createBar(
      "speed-bar",
      "20px",
      "45px", // Below health bar (20px + 20px height + 10px gap)
      "250px",
      "15px",
      "#FFFF00",
      "horizontal"
    );
    this.xpBar = this.createBar(
      "xp-bar",
      "50%",
      "calc(100% - 50px)",
      "300px",
      "15px",
      "#4682B4",
      "horizontal"
    );
  }

  createBar(id, left, top, width, height, color, orientation) {
    const container = document.createElement("div");
    container.id = id;
    container.style.position = "absolute";
    container.style.left = left;
    container.style.top = top;
    if (id === "xp-bar") {
      container.style.transform = "translateX(-50%)"; // XP bar centering
    }
    container.style.width = width;
    container.style.height = height;
    container.style.background = "rgba(255, 255, 255, 0.2)"; // XP bar background
    container.style.border = "1px solid rgba(255, 255, 255, 0.5)"; // XP bar border
    container.style.borderRadius = "10px"; // XP bar radius
    container.style.overflow = "hidden";

    const fill = document.createElement("div");
    fill.style.background = color;
    fill.style.opacity = "0.8"; // XP bar semi-transparency
    fill.style.borderRadius = "10px";
    fill.style.height = "100%"; // Always horizontal
    fill.style.width = "0%";
    container.appendChild(fill);

    document.body.appendChild(container);
    return { container, fill, orientation: "horizontal" }; // Force horizontal
  }

  update() {
    const health = this.player.stats?.hp || 100;
    this.healthBar.fill.style.width = `${health}%`;

    const speedPercent = Math.min(
      (this.controls.speed / this.controls.maxSpeed) * 100,
      100
    );
    this.speedBar.fill.style.width = `${speedPercent}%`; // Ensure correct display
    this.speedBar.fill.style.background = this.controls.isDashing
      ? "#FFA500"
      : "#FFFF00";

    const xp = this.player.stats?.xp || 0;
    const tierData = this.player.fishData.fishTiers.find(
      (tier) => tier.tier === this.player.tier
    );
    const xpThreshold = tierData.defaultFish.stats.xpThreshold || 100;
    const xpPercent = xpThreshold
      ? Math.min((xp / xpThreshold) * 100, 100)
      : xp;
    this.xpBar.fill.style.width = `${xpPercent}%`;
  }
}
