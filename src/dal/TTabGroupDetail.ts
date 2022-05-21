import { TTab } from "../types/TTab";
import { TTabGroup } from "../types/TTabGroup";
import {
  TTabGroupDetail,
  TTabGroupDetailsWithPagination,
} from "../types/TTabGroupDetail";
import {
  batchUpdateTTab,
  countTTabsByGroupId,
  getTTabsByGroupId,
  saveTTabs,
} from "./TTab";
import {
  batchUpdateTTabGroup,
  countTTabGroups,
  listTTabGroupsWithPagination,
  saveTTabGroup,
} from "./TTabGroup";

export function saveTTabGroupDetail(ttabGroupDetail: TTabGroupDetail) {
  return [
    saveTTabGroup(ttabGroupDetail.ttabGroup),
    saveTTabs(ttabGroupDetail.ttabs),
  ];
}

export function batchUpdateTTabGroupDetails(
  ttabGroupDetails: TTabGroupDetail[]
) {
  const ttabGroups: TTabGroup[] = [];
  const ttabs: TTab[] = [];
  ttabGroupDetails.forEach((ttabGroupDetail) => {
    ttabGroups.push(ttabGroupDetail.ttabGroup);
    ttabs.push(...ttabGroupDetail.ttabs);
  });

  return [batchUpdateTTabGroup(ttabGroups), batchUpdateTTab(ttabs)];
}

export async function listTTabGroupDetailsAndPagination(
  keyword: string,
  needTTabs: Set<number>,
  page: number,
  pageSize: number
) {
  const ttabGroups = await listTTabGroupsWithPagination(
    keyword,
    page,
    pageSize
  );

  const ttabGroupDetails = await Promise.all(
    ttabGroups.map(async (ttabGroup) => {
      return {
        ttabGroup,
        ttabs: await getTTabsByGroupId(ttabGroup.id),
        ttabsCount: await countTTabsByGroupId(ttabGroup.id),
      } as TTabGroupDetail;
    })
  );

  return {
    ttabGroupDetails,
    total: await countTTabGroups(keyword),
    page,
    pageSize,
  } as TTabGroupDetailsWithPagination;
}
