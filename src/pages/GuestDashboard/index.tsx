import React, { useMemo, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Col, Row, Space, Statistic, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import styles from './index.less';

const PROJECT_NAME = '透明地质监测项目';

const GuestDashboard: React.FC = () => {
  const [lastRefreshTime, setLastRefreshTime] = useState(dayjs());

  const timeRangeText = useMemo(() => {
    const end = dayjs();
    const start = end.subtract(7, 'day');
    return `${start.format('YYYY-MM-DD HH:mm')} ~ ${end.format('YYYY-MM-DD HH:mm')}`;
  }, [lastRefreshTime]);

  return (
    <PageContainer ghost className={styles.guestDashboard}>
      <Card className={styles.toolbar}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Space direction="vertical" size={4}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {PROJECT_NAME}
              </Typography.Title>
              <Space size={8}>
                <Tag color="blue">项目大屏</Tag>
                <Typography.Text type="secondary">时间范围：{timeRangeText}</Typography.Text>
              </Space>
            </Space>
          </Col>
          <Col>
            <Button type="primary" onClick={() => setLastRefreshTime(dayjs())}>
              刷新
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card className={styles.boardCard}>
            <Statistic title="累计事件数" value={1284} />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className={styles.boardCard}>
            <Statistic title="在线设备" value={57} suffix="台" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className={styles.boardCard}>
            <Statistic
              title="最后刷新"
              value={lastRefreshTime.format('YYYY-MM-DD HH:mm:ss')}
              valueStyle={{ fontSize: 18 }}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default GuestDashboard;
