import { clearAllTTabs, saveTTabs } from "../dal/TTab";
import { clearAllTTabGroups, saveTTabGroups } from "../dal/TTabGroup";
import { TTab } from "../types/TTab";
import { TTabGroup } from "../types/TTabGroup";

export async function loadTestData() {
  if (chrome && !chrome.tabs && !chrome.tabGroups) {
    // following code is for testing in chrome env, not chrome extension env
    clearAllTTabGroups();
    clearAllTTabs();

    const ttabGroups = [] as TTabGroup[];
    const ttabs = [] as TTab[];

    const ttabGroupCnt = 66;
    const ttabCnt = 16;
    for (let groupIndex = 0; groupIndex < ttabGroupCnt; groupIndex++) {
      ttabGroups.push({
        id: groupIndex,
        title: `Tab Group ${groupIndex}`,
        color: "red",
        collapsed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as TTabGroup);

      const ttabCntLocal = getRandomInt(ttabCnt);
      for (let index = 0; index < ttabCntLocal; index++) {
        ttabs.push({
          id: groupIndex * ttabCnt + index,
          index: index,
          groupId: groupIndex,
          title: `Tab ${groupIndex * ttabCnt + index}`,
          favIconUrl: "",
          url: "www.google.com",
        } as TTab);
      }
    }

    saveTTabGroups(ttabGroups);
    saveTTabs(ttabs);
  }
}

function getRandomInt(max: number) {
  return Math.floor(Math.random() * (max + 1));
}
