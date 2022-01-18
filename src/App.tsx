import react, { Component } from "react";
import { Button, Tooltip, Row, Col, Popconfirm, Input, Tag, Image } from "antd";
import {
  RollbackOutlined,
  DeleteOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { grey } from "@ant-design/colors";
import "antd/dist/antd.min.css";
import "./App.less";
import React from "react";
import { Tabs } from "antd";

const { TabPane } = Tabs;

const tooltipColor = grey[2];
const tooltipPopupDelay = 0.5;

interface IState {
  ttab_groups: TTabGroup[];
}

interface TTabGroup {
  id: number;
  title: string;
  color: string;
  collapsed: boolean;
  tabs: TTab[];
  created_at: number;
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
  ttabGroupTitleInputRef: react.RefObject<Input>;

  emptyState: IState;

  constructor(props: IProps) {
    super(props);

    this.ttabGroupTitleInputRef = React.createRef();

    this.emptyState = {
      ttab_groups: [],
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
    }
  }

  // callback to save tabs in the current active window
  handleSaveTabs = () => {
    let title = defaultTTabGroupTitle();
    this.ttabGroupTitleInputRef.current &&
      this.ttabGroupTitleInputRef.current.state.value &&
      (title = this.ttabGroupTitleInputRef.current.state.value);

    let m = new Map<Number, TTabGroup>(); // tab group id ==> TTabGroup

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
                m.set(tg.id, {
                  id: tg.id,
                  collapsed: tg.collapsed,
                  color: tg.color,
                  title: tg.title || "",
                  tabs: ttabs,
                  created_at: new Date().getTime(),
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
                    created_at: new Date().getTime(),
                  });

                let tgsWaitingForSaving: TTabGroup[] = [];
                m.forEach((v) => {
                  tgsWaitingForSaving.push(v);
                });

                // Update chrome local storage
                chrome.storage.local.get(APP_STATE_KEY, (data) => {
                  chrome.storage.local.set({
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
                  });
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
                    collapsed: false,
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

  render(): react.ReactNode {
    const { ttab_groups } = this.state;

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
        <br />

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
              {tg.tabs.map((tab, idx) => (
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
