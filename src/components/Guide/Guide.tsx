import React, { useState } from 'react';
import { Layout, Typography, Timeline } from 'antd';
import { ScheduleOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
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
    date: '2026-03-26',
    title: 'V2.3 内容更新',
    description: [
      '分层统计报表新增最大发育高度、深度统计',
      '修复层位数据丢失、图层显示及时间轴相关问题',
      '优化层位管理交互体验',
    ],
  },
  {
    date: '2026-02-06',
    title: 'V2.2 内容更新',
    description: ['优化采线功能，可直接在平面图中拾点构造采线','模型展示页面支持事件分层筛选','空间模型增加分层统计报表功能'],
  },
  {
    date: '2026-02-03',
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
  const [expanded, setExpanded] = useState(false);
  const showCount = 2; // 默认显示的版本数量
  const hasMore = updates.length > showCount;
  const displayedUpdates = expanded ? updates : updates.slice(0, showCount);

  return (
    <div className={styles.container}>
      <div className={styles.cardContent}>
        <Title level={2}>
          欢迎使用 <span style={{ color: '#1677ff' }}>{name}</span>
        </Title>
        <Paragraph>以下为近期功能更新：</Paragraph>

        <Timeline mode="left" className={styles.timeline}>
          {displayedUpdates.map((item, idx) => (
            <Timeline.Item 
              label={item.date} 
              key={idx}
              color={idx === 0 ? 'blue' : 'gray'}
              style={{ paddingBottom: 24 }}
            >
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

        {hasMore && (
          <div style={{ textAlign: 'center', marginTop: -16 }}>
            <span 
              onClick={() => setExpanded(!expanded)} 
              style={{ 
                color: '#1677ff', 
                cursor: 'pointer',
                fontSize: 14,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '8px 16px',
                borderRadius: 4,
                transition: 'background 0.3s'
              }}
              className={styles.expandBtn}
            >
              {expanded ? (
                <>收起历史版本 <UpOutlined /></>
              ) : (
                <>查看更早的历史版本 <DownOutlined /></>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Guide;
