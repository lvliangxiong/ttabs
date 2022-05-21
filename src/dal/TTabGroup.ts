import { TTabGroup } from "../types/TTabGroup";
import { db } from "./DB";

export function saveTTabGroup(ttabGroup: TTabGroup) {
  return db.ttab_group.put(ttabGroup);
}

export function saveTTabGroups(ttab_groups: TTabGroup[]) {
  return db.ttab_group.bulkPut(ttab_groups);
}

export function clearAllTTabGroups() {
  return db.ttab_group.clear();
}

export function deleteTTabGroupById(id: number) {
  return db.ttab_group.delete(id);
}

export async function updateTTabGroup(ttabGroup: TTabGroup) {
  const ttg = await db.ttab_group.get(ttabGroup.id);
  const now = Date.now();
  if (ttg) {
    // already exists, update it
    return db.ttab_group.update(ttabGroup.id, {
      title: ttabGroup.title,
      color: ttabGroup.color,
      collapsed: ttabGroup.collapsed,
      updatedAt: now,
    });
  } else {
    // not exists, create it with now as createdAt & updatedAt
    return saveTTabGroup({
      ...ttabGroup,
      updatedAt: now,
      createdAt: now,
    });
  }
}

export function updateTTabGroupTitle(id: number, title: string) {
  return db.ttab_group.update(id, { title });
}

export function batchUpdateTTabGroup(ttabGroups: TTabGroup[]) {
  return Promise.all(ttabGroups.map((ttabGroup) => updateTTabGroup(ttabGroup)));
}

export function listTTabGroupsWithPagination(
  keyword: string,
  page: number,
  pageSize: number
) {
  let collection = db.ttab_group.orderBy("updatedAt").reverse();

  if (keyword.length !== 0) {
    collection = collection.filter((ttabGroup) => {
      if (!ttabGroup.title) {
        return false;
      }
      return ttabGroup.title.toLowerCase().includes(keyword.toLowerCase());
    });
  }

  return collection
    .offset((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();
}

export function countTTabGroups(keyword: string) {
  return db.ttab_group
    .filter((ttabGroup) => {
      if (!ttabGroup.title) {
        return false;
      }
      if (keyword.length === 0) {
        return true;
      }
      return ttabGroup.title.toLowerCase().includes(keyword.toLowerCase());
    })
    .count();
}
