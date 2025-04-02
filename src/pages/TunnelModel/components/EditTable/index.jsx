import React, { useState } from "react";
import {
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Table,
  Typography,
  Select,
  ColorPicker,
  Space,
} from "antd";

const EditableCell = ({
  editing,
  dataIndex,
  title,
  inputType,
  record,
  index,
  children,
  ...restProps
}) => {
  let inputNode;
  switch (inputType) {
    case "number":
      inputNode = <InputNumber />;
      break;
    case "type":
      {
        inputNode = (
          <Select
            options={[
              { value: 1, label: "平面体" },
              { value: 2, label: "曲面体" },
            ]}
          />
        );
      }
      break;
    case "color":
      inputNode = <ColorPicker defaultFormat="rgb" format="rgb" />;
      break;
    default:
      inputNode = <Input />;
  }
  return (
    <td {...restProps}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{
            margin: 0,
          }}
          rules={[
            {
              required: true,
              message: `${title}不能为空!`,
            },
          ]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        children
      )}
    </td>
  );
};

const EditTable = ({ data, form, setData }) => {
  const [editingKey, setEditingKey] = useState("");
  const isEditing = (record) => record.key === editingKey;
  const edit = (record) => {
    form.setFieldsValue({
      name: "",
      age: "",
      address: "",
      ...record,
    });
    setEditingKey(record.key);
  };
  const cancel = () => {
    setEditingKey("");
  };
  const save = async (key) => {
    try {
      const row = await form.validateFields();
      const toRgbColor =
        typeof row.color === "string" ? row.color : row.color.toRgbString();
      row.color = toRgbColor;
      const newData = [...data];
      const index = newData.findIndex((item) => key === item.key);
      if (index > -1) {
        const item = newData[index];
        newData.splice(index, 1, {
          ...item,
          ...row,
        });
        setData(newData);
        setEditingKey("");
      } else {
        newData.push(row);
        setData(newData);
        setEditingKey("");
      }
      console.log(newData, "newData");
    } catch (errInfo) {
      console.log("Validate Failed:", errInfo);
    }
  };
  const deleteRow = (key) => {
    const newData = [...data];
    const index = newData.findIndex((item) => key === item.key);
    if (index > -1) {
      newData.splice(index, 1);
      setData(newData);
    }
  };

  const columns = [
    {
      title: "X位置(m)",
      dataIndex: "x",
      inputType: "number",
      editable: true,
    },
    {
      title: "类型",
      dataIndex: "type",
      inputType: "type",
      editable: true,
      render: (_, record) => {
        let typeName = record.type === 1 ? "平面体" : "曲面体";
        return typeName;
      },
    },
    {
      title: "厚度(m)",
      dataIndex: "depth",
      inputType: "number",
      editable: true,
    },
    {
      title: "颜色",
      dataIndex: "color",
      inputType: "color",
      editable: true,
      render: (_, record) => (
        <ColorPicker
          value={record.color}
          disabled
          defaultFormat="rgb"
          format="rgb"
        />
      ),
    },
    {
      title: "操作",
      dataIndex: "operation",
      render: (_, record) => {
        const editable = isEditing(record);
        return editable ? (
          <span>
            <Typography.Link
              onClick={() => save(record.key)}
              style={{
                marginRight: 8,
              }}
            >
              保存
            </Typography.Link>
            <Popconfirm title="确定取消？" onConfirm={cancel}>
              <a>取消</a>
            </Popconfirm>
          </span>
        ) : (
          <Space>
            <Typography.Link
              disabled={editingKey !== ""}
              onClick={() => edit(record)}
            >
              编辑
            </Typography.Link>
            <Popconfirm
              title="确定删除？"
              onConfirm={() => deleteRow(record.key)}
            >
              <a disabled={editingKey !== ""}>删除</a>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const mergedColumns = columns.map((col) => {
    if (!col.editable) {
      return col;
    }
    return {
      ...col,
      onCell: (record) => ({
        record,
        inputType: col.inputType,
        dataIndex: col.dataIndex,
        title: col.title,
        editing: isEditing(record),
      }),
    };
  });

  return (
    <Form form={form} component={false}>
      <Table
        dataSource={data}
        components={{
          body: {
            cell: EditableCell,
          },
        }}
        columns={mergedColumns}
        rowClassName="editable-row"
        pagination={false}
        bordered
      />
    </Form>
  );
};

export default EditTable;
