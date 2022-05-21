import {
  Button,
  Row,
  Col,
  Popconfirm,
  Input,
  List,
  Avatar,
  Empty,
  Space,
  Badge,
  Spin,
  Popover,
} from "antd";
import {
  DeleteOutlined,
  RollbackOutlined,
  ReloadOutlined,
  CloseCircleFilled,
  LoadingOutlined,
  ExpandOutlined,
} from "@ant-design/icons";
import "antd/dist/antd.min.css";
import "./TTabs.less";
import { EditableTTabGroupTitle } from "./component/EditableTTabGroupTitle";
import { CollapseButton } from "./component/CollapseButton";
import React from "react";
import { TTabGroupDetail } from "./types/TTabGroupDetail";
import { clearAllTTabGroups, deleteTTabGroupById } from "./dal/TTabGroup";
import { listTTabGroupDetailsAndPagination } from "./dal/TTabGroupDetail";
import {
  clearAllTTabs,
  deleteTTabById,
  deleteTTabsByGroupId,
  getTTabsByGroupId,
} from "./dal/TTab";
import { restoreTTabGroups, updateTabGroupTitle } from "./util/TabGroup";
import { clearAllTabWindowCloseInfo } from "./dal/TabWindowCloseInfo";
import Link from "antd/lib/typography/Link";
import { loadTestData } from "./util/test";

interface TTabsState {
  ttabGroupDetails: TTabGroupDetail[];
  searchKeyword: string;
  nonCollapsedTTabGroupSet: Set<number>;
  currentPage: number;
  currentPageSize: number;
  totalTTabGroupCount: number;
  loading: boolean;
}

class TTabs extends React.Component<{}, TTabsState> {
  readonly defaultTTabGroupPageSize = 7;

  constructor(props: {}) {
    super(props);
    this.state = {
      ttabGroupDetails: [],
      searchKeyword: "",
      nonCollapsedTTabGroupSet: new Set(),
      currentPage: 1,
      currentPageSize: this.defaultTTabGroupPageSize,
      totalTTabGroupCount: 0,
      loading: true,
    };
  }

  async componentDidMount() {
    await loadTestData();

    const { currentPage, currentPageSize } = this.state;
    const { ttabGroupDetails, total } = await listTTabGroupDetailsAndPagination(
      "",
      new Set(),
      currentPage - 1,
      currentPageSize
    );
    this.setState({
      ttabGroupDetails,
      totalTTabGroupCount: total,
      loading: false,
    });
  }

  handleSearchKeywordChange = (e: any) => {
    const searchKeyword: string = e.target.value;
    this.search(searchKeyword);
  };

  search = async (keyword: string) => {
    const { nonCollapsedTTabGroupSet } = this.state;
    await listTTabGroupDetailsAndPagination(
      keyword,
      nonCollapsedTTabGroupSet,
      0,
      this.defaultTTabGroupPageSize
    ).then(({ ttabGroupDetails, total }) => {
      this.setState({
        searchKeyword: keyword,
        ttabGroupDetails,
        totalTTabGroupCount: total,
        currentPage: 1,
        currentPageSize: this.defaultTTabGroupPageSize,
      });
    });
  };

  reload = () => {
    const keyword = this.state.searchKeyword;
    this.search(keyword);
  };

  expand = () => {
    // Opens extension popup in a new tab
    chrome.tabs.create({ url: chrome.runtime.getURL("index.html") });
  };

  handleClearAll = () => {
    this.setState({
      ttabGroupDetails: [],
      searchKeyword: "",
      nonCollapsedTTabGroupSet: new Set(),
      currentPage: 1,
      currentPageSize: this.defaultTTabGroupPageSize,
      totalTTabGroupCount: 0,
    });
    clearAllTTabGroups();
    clearAllTTabs();
    clearAllTabWindowCloseInfo();
  };

