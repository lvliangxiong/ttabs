import { TTab } from "../types/TTab";
import { db } from "./DB";

export function saveTTab(ttab: TTab) {
  return ttab.id && db.ttab.put(ttab);
}

export function saveTTabs(ttabs: TTab[]) {
  return db.ttab.bulkPut(ttabs.filter((ttab) => ttab.id));
}

export function deleteTTabById(id: number) {
  return db.ttab.delete(id);
}

export function deleteTTabsByGroupId(groupId: number) {
  return db.ttab.where("groupId").equals(groupId).delete();
}

export function clearAllTTabs() {
  return db.ttab.clear();
}

export function updateTTab(ttab: TTab) {
  return saveTTab(ttab);
}

export function updateTTabIndex(tabId: number, index: number) {
  return db.ttab.update(tabId, { index });
}

export function batchUpdateTTab(ttabs: TTab[]) {
  return Promise.all(ttabs.map((ttab) => updateTTab(ttab)));
}

export async function getTTabsByGroupId(groupId: number) {
  return db.ttab
    .orderBy("index")
    .filter((ttab) => ttab.groupId === groupId)
    .toArray();
}

export function countTTabsByGroupId(groupId: number) {
  return db.ttab.where("groupId").equals(groupId).count();
}
