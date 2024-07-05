import { getProjectDist } from '@/services/project/ProjectController';
import { PageContainer } from '@ant-design/pro-components';
import { Table } from 'antd';
import { useEffect, useState } from 'react';

const SpaceModel: React.FC = () => {
  const [projectArr, setProjectArr] = useState([]);
  const [projectDist, setProjectDist] = useState([]);

  useEffect(() => {
    async function fetchDist() {
      const response = await getProjectDist();
      setProjectDist(response);
      const distArr: any = [];
      response.forEach((project: { projectName: string; id: number }) => {
        distArr.push({ value: project.id, label: project.projectName });
      });
      setProjectArr(distArr);
      return;
    }
    fetchDist();
  }, []);

  return (
    <PageContainer ghost>
      <Table columns={[]} />
    </PageContainer>
  );
};

export default SpaceModel;