  hanldeTTabGroupTitleChange = (id: number, title: string) => {
    this.setState((prevState) => ({
      ttabGroupDetails: prevState.ttabGroupDetails.map(
        ({ ttabGroup, ttabs }) => {
          if (ttabGroup.id === id) {
            updateTabGroupTitle(id, title); // update title in chrome & db
            ttabGroup.title = title;
          }

          return { ttabGroup, ttabs } as TTabGroupDetail;
        }
      ),
    }));
  };

  handleTTabGroupCollapseChange = async (id: number, collapsed: boolean) => {
    if (collapsed) {
      this.setState(({ nonCollapsedTTabGroupSet }) => {
        nonCollapsedTTabGroupSet.delete(id);
        return { nonCollapsedTTabGroupSet };
      });
    } else {
      const newTTabs = await getTTabsByGroupId(id);
      this.setState(({ nonCollapsedTTabGroupSet, ttabGroupDetails }) => {
        nonCollapsedTTabGroupSet.add(id);
        return {
          nonCollapsedTTabGroupSet,
          ttabGroupDetails: ttabGroupDetails.map(
            ({ ttabGroup, ttabs, ttabsCount }) => {
              if (ttabGroup.id === id) {
                const modifiedTTabGroupDetail = {
                  ttabGroup,
                  ttabs: newTTabs,
                  ttabsCount: newTTabs.length,
                } as TTabGroupDetail;
                return modifiedTTabGroupDetail;
              }
              return { ttabGroup, ttabs, ttabsCount } as TTabGroupDetail;
            }
          ),
        };
      });
    }
  };

  handleRestoreTTabGroup = async (id: number) => {
    const ttabGroupDetail = this.state.ttabGroupDetails.find(
      ({ ttabGroup }) => ttabGroup.id === id
    );
    ttabGroupDetail && (await restoreTTabGroups(ttabGroupDetail));
    this.reload();
  };

  handleDeleteTTabGroup = (id: number) => {
    this.setState((prevState) => ({
      ttabGroupDetails: prevState.ttabGroupDetails.filter(
        ({ ttabGroup }) => ttabGroup.id !== id
      ),
    }));

    deleteTTabGroupById(id);
    deleteTTabsByGroupId(id);
  };

  handleTabRemove = (tabGroupID: number, tabID: number) => {
    this.setState((prevState) => ({
      ttabGroupDetails: prevState.ttabGroupDetails.map(
        ({ ttabGroup, ttabs }) => {
          if (ttabGroup.id === tabGroupID) {
            ttabs = ttabs.filter((ttab) => ttab.id !== tabID);
          }
          return {
            ttabGroup,
            ttabs,
            ttabsCount: ttabs.length,
          } as TTabGroupDetail;
        }
      ),
    }));

    deleteTTabById(tabID);
    chrome.tabs.remove(tabID);
  };

