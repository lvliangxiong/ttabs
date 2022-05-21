import { TTab } from "./TTab";
import { TTabGroup } from "./TTabGroup";

export interface TTabGroupDetail {
  ttabGroup: TTabGroup;
  ttabs: TTab[];
  ttabsCount: number;
}

export interface TTabGroupDetailsWithPagination {
  ttabGroupDetails: TTabGroupDetail[];

  page: number;
  pageSize: number;
  total: number;
}
