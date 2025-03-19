import React from 'react';
import { Card, Table, Checkbox, Tag, Space, Button, Modal, Typography, message } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { SpecialElectrode } from '../types';

interface SpecialElectrodesListProps {
  specialElectrodes: SpecialElectrode[];
  selectedSpecialElectrodes: Set<number>;
  selectedBElectrodeIndex: number | null;
  selectedNElectrodeIndex: number | null;
  onElectrodeSelect: (index: number, checked: boolean) => void;
  onElectrodesDelete: (indexesToDelete: number[]) => void;
}

// 确保组件声明正确
const SpecialElectrodesList: React.FC<SpecialElectrodesListProps> = ({
  specialElectrodes,
  selectedSpecialElectrodes,
  selectedBElectrodeIndex,
  selectedNElectrodeIndex,
  onElectrodeSelect,
  onElectrodesDelete,
}) => {
  if (specialElectrodes.length === 0) {
    return null;
  }

  return (
    <Card 
      title="特殊电极 (B/N)" 
      style={{ marginBottom: 16 }}
      extra={
        <Typography.Text type="secondary">
          请选择一个B极和一个N极用于导出数据
        </Typography.Text>
      }
    >
      <Table
        dataSource={specialElectrodes.map((electrode, idx) => ({
          key: idx,
          type: electrode.type,
          x: electrode.position[0],
          y: electrode.position[1],
          z: electrode.position[2],
          source: electrode.fileSource
        }))}
        columns={[
          {
            title: '选择',
            dataIndex: 'key',
            key: 'select',
            width: 60,
            render: (key: number, record: any) => (
              <Checkbox
                checked={selectedSpecialElectrodes.has(key)}
                onChange={(e) => onElectrodeSelect(key, e.target.checked)}
              />
            )
          },
          { 
            title: '类型', 
            dataIndex: 'type', 
            key: 'type',
            render: (type: string, record: any) => (
              <>
                {type}
                {record.key === selectedBElectrodeIndex && type === 'B' && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>已选择</Tag>
                )}
                {record.key === selectedNElectrodeIndex && type === 'N' && (
                  <Tag color="green" style={{ marginLeft: 8 }}>已选择</Tag>
                )}
              </>
            )
          },
          { title: 'X(m)', dataIndex: 'x', key: 'x' },
          { title: 'Y(m)', dataIndex: 'y', key: 'y' },
          { title: 'Z(m)', dataIndex: 'z', key: 'z' },
          { title: '来源', dataIndex: 'source', key: 'source' },
        ]}
        pagination={false}
        size="small"
      />
      <Space style={{ marginTop: 16 }}>
        <Button 
          danger 
          icon={<DeleteOutlined />}
          onClick={() => {
            if (selectedSpecialElectrodes.size === 0) {
              message.warning('请先选择要删除的电极');
              return;
            }
            
            Modal.confirm({
              title: '确认删除',
              content: `确定要删除选中的 ${selectedSpecialElectrodes.size} 个特殊电极吗？`,
              okText: '删除',
              okType: 'danger',
              cancelText: '取消',
              onOk: () => {
                const indexesToDelete = Array.from(selectedSpecialElectrodes);
                onElectrodesDelete(indexesToDelete);
              }
            });
          }}
          disabled={selectedSpecialElectrodes.size === 0}
        >
          删除选中电极
        </Button>
      </Space>
    </Card>
  );
};

// 明确导出默认组件
export default SpecialElectrodesList;