import { useState } from "react";
import { Input, Tag } from "antd";

interface EditableTTabGroupTitleProps {
  id: number;
  title: string | undefined;
  color: string;

  onTitleChange?: (id: number, title: string) => void;
}

export function EditableTTabGroupTitle({
  id,
  title,
  color,

  onTitleChange: onTitleChangeConfirm,
}: EditableTTabGroupTitleProps) {
  const [inEditState, setInEditState] = useState(false);

  const handleTitleChangeConfirm = (e: any) => {
    if (e.target.value === "") {
      setInEditState(true);
      e.target.value = title;
      return;
    }

    onTitleChangeConfirm && onTitleChangeConfirm(id, e.target.value);
    setInEditState(false);
  };

  return inEditState ? (
    <Input
      defaultValue={title}
      size="small"
      onBlur={handleTitleChangeConfirm}
      onPressEnter={handleTitleChangeConfirm}
    />
  ) : (
    <Tag color={color} style={{ userSelect: "none" }}>
      <span
        onDoubleClick={(e) => {
          setInEditState(true);
        }}
      >
        {title}
      </span>
    </Tag>
  );
}
