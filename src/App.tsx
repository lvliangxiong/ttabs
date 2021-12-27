import react, { Component } from "react";
import {
  Button,
  Menu,
  Tooltip,
  Row,
  Col,
  Popconfirm,
  Modal,
  Input,
  List,
} from "antd";
import {
  BookOutlined,
  RollbackOutlined,
  DeleteOutlined,
  LinkOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { grey } from "@ant-design/colors";
import "antd/dist/antd.min.css";
import "./App.less";
import React from "react";

const { SubMenu } = Menu;

interface IState {
  openedWorkSpaceKeys: Array<string>;
  workspaces: Array<WorkSpace>;
  customWorkspaceNameModalVisibility: boolean;
}

interface WorkSpace {
  name: string;
  tabs: Array<Tab>;
  created_at: Number;
}

interface Tab {
  name: string;
  url: string;
}

interface IProps {}

class App extends Component<IProps, IState> {
  workspaceNameInputRef: react.RefObject<Input>;

  constructor(props: IProps) {
    super(props);

    this.workspaceNameInputRef = React.createRef();

    // State init, shouldn't use setState method
    this.state = {
      openedWorkSpaceKeys: [],
      workspaces: [],
      customWorkspaceNameModalVisibility: false,
    };
  }

  // Fetch local saved history when App is rendered for t he first time
  async componentDidMount() {
    // grab tabs information from local storage, set them in the state,
    // finally they will be shown them in the popup page
    if (chrome && chrome.storage) {
      // Normal circumstance
      chrome.storage.local.get(["workspaces"], (data) => {
        if (data.workspaces) {
          this.setState({
            openedWorkSpaceKeys: ["workspace 1"],
            workspaces: data.workspaces,
          });
        } else {
          chrome.storage.local.set({ workspaces: [] });
        }
      });
    } else {
      // For development
      this.setState({
        openedWorkSpaceKeys: ["workspace 1"],
        workspaces: [
          {
            name: "workspace 1",
            created_at: Date.now(),
            tabs: [
              {
                name: "test link 1",
                url: "http://github.com/lvliangxiong",
              },
              {
                name: "test link 2",
                url: "http://github.com/lvliangxiong",
              },
              {
                name: "test link 3",
                url: "http://github.com/lvliangxiong",
              },
            ],
          },
          {
            name: "workspace 2",
            created_at: Date.now() - 100,
            tabs: [
              {
                name: "test link 1",
                url: "http://github.com/lvliangxiong",
              },
              {
                name: "test link 2",
                url: "http://github.com/lvliangxiong",
              },
              {
                name: "test link 3",
                url: "http://github.com/lvliangxiong",
              },
            ],
          },
        ],
      });
    }
  }

  // callback to clear all workspaces saved
  handleClear = () => {
    chrome && chrome.storage && chrome.storage.local.clear();

    this.setState({
      workspaces: [],
      openedWorkSpaceKeys: [],
    });
  };

  // callback to save tabs in the current active window, also close the modal
  handleSaveTabs = () => {
    let name = this.defaultWorkspaceName();
    if (
      this.workspaceNameInputRef.current &&
      this.workspaceNameInputRef.current.state.value
    ) {
      name = this.workspaceNameInputRef.current.state.value;
    }

    // query tabs information, then save them to the local storage
    chrome &&
      chrome.tabs &&
      chrome.tabs.query(
        // grab tabs in the current window
        {
          currentWindow: true,
        },
        (tabs) => {
          // 1. init a workspace for current window's tabs
          const w: WorkSpace = {
            name: name,
            tabs: [],
            created_at: Date.now(),
          };

          // 2. tabs information
          tabs.forEach((tab) => {
            if (tab.id) {
              // tabs should have url at least
              if (tab.url) {
                const tt: Tab = {
                  name: "", // default to empty string
                  url: tab.url,
                };
                if (tab.title) {
                  tt.name = tab.title;
                }
                w.tabs.push(tt);
              }
            }
          });

          // 1. Update chrome local storage
          chrome.storage.local.get("workspaces", (data) => {
            chrome.storage.local.set({
              workspaces: [w, ...data.workspaces],
            });
          });

          // 2. Update App's state
          this.setState((state, _props) => ({
            openedWorkSpaceKeys: ["workspace 1"], // change opened menu to the newest created workspace
            workspaces: [w, ...state.workspaces],
            customWorkspaceNameModalVisibility: false, // close and reset the modal if no error occurs
          }));

          // 1 and 2 are independent
        }
      );
  };

  // callback to restore tabs in a saved workspace
  handleRestoreWorkspace(workspaceName: string, workspaceCreatedAt: Number) {
    const targetWorkspace = this.state.workspaces.find(
      (workspace) =>
        workspace.name === workspaceName &&
        workspace.created_at === workspaceCreatedAt
    );

    // Open these saved Tabs in a separate window
    targetWorkspace &&
      targetWorkspace.tabs.length &&
      chrome &&
      chrome.storage &&
      chrome.windows.create((wd) => {
        if (wd) {
          targetWorkspace.tabs.forEach((tab) => {
            chrome.tabs.create({ url: tab.url, windowId: wd.id });
          });
          // close unnecessary the default new tab
          chrome.tabs.query(
            {
              url: "chrome://newtab/",
            },
            (tabs) => {
              tabs.forEach((tab) => {
                if (tab && tab.id) {
                  chrome.tabs.remove(tab.id);
                }
              });
            }
          );
        }
      });
  }

  // callback to delete specified workspace
  handleDeleteWorkspace(workspaceName: string, workspaceCreatedAt: Number) {
    // 1. Clear records from chrome local storage
    chrome &&
      chrome.storage &&
      chrome.storage.local.get("workspaces", (data) => {
        chrome.storage.local.set({
          workspaces: [
            ...data.workspaces.filter(
              (workspace: WorkSpace) =>
                workspace.name !== workspaceName ||
                workspace.created_at !== workspaceCreatedAt
            ),
          ],
        });
      });

    // 2. Clear records from App's State
    this.setState((state, _props) => ({
      workspaces: state.workspaces.filter(
        (workspace) =>
          workspace.name !== workspaceName ||
          workspace.created_at !== workspaceCreatedAt
      ),
      openedWorkSpaceKeys: ["workspace 1"],
    }));
  }

  // callback to handle menu opened or closed, only one menu opened at most guaranteed
  onOpenChange = (keys: string[]) => {
    const allSubmenuKeys = this.state.workspaces.map(
      (_workspace, i) => "workspace " + (i + 1)
    );

    // 筛选出关闭菜单事件的对应的菜单的 key
    const menuWaitForOpen_key = keys.find(
      (key) => this.state.openedWorkSpaceKeys.indexOf(key) === -1
    );
    if (
      menuWaitForOpen_key &&
      allSubmenuKeys.indexOf(menuWaitForOpen_key) !== -1
    ) {
      // 只打开该菜单
      this.setState({
        openedWorkSpaceKeys: [menuWaitForOpen_key],
      });
    } else {
      // 关闭原菜单
      this.setState({
        openedWorkSpaceKeys: [],
      });
    }
  };

  defaultWorkspaceName(): string {
    return "saved at " + new Date().toLocaleString();
  }

  setVisibilityOfCustomWorkspaceNameModal(visibility: boolean): void {
    this.setState((state, _props) => ({
      customWorkspaceNameModalVisibility: visibility,
    }));
  }

  render(): react.ReactNode {
    const {
      workspaces,
      openedWorkSpaceKeys,
      customWorkspaceNameModalVisibility,
    } = this.state;

    return (
      <div className="App">
        {/* Save & Clear Button */}
        <br />
        <Row justify="space-around">
          <Col span={8}>
            <Modal
              title="Customize your workspace name:"
              centered
              visible={customWorkspaceNameModalVisibility}
              onOk={this.handleSaveTabs}
              onCancel={() =>
                this.setVisibilityOfCustomWorkspaceNameModal(false)
              }
              width={500}
            >
              <Input
                ref={this.workspaceNameInputRef}
                placeholder={this.defaultWorkspaceName()}
              />
            </Modal>
            <Tooltip title="Save tabs in this window" color={grey[2]}>
              <Button
                block
                className="btn-workspace-op"
                icon={<SaveOutlined />}
                onClick={() =>
                  this.setVisibilityOfCustomWorkspaceNameModal(true)
                }
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
              <Button
                danger
                block
                className="btn-workspace-op"
                icon={<DeleteOutlined />}
              >
                <Tooltip title="Clear all data" color={grey[2]}>
                  Clear All
                </Tooltip>
              </Button>
            </Popconfirm>
          </Col>
        </Row>
        <br />

        {/* Workspace display */}
        <Menu
          openKeys={openedWorkSpaceKeys}
          onOpenChange={this.onOpenChange}
          inlineIndent={18}
          mode="inline" // vertical/inline
          theme="light" // light/dark
        >
          {workspaces.map((workspace, i) => {
            const workspaceKey: string = "workspace " + (i + 1);
            // Workspace
            return (
              <SubMenu
                key={workspaceKey}
                title={
                  <Tooltip
                    title={
                      "saved at " +
                      new Date(workspace.created_at.valueOf()).toLocaleString()
                    }
                    color={grey[2]}
                  >
                    {workspace.name}
                  </Tooltip>
                }
                icon={<BookOutlined />}
              >
                {/* Operation Buttons */}
                <Row justify="space-around">
                  <Col span={10}>
                    <Button
                      className="btn-workspace-op"
                      icon={<RollbackOutlined />}
                      onClick={this.handleRestoreWorkspace.bind(
                        this,
                        workspace.name,
                        workspace.created_at
                      )}
                    >
                      Restore
                    </Button>
                  </Col>
                  <Col span={10}>
                    <Button
                      className="btn-workspace-op"
                      icon={<DeleteOutlined />}
                      onClick={this.handleDeleteWorkspace.bind(
                        this,
                        workspace.name,
                        workspace.created_at
                      )}
                    >
                      Delete
                    </Button>
                  </Col>
                </Row>
                {/* Tabs */}
                <List
                  itemLayout="horizontal"
                  dataSource={workspace.tabs}
                  style={{ marginLeft: "30px" }}
                  renderItem={(tab) => (
                    <List.Item>
                      <LinkOutlined style={{ marginRight: "12px" }} />
                      <List.Item.Meta
                        title={
                          <Tooltip
                            title={trimQueryAndHash(tab.url)}
                            color={grey[2]}
                          >
                            <a href={tab.url}>{tab.name}</a>
                          </Tooltip>
                        }
                      />
                    </List.Item>
                  )}
                />
              </SubMenu>
            );
          })}
        </Menu>
      </div>
    );
  }
}

function trimQueryAndHash(url: string): string {
  const u = new URL(url);
  return u.toString().replace(u.hash, "").replace(u.search, "");
}

export default App;