  render() {
    const {
      ttabGroupDetails,
      searchKeyword,
      nonCollapsedTTabGroupSet,
      totalTTabGroupCount,
      currentPage,
      currentPageSize,
      loading,
    } = this.state;

    if (loading) {
      return (
        <div style={{ textAlign: "center" }}>
          <Spin
            size="large"
            indicator={<LoadingOutlined />}
            style={{ paddingTop: "200px" }}
          />
        </div>
      );
    }

    if (ttabGroupDetails.length === 0 && searchKeyword === "") {
      return <Empty style={{ paddingTop: "200px" }} />;
    }

    return (
      <div className="TTabs">
        {/* Toolbox header: search & clear all button */}
        <>
          <Row align="middle" style={{ marginTop: "20px" }}>
            <Col span={12}>
              <Row justify="start">
                <Input
                  type="text"
                  size="small"
                  onChange={this.handleSearchKeywordChange}
                  placeholder="type your keyword to search..."
                ></Input>
              </Row>
            </Col>
            <Col span={12}>
              <Row justify="end">
                <Space>
                  <Col>
                    <Popover content="open extension in a new tab">
                      <Button
                        size="small"
                        icon={<ExpandOutlined />}
                        onClick={this.expand}
                      ></Button>
                    </Popover>
                  </Col>
                  <Col>
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={this.reload}
                    />
                  </Col>
                  <Col>
                    <Popconfirm
                      placement="bottomLeft"
                      title={"Sure to clear all history?"}
                      onConfirm={this.handleClearAll}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button
                        danger
                        block
                        icon={<DeleteOutlined />}
                        size="small"
                      >
                        Clear All
                      </Button>
                    </Popconfirm>
                  </Col>
                </Space>
              </Row>
            </Col>
          </Row>
        </>
        {/* TTabGroup Display */}
        <>
          <List
            pagination={{
              position: "bottom",
              size: "small",
              showSizeChanger: true,
              showQuickJumper: true,
              onChange: (page, pageSize) => {
                listTTabGroupDetailsAndPagination(
                  searchKeyword,
                  nonCollapsedTTabGroupSet,
                  page,
                  pageSize
                ).then(({ ttabGroupDetails, total }) => {
                  this.setState({
                    ttabGroupDetails,
                    totalTTabGroupCount: total,
                    currentPage: page,
                    currentPageSize: pageSize,
                  });
                });
              },
              current: currentPage,
              pageSize: currentPageSize,
              total: totalTTabGroupCount,
              pageSizeOptions: [3, 5, 7, 10, 15],
            }}
            dataSource={ttabGroupDetails}
            renderItem={({ ttabGroup, ttabs, ttabsCount }) => (
              <>
                <List
                  header={
                    <Row>
                      <Col span={6}>
                        <Badge
                          count={ttabsCount}
                          color={ttabsCount < 10 ? "lime" : "orange"}
                        >
                          <EditableTTabGroupTitle
                            id={ttabGroup.id}
                            title={ttabGroup.title}
                            color={ttabGroup.color}
                            onTitleChange={this.hanldeTTabGroupTitleChange}
                          />
                        </Badge>
                      </Col>
                      <Col span={18}>
                        <Row justify="end">
                          <CollapseButton
                            id={ttabGroup.id}
                            collapsed={
                              !nonCollapsedTTabGroupSet.has(ttabGroup.id)
                            }
                            onCollapseChange={
                              this.handleTTabGroupCollapseChange
                            }
                          />
                          <Button
                            icon={<RollbackOutlined />}
                            size="small"
                            onClick={() => {
                              this.handleRestoreTTabGroup(ttabGroup.id);
                            }}
                          >
                            Restore
                          </Button>
                          <Button
                            icon={<DeleteOutlined />}
                            size="small"
                            onClick={() => {
                              this.handleDeleteTTabGroup(ttabGroup.id);
                            }}
                          >
                            Delete
                          </Button>
                        </Row>
                      </Col>
                    </Row>
                  }
                  itemLayout="horizontal"
                  locale={{ emptyText: <></> }}
                  dataSource={ttabs}
                  renderItem={(tab) => (
                    <List.Item
                      hidden={!nonCollapsedTTabGroupSet.has(ttabGroup.id)}
                    >
                      <List.Item.Meta
                        avatar={<Avatar src={tab.favIconUrl} />}
                        title={
                          <Row>
                            <Col span={20}>
                              <Link href={tab.url} target="_blank">
                                {tab.title}
                              </Link>
                            </Col>
                            <Col span={4}>
                              <Row justify="end">
                                <Button
                                  style={{ border: "none" }}
                                  icon={<CloseCircleFilled />}
                                  size="small"
                                  onClick={() => {
                                    tab.id &&
                                      this.handleTabRemove(
                                        ttabGroup.id,
                                        tab.id
                                      );
                                  }}
                                />
                              </Row>
                            </Col>
                          </Row>
                        }
                        description={tab.url === undefined ? "" : tab.url}
                      />
                    </List.Item>
                  )}
                  style={{ margin: "10px 0px" }}
                />
              </>
            )}
          ></List>
        </>
      </div>
    );
  }
}

export default TTabs;
