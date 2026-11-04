document.addEventListener("DOMContentLoaded", () => {
  console.log("Rami App Started!");

  const buttons = document.querySelectorAll("button");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      button.style.transform = "scale(0.95)";

      setTimeout(() => {
        button.style.transform = "scale(1)";
      }, 150);
    });
  });
});
