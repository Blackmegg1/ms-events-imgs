import { getEventList } from '@/services/event/EventController';
import { getModelList } from '@/services/model/ModelController';
import { getActiveProject } from '@/services/project/ProjectController';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Card,
  Col,
  Empty,
  Input,
  List,
  Row,
  Spin,
  Statistic,
  message,
} from 'antd';
import React, { useEffect, useState } from 'react';

type ProjectItem = {
  id: number;
  name?: string;
};

type ModelItem = {
  model_id?: number;
  model_name?: string;
};

type EventItem = {
  event_id?: number;
  time?: string;
  magnitude?: number;
  energy?: number;
};

const GuestDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const [errorText, setErrorText] = useState<string>('');
  const [models, setModels] = useState<ModelItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  const extractProjectList = (response: any): ProjectItem[] => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.list)) return response.list;
    if (Array.isArray(response?.data)) return response.data;
    return [];
  };

  const loadDashboardData = async (lockedProjectId: number) => {
    const [modelRes, eventRes] = await Promise.all([
      getModelList({ project_id: lockedProjectId, current: 1, pageSize: 50 }),
      getEventList({ project_id: lockedProjectId, current: 1, pageSize: 20 }),
    ]);

    setModels(modelRes?.list || []);
    setEvents(eventRes?.list || []);
  };

  const initGuestProject = async () => {
    setLoading(true);
    setErrorText('');

    try {
      const response = await getActiveProject();
      const visibleProjects = extractProjectList(response);

      if (visibleProjects.length === 0) {
        setProjectId(null);
        setProjectName('');
        setModels([]);
        setEvents([]);
        setErrorText(
          '当前账号没有可访问的进行中项目，请联系管理员分配项目权限。',
        );
        return;
      }

      if (visibleProjects.length > 1) {
        message.warning('检测到多个可访问项目，已自动选择第一个项目。');
      }

      const selectedProject = visibleProjects[0];
      setProjectId(selectedProject.id);
      setProjectName(selectedProject.name || `项目 ${selectedProject.id}`);

      await loadDashboardData(selectedProject.id);
    } catch (error) {
      setProjectId(null);
      setProjectName('');
      setModels([]);
      setEvents([]);
      setErrorText('加载访客项目失败，请稍后重试或联系管理员。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initGuestProject();
  }, []);

  return (
    <PageContainer title="访客看板">
      <Spin spinning={loading}>
        <Card title="当前项目（只读）" style={{ marginBottom: 16 }}>
          <Input
            value={
              projectId ? `${projectName}（ID: ${projectId}）` : '暂无可用项目'
            }
            readOnly
            disabled
          />
        </Card>

        {!projectId ? (
          <Card>
            {errorText && (
              <Alert
                type="error"
                showIcon
                message="无法获取可访问项目"
                description={errorText}
                style={{ marginBottom: 16 }}
              />
            )}
            <Empty description="暂无可访问项目" />
          </Card>
        ) : (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card>
                  <Statistic title="模型数量" value={models.length} />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic title="事件数量（当前页）" value={events.length} />
                </Card>
              </Col>
            </Row>

            <Card title="模型列表" style={{ marginBottom: 16 }}>
              <List
                bordered
                dataSource={models}
                locale={{ emptyText: '当前项目暂无模型' }}
                renderItem={(item) => (
                  <List.Item>
                    {item.model_name || `模型 ${item.model_id || '-'}`}
                  </List.Item>
                )}
              />
            </Card>

            <Card title="最新事件（当前页）">
              <List
                bordered
                dataSource={events}
                locale={{ emptyText: '当前项目暂无事件' }}
                renderItem={(item) => (
                  <List.Item>
                    事件#{item.event_id || '-'} ｜ 时间: {item.time || '-'} ｜
                    震级: {item.magnitude ?? '-'} ｜ 能量: {item.energy ?? '-'}
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Spin>
    </PageContainer>
  );
};

export default GuestDashboard;
