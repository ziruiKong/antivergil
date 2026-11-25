(() => {
  const input = document.getElementById("verification-code");
  const cells = Array.from(document.querySelectorAll(".code-digit"));
  if (!input || cells.length !== 6) return;
  function render() {
    input.value = input.value.replace(/\D/g, "").slice(0, 6);
    const position = Math.min(input.selectionStart ?? input.value.length, 5);
    cells.forEach((cell, index) => {
      cell.textContent = input.value[index] || "";
      cell.classList.toggle("is-active", document.activeElement === input && index === position);
      cell.classList.toggle("is-filled", Boolean(input.value[index]));
    });
  }
  for (const event of ["input", "focus", "blur", "keyup", "click", "select"]) input.addEventListener(event, render);
  input.addEventListener("paste", event => {
    event.preventDefault();
    input.value = (event.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  render();
})();
