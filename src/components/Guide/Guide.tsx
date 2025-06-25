import React from 'react';
import { Layout, Typography, Timeline } from 'antd';
import {
  ToolOutlined,
  SearchOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import styles from './Guide.less';

const { Title, Paragraph } = Typography;

interface Props {
  name: string;
}

const updates = [
  {
    date: '2025-06-25',
    title: '导出微震事件支持大地坐标转换',
    description: '在项目管理处增加参考点，可批量导出坐标转换后的微震事件。',
  },
    {
    date: '2025-06-20',
    title: '平面分布图支持绘制采线',
    description: '填写采线坐标组，可在平面分布图中绘制回采线。',
  },
];

const Guide: React.FC<Props> = ({ name }) => {
  return (
    <Layout className={styles.guideFullscreen}>
      <div className={styles.cardContent}>
        <Title level={2}>欢迎使用 <span style={{ color: '#1677ff' }}>{name}</span>！</Title>
        <Paragraph>持续更新中，以下是最近的一些功能改进与更新：</Paragraph>

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
