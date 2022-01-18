import App from "../App";

const app = new App({});

chrome.runtime.onInstalled.addListener(() => {
  console.log("background.js loaded on installed");
});

chrome.commands.onCommand.addListener((command, tab) => {
  console.log(`Command "${command}" triggered`);

  switch (command) {
    case "Save Tabs":
      app.handleSaveTabs();
  }
});
