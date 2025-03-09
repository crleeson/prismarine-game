export default class PauseUI {
  constructor(onResume) {
    this.onResume = onResume;
    this.element = this.createUI();
    this.visible = false;
  }

  createUI() {
    const container = document.createElement("div");
    container.id = "pause-ui";
    container.style.position = "absolute";
    container.style.top = "50%";
    container.style.left = "50%";
    container.style.transform = "translate(-50%, -50%)";
    container.style.background = "rgba(0, 0, 0, 0.8)";
    container.style.color = "white";
    container.style.padding = "20px";
    container.style.borderRadius = "10px";
    container.style.display = "none";
    container.style.textAlign = "center";

    const title = document.createElement("h1");
    title.innerText = "Paused";
    container.appendChild(title);

    const resumeButton = document.createElement("button");
    resumeButton.innerText = "Resume";
    resumeButton.style.padding = "10px 20px";
    resumeButton.style.margin = "10px";
    resumeButton.style.fontSize = "16px";
    resumeButton.addEventListener("click", () => this.onResume());
    container.appendChild(resumeButton);

    document.body.appendChild(container);
    return container;
  }

  show() {
    this.element.style.display = "block";
    this.visible = true;
  }

  hide() {
    this.element.style.display = "none";
    this.visible = false;
  }
}
