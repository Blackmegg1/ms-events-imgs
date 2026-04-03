import { getEventList } from '@/services/event/EventController';
import { getLayerList } from '@/services/layer/LayerController';
import { getModelList } from '@/services/model/ModelController';
import { getActiveProject } from '@/services/project/ProjectController';
import { computerEvent, getEventRelativeZ } from '@/utils/pointSurfaceRegion';
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
    Tooltip,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import React, { useEffect, useState, useRef } from 'react';
import * as echarts from 'echarts';

const { RangePicker } = DatePicker;

const Statistics: React.FC = () => {
    const [projectArr, setProjectArr] = useState<any[]>([]);
    const [modelArr, setModelArr] = useState<any[]>([]);
    const [layerOptions, setLayerOptions] = useState<any[]>([]);
    const [statsData, setStatsData] = useState<any[]>([]);
    const [trendData, setTrendData] = useState<any[]>([]);
    const [magStats, setMagStats] = useState<any[]>([]);
    const [variationData, setVariationData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({
        totalCount: 0,
        totalEnergy: 0,
        avgDaily: 0,
        maxHeight: 0,
        maxDepth: 0,
        maxHeightPos: '',
        maxDepthPos: ''
    });
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
        form.setFieldsValue({ model_id: null, ref_layer_id: null });
        setLayerOptions([]);
        const response = await getModelList({ project_id: projectId });
        const modelList = response.list;
        const distArr = modelList.map((model: any) => ({
            value: model.model_id,
            label: model.model_name,
        }));
        setModelArr(distArr);
        if (distArr.length > 0) {
            const lastModelId = distArr[distArr.length - 1].value;
            form.setFieldsValue({ model_id: lastModelId });
            handleModelChange(lastModelId);
        }
    };

    const handleModelChange = async (modelId: number) => {
        form.setFieldsValue({ ref_layer_id: null });
        const { list: layers } = await getLayerList({ model_id: modelId });
        const options = layers.map((l: any) => ({
            value: l.id,
            label: l.layer_name,
            original: l
        }));
        setLayerOptions(options);

        // 默认尝试匹配“煤层”
        const coal = options.find((o: any) => o.label.includes('煤层'));
        if (coal) {
            form.setFieldsValue({ ref_layer_id: coal.value });
        }
    };

    const runAnalysis = async () => {
        const values = await form.validateFields();
        const { project_id, model_id, timeRage, ref_layer_id } = values;

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
                setSummary({ totalCount: 0, totalEnergy: 0, avgDaily: 0, maxHeight: 0, maxDepth: 0, maxHeightPos: '', maxDepthPos: '' });
                setLoading(false);
                return;
            }

            // 3. 对每个分区进行计算
            const results = [];
            let totalCount = 0;
            let totalEnergy = 0;

            // 准备趋势数据映射
            const dateTrendMap: Record<string, number> = {};
            const dateVariationMap: Record<string, any> = {};

            // 如果有时间范围，初始化所有日期
            if (formattedTimeRange?.[0] && formattedTimeRange?.[1]) {
                let curr = dayjs(formattedTimeRange[0]);
                const end = dayjs(formattedTimeRange[1]);
                while (curr.isBefore(end) || curr.isSame(end, 'day')) {
                    const dStr = curr.format('YYYY-MM-DD');
                    dateTrendMap[dStr] = 0;
                    dateVariationMap[dStr] = {
                        roofCount: 0,
                        maxHeight: 0,
                        floorCount: 0,
                        maxDepth: 0
                    };
                    curr = curr.add(1, 'day');
                }
            }

            // 准备震级分布
            const magBins = [
                { label: '< 0', count: 0, min: -Infinity, max: 0 },
                { label: '0 ~ 0.2', count: 0, min: 0, max: 0.2 },
                { label: '0.2 ~ 0.5', count: 0, min: 0.2, max: 0.5 },
                { label: '0.5 ~ 1.0', count: 0, min: 0.5, max: 1.0 },
                { label: '1.0 ~ 2.0', count: 0, min: 1.0, max: 2.0 },
                { label: '> 2.0', count: 0, min: 2.0, max: Infinity },
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

            // 4. 计算最大发育高度/深度
            const relEvents = await getEventRelativeZ(project_id, allEvents);
            const coalLayer = layerOptions.find((o: any) => o.value === ref_layer_id)?.original;

            let maxHeight = 0;
            let maxDepth = 0;
            const summaryData: any = {};

            if (coalLayer) {
                const roofDist = coalLayer.layer_distance;
                const floorDist = coalLayer.layer_distance - coalLayer.layer_depth;

                let hMaxEvent: any = null;
                let dMaxEvent: any = null;

                relEvents.forEach((ev: any) => {
                    const dStr = dayjs(ev.time).format('YYYY-MM-DD');
                    if (!dateVariationMap[dStr]) {
                        dateVariationMap[dStr] = {
                            roofCount: 0,
                            maxHeight: 0,
                            floorCount: 0,
                            maxDepth: 0
                        };
                    }
                    if (ev.relative_z !== null) {
                        const h = ev.relative_z - roofDist;
                        const d = floorDist - ev.relative_z;

                        if (h > 0) {
                            dateVariationMap[dStr].roofCount++;
                            if (h > dateVariationMap[dStr].maxHeight) {
                                dateVariationMap[dStr].maxHeight = Number(h.toFixed(2));
                            }
                            if (h > maxHeight) {
                                maxHeight = h;
                                hMaxEvent = ev;
                            }
                        }

                        if (d > 0) {
                            dateVariationMap[dStr].floorCount++;
                            if (d > dateVariationMap[dStr].maxDepth) {
                                dateVariationMap[dStr].maxDepth = Number(d.toFixed(2));
                            }
                            if (d > maxDepth) {
                                maxDepth = d;
                                dMaxEvent = ev;
                            }
                        }
                    }
                });

                if (hMaxEvent) {
                    summaryData.maxHeightPos = `位置: (${hMaxEvent.loc_x.toFixed(1)}, ${hMaxEvent.loc_y.toFixed(1)}, ${hMaxEvent.loc_z.toFixed(1)})`;
                }
                if (dMaxEvent) {
                    summaryData.maxDepthPos = `位置: (${dMaxEvent.loc_x.toFixed(1)}, ${dMaxEvent.loc_y.toFixed(1)}, ${dMaxEvent.loc_z.toFixed(1)})`;
                }
            }

            const trendArray = Object.keys(dateTrendMap).sort().map(dateValue => ({
                date: dayjs(dateValue).format('MM-DD'),
                count: dateTrendMap[dateValue]
            }));

            const days = trendArray.length || 1;

            setStatsData(results);
            setTrendData(trendArray);
            setMagStats(magBins);
            setVariationData(Object.keys(dateVariationMap).sort().map(d => ({
                date: dayjs(d).format('MM-DD'),
                ...dateVariationMap[d]
            })));
            setSummary({
                totalCount: processedEventKeys.size,
                totalEnergy: Number(totalEnergy.toFixed(2)),
                avgDaily: Math.round(processedEventKeys.size / days),
                maxHeight: Number(maxHeight.toFixed(2)),
                maxDepth: Number(maxDepth.toFixed(2)),
                maxHeightPos: summaryData.maxHeightPos || '',
                maxDepthPos: summaryData.maxDepthPos || ''
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

    const getVariationOption = () => ({
        title: { text: '微震事件连续变化趋势', left: 'center', textStyle: { fontSize: 15, fontWeight: 'bold' } },
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross', lineStyle: { color: '#999', type: 'dashed' } },
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderColor: 'rgba(200, 200, 200, 0.5)',
            borderWidth: 1,
            textStyle: { color: '#333', fontSize: 13 },
            extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.12); backdrop-filter: blur(6px); border-radius: 8px;'
        },
        toolbox: {
            feature: {
                saveAsImage: { show: true, title: '导出图片' }
            },
            right: '2%',
            top: '2%'
        },
        legend: {
            data: ['顶板事件数', '微震事件最大发育高度 (m)', '底板事件数', '微震事件最大发育深度 (m)'],
            bottom: 0,
            itemGap: 24,
            textStyle: { color: '#666' }
        },
        grid: { top: '18%', bottom: '15%', left: '5%', right: '5%', containLabel: true },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: variationData.map(d => d.date),
            axisLine: { lineStyle: { color: '#ccc' } },
            axisLabel: { color: '#8c8c8c' }
        },
        yAxis: [
            {
                type: 'value',
                name: '频次 (次)',
                position: 'left',
                splitLine: { lineStyle: { type: 'dashed', color: '#eee' } },
                splitArea: { show: true, areaStyle: { color: ['rgba(250,250,250,0.1)', 'rgba(200,200,200,0.05)'] } }
            },
            {
                type: 'value',
                name: '高度/深度 (m)',
                position: 'right',
                splitLine: { show: false }
            }
        ],
        series: [
            {
                name: '顶板事件数',
                type: 'line',
                data: variationData.map(d => d.roofCount),
                smooth: false,
                itemStyle: { color: '#f5222d' },
                lineStyle: { width: 3, type: 'solid' }
            },
            {
                name: '微震事件最大发育高度 (m)',
                type: 'line',
                yAxisIndex: 1,
                data: variationData.map(d => d.maxHeight),
                smooth: false,
                itemStyle: { color: '#fa8c16' },
                lineStyle: { width: 2, type: 'dashed' }
            },
            {
                name: '底板事件数',
                type: 'line',
                data: variationData.map(d => d.floorCount),
                smooth: false,
                itemStyle: { color: '#1890ff' },
                lineStyle: { width: 3, type: 'solid' }
            },
            {
                name: '微震事件最大发育深度 (m)',
                type: 'line',
                yAxisIndex: 1,
                data: variationData.map(d => d.maxDepth),
                smooth: false,
                itemStyle: { color: '#52c41a' },
                lineStyle: { width: 2, type: 'dashed' }
            }
        ]
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

    const variationColumns = [
        { title: '日期', dataIndex: 'date', key: 'date' },
        { title: '顶板事件数 (次)', dataIndex: 'roofCount', key: 'roofCount', sorter: (a: any, b: any) => a.roofCount - b.roofCount },
        { title: '最大发育高度 (m)', dataIndex: 'maxHeight', key: 'maxHeight', sorter: (a: any, b: any) => a.maxHeight - b.maxHeight },
        { title: '底板事件数 (次)', dataIndex: 'floorCount', key: 'floorCount', sorter: (a: any, b: any) => a.floorCount - b.floorCount },
        { title: '最大发育深度 (m)', dataIndex: 'maxDepth', key: 'maxDepth', sorter: (a: any, b: any) => a.maxDepth - b.maxDepth },
    ];

    return (
        <PageContainer title="分层统计报表">
            <Card bodyStyle={{ padding: '24px 24px 0 24px' }} style={{ marginBottom: 16 }}>
                <Form form={form} layout="vertical">
                    <Row gutter={24} align="bottom">
                        <Col xs={24} sm={12} md={6} lg={4}>
                            <Form.Item label="项目名称" name="project_id" rules={[{ required: true }]}>
                                <Select options={projectArr} style={{ width: '100%' }} onChange={handleProjectChange} placeholder="请选择项目" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6} lg={4}>
                            <Form.Item label="模型选择" name="model_id" rules={[{ required: true }]}>
                                <Select options={modelArr} style={{ width: '100%' }} onChange={handleModelChange} placeholder="请选择模型" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={6} lg={4}>
                            <Form.Item label="标定层位" name="ref_layer_id" tooltip="作为高度与深度统计的参考层">
                                <Select options={layerOptions} style={{ width: '100%' }} placeholder="选择参考层位" allowClear />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={12} md={10} lg={6}>
                            <Form.Item label="时间范围" name="timeRage">
                                <RangePicker style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={24} md={4} lg={4}>
                            <Form.Item>
                                <Button type="primary" onClick={runAnalysis} loading={loading} block>
                                    生成报表
                                </Button>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Card>

            {statsData.length > 0 && (
                <>
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                        <Col span={4}>
                            <Card bordered={false}>
                                <Statistic title="总计频次" value={summary.totalCount} suffix="次" valueStyle={{ color: '#1890ff' }} />
                            </Card>
                        </Col>
                        <Col span={5}>
                            <Card bordered={false}>
                                <Tooltip title={summary.maxHeightPos || '无数据'}>
                                    <Statistic
                                        title={
                                            <Space>
                                                最大发育高度
                                                <Tooltip title="相对于标定层位顶板的垂直距离">
                                                    <InfoCircleOutlined style={{ fontSize: '14px', color: '#999', cursor: 'help' }} />
                                                </Tooltip>
                                            </Space>
                                        }
                                        value={summary.maxHeight}
                                        suffix="m"
                                        precision={2}
                                        valueStyle={{ color: '#cf1322', cursor: 'pointer' }}
                                    />
                                </Tooltip>
                            </Card>
                        </Col>
                        <Col span={5}>
                            <Card bordered={false}>
                                <Tooltip title={summary.maxDepthPos || '无数据'}>
                                    <Statistic
                                        title="最大发育深度"
                                        value={summary.maxDepth}
                                        suffix="m"
                                        precision={2}
                                        valueStyle={{ color: '#3f51b5', cursor: 'pointer' }}
                                    />
                                </Tooltip>
                            </Card>
                        </Col>
                        <Col span={5}>
                            <Card bordered={false}>
                                <Statistic title="日均频次" value={summary.avgDaily} suffix="次/天" />
                            </Card>
                        </Col>
                        <Col span={5}>
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
                        <Col span={24}>
                            <Card title="微震事件连续变化趋势" bordered={false}>
                                <EChartComponent option={getVariationOption()} style={{ height: 400, width: '100%' }} />
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
