import { getEventList } from '@/services/event/EventController';
import { getLayerList } from '@/services/layer/LayerController';
import { getModelList } from '@/services/model/ModelController';
import { getActiveProject } from '@/services/project/ProjectController';
import { computerEvent } from '@/utils/pointSurfaceRegion';
import { PageContainer } from '@ant-design/pro-components';
import {
    Button,
    Card,
    Col,
    DatePicker,
    Form,
    Row,
    Select,
    Space,
    Table,
    message,
    Statistic,
    Divider,
} from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';

const { RangePicker } = DatePicker;

const Statistics: React.FC = () => {
    const [projectArr, setProjectArr] = useState<any[]>([]);
    const [modelArr, setModelArr] = useState<any[]>([]);
    const [statsData, setStatsData] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [magStats, setMagStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ totalCount: 0, totalEnergy: 0, avgDaily: 0 });
    const [form] = Form.useForm();

    useEffect(() => {
        async function fetchActiveProjects() {
            const response = await getActiveProject();
            const distArr: any = response.map((project: any) => ({
                value: project.id,
                label: project.projectName,
            }));
            setProjectArr(distArr);
        }
        fetchActiveProjects();
    }, []);

    const handleProjectChange = async (projectId: number) => {
        form.setFieldsValue({ model_id: null });
        const response = await getModelList({ project_id: projectId });
        const modelList = response.list;
        const distArr = modelList.map((model: any) => ({
            value: model.model_id,
            label: model.model_name,
        }));
        setModelArr(distArr);
        if (distArr.length > 0) {
            form.setFieldsValue({ model_id: distArr[distArr.length - 1].value });
        }
    };

    const runAnalysis = async () => {
        const values = await form.validateFields();
        const { project_id, model_id, timeRage } = values;

        if (!project_id || !model_id) return;

        setLoading(true);
        try {
            // 1. 获取层位/分区列表
            const { list: layers } = await getLayerList({ model_id });
            const zones = layers.filter((l: any) => l.layer_type === 1);

            if (zones.length === 0) {
                message.warning('该模型下未定义分析分区！');
                setStatsData([]);
                setLoading(false);
                return;
            }

            // 2. 获取事件列表
            const formattedTimeRange = timeRage?.map((date: any) =>
                dayjs(date).format('YYYY-MM-DD'),
            );
            const { list: allEvents } = await getEventList({
                pageSize: 999999,
                current: 1,
                timeBegin: formattedTimeRange?.[0] || null,
                timeEnd: formattedTimeRange?.[1] || null,
                project_id,
            });

            if (!allEvents || allEvents.length === 0) {
                message.info('当前条件下未找到微震事件');
                setStatsData([]);
                setSummary({ totalCount: 0, totalEnergy: 0, avgDaily: 0 });
                setLoading(false);
                return;
            }

            // 3. 对每个分区进行计算
            const results = [];
            let totalCount = 0;
            let totalEnergy = 0;

            // 准备趋势数据映射
            const dateTrendMap: Record<string, number> = {};
            // 如果有时间范围，初始化所有日期
            if (formattedTimeRange?.[0] && formattedTimeRange?.[1]) {
                let curr = dayjs(formattedTimeRange[0]);
                const end = dayjs(formattedTimeRange[1]);
                while (curr.isBefore(end) || curr.isSame(end, 'day')) {
                    dateTrendMap[curr.format('YYYY-MM-DD')] = 0;
                    curr = curr.add(1, 'day');
                }
            }

            // 准备震级分布
            const magBins = [
                { label: '< 0', count: 0, min: -Infinity, max: 0 },
                { label: '0 ~ 1', count: 0, min: 0, max: 1 },
                { label: '1 ~ 2', count: 0, min: 1, max: 2 },
                { label: '2 ~ 3', count: 0, min: 2, max: 3 },
                { label: '> 3', count: 0, min: 3, max: Infinity },
            ];

            const processedEventKeys = new Set();

            for (const zone of zones) {
                const filtered = await computerEvent(
                    project_id,
                    allEvents,
                    zone.layer_distance - zone.layer_depth,
                    zone.layer_distance,
                );

                const energySum = filtered.reduce((acc: number, curr: any) => acc + (Number(curr.energy) || 0), 0);

                results.push({
                    key: zone.id,
                    name: zone.layer_name,
                    count: filtered.length,
                    energy: Number(energySum.toFixed(2)),
                    color: zone.layer_color,
                });

                totalCount += filtered.length;
                totalEnergy += energySum;

                // 统计趋势与震级 (去重，防止一个事件属于多个分区导致统计翻倍)
                filtered.forEach(ev => {
                    const key = ev.event_key || `${ev.loc_x}-${ev.loc_y}-${ev.loc_z}-${ev.time}`;
                    if (!processedEventKeys.has(key)) {
                        processedEventKeys.add(key);

                        // 趋势
                        const d = dayjs(ev.time).format('YYYY-MM-DD');
                        if (dateTrendMap[d] !== undefined) dateTrendMap[d]++;
                        else dateTrendMap[d] = 1;

                        // 震级
                        const m = Number(ev.magnitude);
                        const bin = magBins.find(b => m >= b.min && m < b.max);
                        if (bin) bin.count++;
                    }
                });
            }

            const trendArray = Object.keys(dateTrendMap).sort().map(dateValue => ({
                date: dayjs(dateValue).format('MM-DD'),
                count: dateTrendMap[dateValue]
            }));

            const days = trendArray.length || 1;

            setStatsData(results);
            setTrendData(trendArray);
            setMagStats(magBins);
            setSummary({
                totalCount: processedEventKeys.size,
                totalEnergy: Number(totalEnergy.toFixed(2)),
                avgDaily: Number((processedEventKeys.size / days).toFixed(2))
            });
            message.success('统计分析完成');
        } catch (error) {
            console.error('统计分析失败', error);
            message.error('统计分析失败');
        } finally {
            setLoading(false);
        }
    };

    const getBarOption = () => ({
        title: { text: '各分区微震频次', left: 'center', textStyle: { fontSize: 14 } },
        tooltip: { trigger: 'axis' },
        grid: { bottom: '10%', containLabel: true },
        xAxis: { type: 'category', data: statsData.map(d => d.name), axisLabel: { interval: 0, rotate: 30 } },
        yAxis: { type: 'value', name: '频次 (次)' },
        series: [{
            data: statsData.map(d => ({ value: d.count, itemStyle: { color: d.color } })),
            type: 'bar',
            label: { show: true, position: 'top' }
        }]
    });

    const getTrendOption = () => ({
        title: { text: '事件频次时间趋势', left: 'center', textStyle: { fontSize: 14 } },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: trendData.map(d => d.date) },
        yAxis: { type: 'value', name: '频次 (次)' },
        series: [{
            data: trendData.map(d => d.count),
            type: 'line',
            smooth: true,
            areaStyle: { opacity: 0.2 },
            itemStyle: { color: '#1890ff' },
            lineStyle: { width: 3 }
        }]
    });

    const getMagOption = () => ({
        title: { text: '震级分布统计', left: 'center', textStyle: { fontSize: 14 } },
        tooltip: { trigger: 'item', formatter: '{b}: {c}次 ({d}%)' },
        series: [{
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
            label: { show: false, position: 'center' },
            emphasis: { label: { show: true, fontSize: '16', fontWeight: 'bold' } },
            data: magStats.map(m => ({ value: m.count, name: m.label }))
        }]
    });

    const getPieOption = () => ({
        title: { text: '分区能量占比', left: 'center', textStyle: { fontSize: 14 } },
        tooltip: { trigger: 'item', formatter: '{b}: {c} KJ ({d}%)' },
        series: [{
            name: '能量 (KJ)',
            type: 'pie',
            radius: '60%',
            data: statsData.map(d => ({ value: d.energy, name: d.name, itemStyle: { color: d.color } })),
            emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
        }]
    });

    const EChartComponent = ({ option, style }: { option: any, style: any }) => {
        const chartRef = useRef<HTMLDivElement>(null);
        const chartInstance = useRef<echarts.ECharts | null>(null);
        useEffect(() => {
            if (chartRef.current) chartInstance.current = echarts.init(chartRef.current);
            return () => chartInstance.current?.dispose();
        }, []);
        useEffect(() => { if (chartInstance.current) chartInstance.current.setOption(option); }, [option]);
        useEffect(() => {
            const handleResize = () => chartInstance.current?.resize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }, []);
        return <div ref={chartRef} style={style} />;
    };

    const columns = [
        { title: '分析分区名称', dataIndex: 'name', key: 'name' },
        {
            title: '区域颜色',
            dataIndex: 'color',
            key: 'color',
            render: (color: string) => <div style={{ width: 16, height: 16, backgroundColor: color, borderRadius: '50%' }} />
        },
        { title: '频次 (次)', dataIndex: 'count', key: 'count', sorter: (a: any, b: any) => a.count - b.count },
        {
            title: '累计能量 (KJ)',
            dataIndex: 'energy',
            key: 'energy',
            sorter: (a: any, b: any) => a.energy - b.energy,
            render: (val: number) => val.toLocaleString()
        },
        {
            title: '频次占比',
            key: 'countPct',
            render: (record: any) => summary.totalCount > 0 ? ((record.count / summary.totalCount) * 100).toFixed(1) + '%' : '0%'
        },
    ];

    return (
        <PageContainer title="分层统计报表">
            <Card bodyStyle={{ padding: '16px' }} style={{ marginBottom: 16 }}>
                <Form form={form} layout="inline">
                    <Form.Item label="项目" name="project_id" rules={[{ required: true }]}>
                        <Select options={projectArr} style={{ width: 200 }} onChange={handleProjectChange} />
                    </Form.Item>
                    <Form.Item label="模型" name="model_id" rules={[{ required: true }]}>
                        <Select options={modelArr} style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item label="时间段" name="timeRage">
                        <RangePicker />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" onClick={runAnalysis} loading={loading}>
                            生成报表
                        </Button>
                    </Form.Item>
                </Form>
            </Card>

            {statsData.length > 0 && (
                <>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col span={6}>
                            <Card bordered={false}>
                                <Statistic title="总计频次" value={summary.totalCount} suffix="次" valueStyle={{ color: '#1890ff' }} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card bordered={false}>
                                <Statistic title="日均频次" value={summary.avgDaily} suffix="次/天" />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card bordered={false}>
                                <Statistic title="分析分区数" value={statsData.length} />
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card bordered={false}>
                                <Statistic title="累计能量" value={summary.totalEnergy} suffix="KJ" precision={1} />
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col span={16}>
                            <Card title="频次动态趋势" bordered={false}>
                                <EChartComponent option={getTrendOption()} style={{ height: 360, width: '100%' }} />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card title="震级分布 (频次)" bordered={false}>
                                <EChartComponent option={getMagOption()} style={{ height: 360, width: '100%' }} />
                            </Card>
                        </Col>
                    </Row>

                    <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col span={8}>
                            <Card title="各分区频次" bordered={false}>
                                <EChartComponent option={getBarOption()} style={{ height: 300, width: '100%' }} />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card title="区域能量占比" bordered={false}>
                                <EChartComponent option={getPieOption()} style={{ height: 300, width: '100%' }} />
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card title="分区概览" bordered={false}>
                                <Table
                                    dataSource={statsData}
                                    columns={columns}
                                    pagination={false}
                                    size="small"
                                />
                            </Card>
                        </Col>
                    </Row>
                </>
            )}
        </PageContainer>
    );
};

export default Statistics;
