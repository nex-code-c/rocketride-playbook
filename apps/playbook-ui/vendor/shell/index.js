const React = require("react");

function AppLayout({ sidebar, children }) {
  return React.createElement(
    "div",
    { style: { display: "flex", height: "100dvh", minHeight: 0, width: "100%", overflow: "hidden" } },
    sidebar,
    React.createElement("div", { style: { flex: 1, minWidth: 0, minHeight: 0, height: "100%", overflow: "hidden" } }, children),
  );
}

module.exports = { AppLayout };
