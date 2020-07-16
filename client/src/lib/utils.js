const hideElements = (...elements) =>
  elements.forEach((el) => el.setAttribute("hidden", "hidden"));

const showElements = (...elements) =>
  elements.forEach((el) => el.removeAttribute("hidden"));

module.exports = {
  hideElements,
  showElements,
};
