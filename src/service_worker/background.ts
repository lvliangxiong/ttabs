import {
  deleteTTabById,
  saveTTab,
  updateTTab,
  updateTTabIndex,
} from "../dal/TTab";
import { saveTTabGroup, updateTTabGroup } from "../dal/TTabGroup";
import { batchUpdateTTabGroupDetails } from "../dal/TTabGroupDetail";
import {
  getRecentlyClosedWindowEventOnTab,
  saveTabClosedByWindowClosedEvent,
} from "../dal/TabWindowCloseInfo";
import { TTabGroup } from "../types/TTabGroup";
import { getAllTTabGroupDetailsInChrome } from "../util/TabGroup";

function SendSaveSuccessNotification() {
  chrome.notifications.create(
    "saved success",
    {
      type: "basic",
      iconUrl: "/ttabs_128.png",
      title: "TTabs",
      message: "tab groups saved successfully",
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

async function UpdateAllAliveTabGroups() {
  const ttabGroupDetails = await getAllTTabGroupDetailsInChrome();
  batchUpdateTTabGroupDetails(ttabGroupDetails);
  SendSaveSuccessNotification();
}

chrome &&
  chrome.commands &&
  chrome.commands.onCommand &&
  chrome.commands.onCommand.addListener((command, tab) => {
    console.log(`Command "${command}" triggered`);
    switch (command) {
      case "Save Tab Groups":
        UpdateAllAliveTabGroups();
    }
  });

chrome.tabs &&
  chrome.tabs.onCreated &&
  chrome.tabs.onCreated.addListener(async (tab) => {
    console.log("tabs.onCreated:", tab);
    // tab created
    saveTTab({
      id: tab.id,
      index: tab.index,
      groupId: tab.groupId,
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
    });
  });

const TimeExpectWindowCloseLag = 200; // ms

chrome &&
  chrome.tabs &&
  chrome.tabs.onUpdated &&
  chrome.tabs.onUpdated.addListener(async (tabId, tabChangeInfo, tab) => {
    console.log("tabs.onUpdated:", tabId, tabChangeInfo, tab);
    if (tabChangeInfo.status === "loading") return;
    if (
      // a grouped tab's url/favIconUrl/title changed
      (tab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE &&
        (tabChangeInfo.url !== undefined ||
          tabChangeInfo.favIconUrl !== undefined ||
          tabChangeInfo.title !== undefined)) ||
      // a tab was added to a tab group
      (tabChangeInfo.groupId !== undefined &&
        tabChangeInfo.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE)
    ) {
      updateTTab({
        id: tabId,
        index: tab.index,
        groupId: tab.groupId,
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
      });
      return;
    }

    if (tabChangeInfo.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
      // Tab moved out of a group, which might be triggered by:
      // 1. window was closed,
      // 2. tab was closed,
      // 3. close tab group,
      // 4. tab group was ungrouped,
      // 5. tab was moved to another group or ungrouped.
      // * It's hard to distinguish these cases.
      // * Generally speaking, we only want to move a tab out of a group when it's case 2&5.
      // * Additionally, we assume that user won't do case 3&4. So we need to ditinguish case 1 from 2&5.
      setTimeout(async () => {
        // query tab_window_close_info to judge whether this tab was closed by window close event.
        const windowClose = await getRecentlyClosedWindowEventOnTab(
          tabId,
          2 * TimeExpectWindowCloseLag
        );
        // If this tab was not closed by window close event, we should remove it from original tab group.
        !windowClose && deleteTTabById(tabId);
      }, TimeExpectWindowCloseLag);
      return;
    }
  });

chrome &&
  chrome.tabs &&
  chrome.tabs.onMoved &&
  chrome.tabs.onMoved.addListener(async (tabId, moveInfo) => {
    console.log("tabs.onMoved:", tabId, moveInfo);
    updateTTabIndex(tabId, moveInfo.toIndex);
  });

chrome &&
  chrome.tabs &&
  chrome.tabs.onRemoved &&
  chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    console.log("tabs.onRemoved:", tabId, removeInfo);
    // window was closed, save this event to indexedDB
    if (removeInfo.isWindowClosing) {
      saveTabClosedByWindowClosedEvent(tabId);
      return;
    }

    // tab was closed
    deleteTTabById(tabId);
  });

chrome &&
  chrome.tabGroups &&
  chrome.tabGroups.onCreated &&
  chrome.tabGroups.onCreated.addListener((tabGroup) => {
    console.log("tabGroups.onCreated:", tabGroup);
    // tab group created
    const now = Date.now();
    saveTTabGroup({
      id: tabGroup.id,
      title: tabGroup.title,
      color: tabGroup.color,
      collapsed: tabGroup.collapsed,
      updatedAt: now,
      createdAt: now,
    } as TTabGroup);
  });

chrome &&
  chrome.tabGroups &&
  chrome.tabGroups.onUpdated &&
  chrome.tabGroups.onUpdated.addListener((tabGroup) => {
    console.log("tabGroups.onUpdated:", tabGroup);
    // tab group updated
    updateTTabGroup({
      id: tabGroup.id,
      title: tabGroup.title,
      color: tabGroup.color,
      collapsed: tabGroup.collapsed,
    } as TTabGroup);
  });
