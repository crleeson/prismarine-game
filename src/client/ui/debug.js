export default class DebugUI {
  constructor(controls) {
    this.controls = controls;
    this.visible = false;
    this.element = this.createUI();
  }

  createUI() {
    const container = document.createElement("div");
    container.id = "debug-ui";
    container.style.position = "absolute";
    container.style.top = "10px";
    container.style.right = "10px";
    container.style.background = "rgba(0, 0, 0, 0.8)";
    container.style.color = "white";
    container.style.padding = "10px";
    container.style.borderRadius = "5px";
    container.style.display = "none";
    document.body.appendChild(container);
    return container;
  }

  update() {
    if (!this.visible) return;
    const info = this.controls.getDebugInfo();
    this.element.innerHTML = `
        <p>Speed: ${info.speed}</p>
        <p>Dash Cooldown: ${info.dashCooldown}</p>
        <p>Is Dashing: ${info.isDashing}</p>
      `;
  }

  toggle() {
    this.visible = !this.visible;
    this.element.style.display = this.visible ? "block" : "none";
    this.update();
  }
}
