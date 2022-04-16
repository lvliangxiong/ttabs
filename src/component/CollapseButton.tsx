import { Button } from "antd";
import { RightOutlined, DownOutlined } from "@ant-design/icons";

interface CollapseBtnProps {
  id: number;
  collapsed: boolean;

  onCollapseChange?: (id: number, collapsed: boolean) => void;
}

export function CollapseButton({
  id,
  collapsed,
  onCollapseChange,
}: CollapseBtnProps) {
  return collapsed ? (
    <Button
      icon={<RightOutlined />}
      onClick={() => {
        onCollapseChange && onCollapseChange(id, false);
      }}
      size="small"
    ></Button>
  ) : (
    <Button
      icon={<DownOutlined />}
      onClick={() => {
        onCollapseChange && onCollapseChange(id, true);
      }}
      size="small"
    ></Button>
  );
}
