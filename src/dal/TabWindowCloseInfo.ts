import { db } from "./DB";

export function saveTabClosedByWindowClosedEvent(tabId: number) {
  const now = Date.now();
  return db.tab_window_close_info.put({
    tabId,
    closedAt: now,
  });
}

export function getRecentlyClosedWindowEventOnTab(
  tabId: number,
  timeBefore: number
) {
  const now = Date.now();
  return db.tab_window_close_info
    .where("tabId")
    .equals(tabId)
    .filter(
      (tabWindowCloseInfo) => tabWindowCloseInfo.closedAt > now - timeBefore
    )
    .last();
}

export function clearAllTabWindowCloseInfo() {
  return db.tab_window_close_info.clear();
}
