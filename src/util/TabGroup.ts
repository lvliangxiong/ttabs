import { deleteTTabsByGroupId, getTTabsByGroupId } from "../dal/TTab";
import { deleteTTabGroupById, updateTTabGroupTitle } from "../dal/TTabGroup";
import { TTab } from "../types/TTab";
import { TTabGroupDetail } from "../types/TTabGroupDetail";

export async function getTTabGroupDetailByTabGroupIdInChrome(id: number) {
  const [tabGroup, tabs] = await Promise.all([
    chrome.tabGroups.get(id),
    chrome.tabs.query({ groupId: id }),
  ]);

  return {
    ttabGroup: {
      id: tabGroup.id,
      title: tabGroup.title,
      color: tabGroup.color,
      collapsed: tabGroup.collapsed,
    },
    ttabs: tabs.map(
      (tab) =>
        ({
          id: tab.id,
          index: tab.index,
          groupId: tab.groupId,
          title: tab.title,
          favIconUrl: tab.favIconUrl,
          url: tab.url,
        } as TTab)
    ),
    ttabsCount: tabs.length,
  } as TTabGroupDetail;
}

// Get all alive tab groups in chrome, return in the form of Promise<TTabGroupDetail[]>.
export async function getAllTTabGroupDetailsInChrome() {
  const tabGroups = await chrome.tabGroups.query({});

  return await Promise.all(
    tabGroups.map((tabGroup) => {
      return getTTabGroupDetailByTabGroupIdInChrome(tabGroup.id);
    })
  );
}

export function updateTabGroupTitle(tabGroupId: number, title: string) {
  chrome.tabGroups.update(tabGroupId, { title });
  updateTTabGroupTitle(tabGroupId, title);
}

// Returns whether the tab group is alive in chrome.
export async function isTabGroupExistInChrome(id: number) {
  try {
    await chrome.tabGroups.get(id);
    return true;
  } catch (error) {
    // no tab group alive for the group id
    return false;
  }
}

// Restore tab group in chrome based on the given TTabGroupDetail.
export async function restoreTTabGroups({ ttabGroup, ttabs }: TTabGroupDetail) {
  ttabs = await getTTabsByGroupId(ttabGroup.id);
  if (ttabs.length === 0) {
    return;
  }

  // If tab group already exists, change focus.
  const alreadyExist = await isTabGroupExistInChrome(ttabGroup.id);
  if (alreadyExist) {
    const tabIds: number[] = [];
    ttabs
      .map((tab) => tab.id)
      .forEach((tabId) => {
        tabId && tabIds.push(tabId);
      });
    chrome.tabs.highlight({ tabs: tabIds });
    return;
  }

  // If tab group does not exist, create it in a new window
  const win = await chrome.windows.create();
  const winId = win.id;

  const newTabs = await Promise.all(
    ttabs.map((ttab) => {
      return chrome.tabs.create({
        url: ttab.url,
        index: ttab.index,
        windowId: winId,
      });
    })
  );

  const newTabIds: number[] = [];
  newTabs
    .map((tab) => tab.id)
    .forEach((tabId) => {
      tabId && newTabIds.push(tabId);
    });

  chrome.tabs.query({ windowId: winId }, (tabs) => {
    // genrally speaking, there is a default new tab, we should remove it
    tabs
      .filter(
        (tab) =>
          tab.url === "chrome://newtab/" ||
          tab.pendingUrl === "chrome://newtab/"
      )
      .forEach((tab) => {
        tab.id && chrome.tabs.remove(tab.id);
      });
  });

  chrome.tabs.group(
    {
      tabIds: newTabIds,
      createProperties: { windowId: winId },
    },
    (groupId) => {
      chrome.tabGroups.update(groupId, {
        color: ttabGroup.color as chrome.tabGroups.ColorEnum,
        title: ttabGroup.title,
        collapsed: ttabGroup.collapsed,
      });
    }
  );

  deleteTTabGroupById(ttabGroup.id);
  deleteTTabsByGroupId(ttabGroup.id);
}
