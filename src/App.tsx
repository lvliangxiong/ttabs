import react, { Component } from "react";
import {
  Button,
  Tooltip,
  Row,
  Col,
  Popconfirm,
  Input,
  Tag,
  Image,
  Tabs,
  message,
} from "antd";
import {
  RollbackOutlined,
  DeleteOutlined,
  SaveOutlined,
  RightOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { grey } from "@ant-design/colors";
import "antd/dist/antd.min.css";
import "./App.less";

const { TabPane } = Tabs;

const tooltipColor = grey[2];
const tooltipPopupDelay = 0.5;

interface IState {
  ttab_groups: TTabGroup[];
  search_item: string;
}

interface TTabGroup {
  id: number;
  title: string;
  color: string;
  collapsed: boolean; // whether collapsed in the popup page
  tabs: TTab[];
  created_at: number;
  updated_at: number;
}

interface TTab {
  id: number | undefined;
  title: string;
  fav_icon_url: string | undefined;
  url: string;
}

const APP_STATE_KEY = "state";

interface IProps {}

class App extends Component<IProps, IState> {
  emptyState: IState;
  testState: IState;

  constructor(props: IProps) {
    super(props);

    this.emptyState = {
      ttab_groups: [],
      search_item: "",
    };

    this.testState = {
      ttab_groups: [
        {
          id: -1,
          collapsed: true,
          color: "red",
          created_at: new Date().getTime(),
          updated_at: new Date().getTime(),
          title: "test tab group",
          tabs: [
            {
              fav_icon_url: "https://www.bing.com/sa/simg/favicon-2x.ico",
              id: -1,
              title: "bing",
              url: "http://www.bing.com",
            },
            {
              fav_icon_url: "https://www.bing.com/sa/simg/favicon-2x.ico",
              id: -1,
              title: "bing",
              url: "http://www.bing.com",
            },
          ],
        },
      ],
      search_item: "",
    };

    // State init, shouldn't use setState method
    this.state = this.emptyState;
  }

  // Fetch local saved history when App is rendered for the first time
  async componentDidMount() {
    // grab tabs information from local storage, set them in the state,
    // finally they will be shown them in the popup page
    if (chrome && chrome.storage) {
      chrome.storage.local.get([APP_STATE_KEY], (data) => {
        if (data[APP_STATE_KEY]) {
          this.setState(data.state);
        } else {
          chrome.storage.local.set({ [APP_STATE_KEY]: this.emptyState });
        }
      });
    } else {
      this.setState(this.testState);
    }
  }

  // callback to save tabs in the current active window
  handleSaveTabs = () => {
    let title = defaultTTabGroupTitle();

    let m = new Map<Number, TTabGroup>(); // tab group id ==> TTabGroup
    let now = new Date().getTime();

    chrome &&
      chrome.tabGroups &&
      chrome.tabGroups.query(
        {
          windowId: chrome.windows.WINDOW_ID_CURRENT,
        },
        (tgs: chrome.tabGroups.TabGroup[]) => {
          tgs.forEach((tg: chrome.tabGroups.TabGroup) => {
            let ttabs: TTab[] = [];
            chrome.tabs.query(
              {
                windowId: tg.windowId,
                groupId: tg.id,
              },
              (tabs: chrome.tabs.Tab[]) => {
                tabs.forEach((tab: chrome.tabs.Tab) => {
                  // Collect tab information, url is required
                  tab.url &&
                    ttabs.push({
                      fav_icon_url: tab.favIconUrl,
                      id: tab.id,
                      title: tab.title || "",
                      url: tab.url,
                    });
                });

                let created_at = now;
                let target = this.state.ttab_groups.find(
                  (group) => group.title === (tg.title || "")
                );
                target && (created_at = target.created_at);

                m.set(tg.id, {
                  id: tg.id,
                  collapsed: true, // collapse tab group by default
                  color: tg.color,
                  title: tg.title || "",
                  tabs: ttabs,
                  created_at: created_at,
                  updated_at: now,
                });
              }
            );
          });

          // ungrouped tabs
          // tab group id : -1
          chrome &&
            chrome.tabs &&
            chrome.tabs.query(
              // grab tabs in the current window
              {
                currentWindow: true,
                groupId: -1,
              },
              (tabs: chrome.tabs.Tab[]) => {
                let ttabs: TTab[] = [];
                tabs.forEach((tab: chrome.tabs.Tab) => {
                  tab.url &&
                    ttabs.push({
                      id: tab.id,
                      title: tab.title || "",
                      fav_icon_url: tab.favIconUrl,
                      url: tab.url,
                    });
                });
                tabs.length &&
                  m.set(-1, {
                    id: -1,
                    collapsed: true,
                    color: "grey",
                    title: title,
                    tabs: ttabs,
                    created_at: now,
                    updated_at: now,
                  });

                let tgsWaitingForSaving: TTabGroup[] = [];
                m.forEach((v) => {
                  tgsWaitingForSaving.push(v);
                });

                // Update chrome local storage
                chrome.storage.local.get(APP_STATE_KEY, (data) => {
                  chrome.storage.local.set(
                    {
                      [APP_STATE_KEY]: {
                        ttab_groups: [
                          ...tgsWaitingForSaving,
                          // tab group with the same title will be override
                          ...data[APP_STATE_KEY].ttab_groups.filter(
                            (group: TTabGroup) =>
                              !tgsWaitingForSaving
                                .map((tg) => tg.title)
                                .includes(group.title)
                          ),
                        ],
                      },
                    },
                    () => {
                      // obviate the error 'document is not defined'
                      // when saving tabs by shortcut
                      if (typeof document !== "undefined") {
                        message.info("successfully saved", 0.5);
                      }
                    }
                  );
                });

                // Update App's state
                this.setState((state, _props) => {
                  return {
                    ttab_groups: [
                      ...tgsWaitingForSaving,
                      // tab group with the same title will be override
                      ...state.ttab_groups.filter(
                        (group: TTabGroup) =>
                          !tgsWaitingForSaving
                            .map((tg) => tg.title)
                            .includes(group.title)
                      ),
                    ],
                  };
                });
              }
            );
        }
      );
  };

  // callback to clear all tab groups saved
  handleClear = () => {
    chrome &&
      chrome.storage &&
      chrome.storage.local.set({ [APP_STATE_KEY]: { ttab_groups: [] } }); // clear() is not used here

    this.setState(this.emptyState);
  };

  // callback to restore tabs in a saved tab group
  handleRestoreTabGroup(tgTitle: string) {
    const tgWaitingForRestore = this.state.ttab_groups.find(
      (tg) => tg.title === tgTitle
    );

    if (!tgWaitingForRestore || !tgWaitingForRestore.tabs.length) return;

    chrome.windows.create((wd) => {
      if (wd) {
        tgWaitingForRestore.tabs.forEach((tab) => {
          chrome.tabs.create({ url: tab.url, windowId: wd.id }, (tab) =>
            console.log(tab.id)
          );
        });

        chrome.tabs.query(
          {
            url: "chrome://newtab/",
            windowId: wd.id,
          },
          (tabs) => {
            // close unnecessary the default new tab
            tabs.forEach((tab) => {
              if (tab && tab.id) {
                chrome.tabs.remove(tab.id);
              }
            });

            if (tgWaitingForRestore.id === -1) {
              // ungrouped tabs
              return;
            }

            // Create a new tab group, add newly created tabs into it
            chrome.tabs.query({ windowId: wd.id }, (tabs) => {
              let tabIds: number[] = [];
              tabs.forEach((tab) => {
                tab.id && tabIds.push(tab.id);
              });

              chrome.tabs.group(
                { tabIds: tabIds, createProperties: { windowId: wd.id } },
                (groupId) => {
                  chrome.tabGroups.update(groupId, {
                    color:
                      tgWaitingForRestore.color as chrome.tabGroups.ColorEnum,
                    title: tgWaitingForRestore.title,
                  });
                }
              );
            });
          }
        );
      }
    });

    // Update restored tab group's updated_at, also it'll rank the first
    let tgRestored = tgWaitingForRestore;

    chrome.storage.local.get(APP_STATE_KEY, (data) => {
      chrome.storage.local.set({
        [APP_STATE_KEY]: {
          ttab_groups: [
            tgRestored,
            ...data[APP_STATE_KEY].ttab_groups.filter(
              (group: TTabGroup) => group.title !== tgRestored.title
            ),
          ],
        },
      });
    });

    this.setState((state, _props) => {
      return {
        ttab_groups: [
          tgRestored,
          ...state.ttab_groups.filter(
            (group: TTabGroup) => group.title !== tgRestored.title
          ),
        ],
      };
    });
  }

  // callback to delete specified tab group
  handleDeleteTabGroup(tgTitle: string) {
    // 1. Clear records from chrome local storage
    chrome &&
      chrome.storage &&
      chrome.storage.local.get(APP_STATE_KEY, (data) => {
        chrome.storage.local.set({
          [APP_STATE_KEY]: {
            ttab_groups: [
              ...data[APP_STATE_KEY].ttab_groups.filter(
                (tg: TTabGroup) => tg.title !== tgTitle
              ),
            ],
          },
        });
      });

    // 2. Clear records from App's State
    this.setState((state, _props) => ({
      ttab_groups: state.ttab_groups.filter((tg) => tg.title !== tgTitle),
    }));
  }

  handleCollapse(tgTitle: string, e: any) {
    console.log(tgTitle);
    console.log(e);
  }

  handleSearch = (e: { target: { value: string } }) => {
    this.setState({
      search_item: e.target.value,
    });
  };

  render(): react.ReactNode {
    let { ttab_groups, search_item: keyword } = this.state;

    if (keyword) {
      ttab_groups = ttab_groups.filter((tg) =>
        tg.title.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())
      );
    }

    const CollapseBtn = (props: any) => {
      let tgTitle = props.title;

      let collapseTabGroup = () => {
        let i = ttab_groups.findIndex((tg) => tg.title === tgTitle);
        ttab_groups[i].collapsed = !ttab_groups[i].collapsed;
        this.setState({ ttab_groups: ttab_groups });
      };

      if (props.collapsed) {
        return (
          <Button
            icon={<RightOutlined />}
            onClick={() => {
              collapseTabGroup();
            }}
            size="small"
          ></Button>
        );
      } else {
        return (
          <Button
            icon={<DownOutlined />}
            onClick={() => {
              collapseTabGroup();
            }}
            size="small"
          ></Button>
        );
      }
    };

    return (
      <div className="App">
        {/* Save & Clear Button */}
        <br />
        <Row justify="space-around">
          <Col span={8}>
            <Tooltip
              title="Save tabs within current window"
              color={tooltipColor}
              mouseEnterDelay={tooltipPopupDelay}
            >
              <Button
                block
                icon={<SaveOutlined />}
                onClick={this.handleSaveTabs}
              >
                SAVE Tabs
              </Button>
            </Tooltip>
          </Col>
          <Col span={8}>
            <Popconfirm
              placement="bottomLeft"
              title={"Sure to clear all history?"}
              onConfirm={this.handleClear}
              okText="Yes"
              cancelText="No"
            >
              <Tooltip
                title="Clear all saved tab groups"
                color={tooltipColor}
                mouseEnterDelay={tooltipPopupDelay}
              >
                <Button danger block icon={<DeleteOutlined />}>
                  Clear All
                </Button>
              </Tooltip>
            </Popconfirm>
          </Col>
        </Row>

        <Input
          type="text"
          style={{ width: "450px", margin: "10px 0px 10px 20px" }}
          onChange={this.handleSearch}
          placeholder="search in the tab group title"
        ></Input>

        {/* TTabGroup display */}
        {ttab_groups.map((tg, i) => {
          const tgKey = `tg-${i + 1}`;
          return (
            // TTabGroup
            <Tabs
              type="card"
              tabPosition="left"
              tabBarExtraContent={{
                left: (
                  <div className="tab-group-title-wrapper">
                    <Row align="middle">
                      <Col span="6">
                        <Row justify="start">
                          <Tooltip
                            title={`saved at ${new Date(
                              tg.created_at
                            ).toLocaleString()}`}
                            color={tooltipColor}
                            mouseEnterDelay={tooltipPopupDelay}
                          >
                            <Tag color={tg.color}> {tg.title}</Tag>
                          </Tooltip>
                        </Row>
                      </Col>
                      <Col span="18">
                        <Row justify="end">
                          <CollapseBtn
                            title={tg.title}
                            collapsed={tg.collapsed}
                          />
                          <Button
                            icon={<RollbackOutlined />}
                            size="small"
                            onClick={this.handleRestoreTabGroup.bind(
                              this,
                              tg.title
                            )}
                          >
                            Restore
                          </Button>
                          <Button
                            icon={<DeleteOutlined />}
                            size="small"
                            onClick={this.handleDeleteTabGroup.bind(
                              this,
                              tg.title
                            )}
                          >
                            Delete
                          </Button>
                        </Row>
                      </Col>
                    </Row>
                  </div>
                ),
              }}
            >
              {!tg.collapsed &&
                tg.tabs.map((tab, idx) => (
                  <TabPane
                    tab={
                      <div className="tab-list-wrapper">
                        <Row>
                          <Col span="1" style={{ marginTop: "3px" }}>
                            <Row justify="start">
                              <Image width={16} src={tab.fav_icon_url} />
                            </Row>
                          </Col>
                          <Col offset={1} span="22">
                            <Row justify="start">
                              <Tooltip
                                title={trimQueryAndHash(tab.url)}
                                color={tooltipColor}
                                mouseEnterDelay={tooltipPopupDelay}
                              >
                                <a href={tab.url}>{tab.title}</a>
                              </Tooltip>
                            </Row>
                          </Col>
                        </Row>
                      </div>
                    }
                    key={`${tgKey}-tab-${idx + 1}`}
                  ></TabPane>
                ))}
            </Tabs>
          );
        })}
      </div>
    );
  }
}

function trimQueryAndHash(url: string): string {
  const u = new URL(url);
  return u.toString().replace(u.hash, "").replace(u.search, "");
}

function defaultTTabGroupTitle(): string {
  return new Date().toLocaleString();
}

export default App;
