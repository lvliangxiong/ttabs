export interface TTabGroup {
  id: number;
  title?: string | undefined;
  color: chrome.tabGroups.ColorEnum;
  collapsed: boolean;
  createdAt: number;
  updatedAt: number;
}
