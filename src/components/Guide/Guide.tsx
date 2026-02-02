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
  description: string | string[];
  icon?: React.ReactNode;
}

const updates: UpdateItem[] = [
  {
    date: '2026-01-30',
    title: 'V2.1 内容更新',
    description: ['层位管理新增柱状图预览', '指北针、模型展示效果优化','批量导出事件支持标注事件层位'],
  },
  {
    date: '2026-01-28',
    title: 'V2.0 内容更新',
    description: [
      '支持页面多开，提升多任务处理效率',
      '模型展示支持上传 CSV 文件，支持更多点位数据构建精细化模型',
      '层位管理新增“分析分层”，支持作为预设层位用于微震事件划分',
      '全新账号权限体系，支持项目级数据隔离与权限分级管理',
    ],
  },
];

const Guide: React.FC<Props> = ({ name }) => {
  return (
    <div className={styles.container}>
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
              <div style={{ marginLeft: 14, color: '#555', marginTop: 8 }}>
                {Array.isArray(item.description) ? (
                  <ul style={{ paddingLeft: 16, margin: 0 }}>
                    {item.description.map((desc, i) => (
                      <li key={i} style={{ marginBottom: 4 }}>{desc}</li>
                    ))}
                  </ul>
                ) : (
                  item.description
                )}
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </div>
    </div>
  );
};

export default Guide;
