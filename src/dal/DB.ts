import Dexie, { Table } from "dexie";
import { TTab } from "../types/TTab";
import { TTabGroup } from "../types/TTabGroup";
import { TabWindowCloseInfo } from "../types/TabWindowCloseInfo";

class DB extends Dexie {
  ttab_group!: Table<TTabGroup>;
  ttab!: Table<TTab>;
  tab_window_close_info!: Table<TabWindowCloseInfo>;

  constructor() {
    super("ttabs");

    this.version(1).stores({
      ttab_group: "++id, title, updatedAt",
      ttab: "++id, groupId, index, title, url",
      tab_window_close_info: "++tabId, time",
    });
  }
}

export const db = new DB();
