import React from 'react';
import { Layout, Typography, Timeline } from 'antd';
import { ScheduleOutlined } from '@ant-design/icons';
import styles from './Guide.less';

const { Title, Paragraph } = Typography;

interface Props {
  name: string;
}

interface UpdateItem {
  date: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

const updates: UpdateItem[] = [
  {
    date: '2025-09-11',
    title: '事件模拟与导出时间优化',
    icon: <ScheduleOutlined />,
    description:
      '新增数据模拟功能；事件批量导出支持按项目设置自定义时间格式；关闭大地坐标不清空参考点。',
  },
  {
    date: '2025-06-25',
    title: '导出支持大地坐标转换',
    description: '项目管理新增参考点，可批量导出转换后坐标。',
  },
  {
    date: '2025-06-20',
    title: '平面分布图支持采线',
    description: '填写采线坐标组，在平面分布图绘制回采线。',
  },
];

const Guide: React.FC<Props> = ({ name }) => {
  return (
    <Layout className={styles.guideFullscreen}>
      <div className={styles.cardContent}>
        <Title level={2}>
          欢迎使用 <span style={{ color: '#1677ff' }}>{name}</span>
        </Title>
        <Paragraph>以下为近期功能更新：</Paragraph>

        <Timeline mode="left" className={styles.timeline}>
          {updates.map((item, idx) => (
            <Timeline.Item label={item.date} key={idx}>
              <strong style={{ fontSize: 16 }}>
                {item.icon} {item.title}
              </strong>
              <div style={{ marginLeft: 14, color: '#555' }}>{item.description}</div>
            </Timeline.Item>
          ))}
        </Timeline>
      </div>
    </Layout>
  );
};

export default Guide;
