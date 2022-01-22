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
      chrome.notifications.create(
        "saved success",
        {
          type: "basic",
          iconUrl: "/ttabs_128.png",
          title: "TTabs",
          message: "tabs saved successfully",
        },
        (notificationId) => {
          setTimeout(
            () => {
              chrome.notifications.clear(notificationId);
            },
            200 // ms
          );
        }
      );
  }
});
