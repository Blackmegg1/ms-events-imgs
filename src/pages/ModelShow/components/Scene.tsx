import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
    createSolidLayer,
    createBoxAxes,
    createEventSpheres,
    createCompass,
    createLayerNames
} from '@/utils/threeUtils';

// 类型定义
interface Point {
    point_name?: string;
    point_x: number;
    point_y: number;
    point_z: number;
}

interface EventData {
    loc_x: number;
    loc_y: number;
    loc_z: number;
    magnitude: number;
    energy?: number;
}

interface LayerData {
    layer_depth: number;
    layer_color: string;
    layer_name: string;
    layer_distance: number; // 距离顶板的偏移量
    layer_type?: number; // 0: 地质层位, 1: 虚拟分析分区
}

interface SceneProps {
    points: Point[];
    events?: EventData[];
    layers?: LayerData[];
    compass?: { start: number[]; end: number[] };
    csvData?: any[]; // 兼容旧接口
}

const Scene: React.FC<SceneProps> = ({
    points = [],
    events = [],
    layers = [],
    compass,
    csvData
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const requestRef = useRef<number>();

    // 用于坐标归一化的中心点
    const centerRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

    // Tooltip 状态
    const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: React.ReactNode }>({
        visible: false, x: 0, y: 0, content: null
    });

    // 1. 数据预处理：合并 csvData 和 points，并计算包围盒与中心点
    const { dataPoints, bounds, center } = useMemo(() => {
        const rawPoints = (csvData && csvData.length > 0)
            ? csvData.map(p => ({ point_x: p.x, point_y: p.y, point_z: p.z }))
            : points;

        if (rawPoints.length < 3) return { dataPoints: [], bounds: null, center: new THREE.Vector3() };

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        rawPoints.forEach(p => {
            minX = Math.min(minX, p.point_x); maxX = Math.max(maxX, p.point_x);
            minY = Math.min(minY, p.point_y); maxY = Math.max(maxY, p.point_y);
            minZ = Math.min(minZ, p.point_z); maxZ = Math.max(maxZ, p.point_z);
        });

        const c = new THREE.Vector3(
            (minX + maxX) / 2,
            (minY + maxY) / 2,
            (minZ + maxZ) / 2
        );

        return {
            dataPoints: rawPoints,
            bounds: { minX, maxX, minY, maxY, minZ, maxZ },
            center: c
        };
    }, [points, csvData]);

    // 2. 初始化 Three.js 环境 (仅执行一次)
    useEffect(() => {
        if (!containerRef.current) return;
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;

        // Scene
        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0xf0f2f5, 2000, 10000);

        // Camera
        const camera = new THREE.PerspectiveCamera(45, width / height, 1, 50000);
        camera.up.set(0, 0, 1); // Z轴向上

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;

        // Lights (复用 CoalView 的灯光设置，立体感更强)
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);

        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(500, -500, 1000);
        scene.add(mainLight);

        const backLight = new THREE.DirectionalLight(0xecf0f1, 0.5);
        backLight.position.set(-500, 500, 200);
        scene.add(backLight);

        // Save refs
        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;
        controlsRef.current = controls;

        // Animation Loop
        const animate = () => {
            requestRef.current = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Resize Handler
        const handleResize = () => {
            if (containerRef.current && camera && renderer) {
                const w = containerRef.current.clientWidth;
                const h = containerRef.current.clientHeight;
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
            }
        };
        window.addEventListener('resize', handleResize);

        // Raycaster Setup
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onMouseMove = (event: MouseEvent) => {
            if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            raycaster.setFromCamera(mouse, cameraRef.current);

            const eventGroup = sceneRef.current.getObjectByName("EventsGroup");
            if (eventGroup) {
                const intersects = raycaster.intersectObjects([eventGroup]);

                if (intersects.length > 0) {
                    const intersect = intersects[0];
                    const obj = intersect.object as THREE.InstancedMesh;

                    if (obj.isInstancedMesh && intersect.instanceId !== undefined) {
                        const raw = obj.userData.rawEvents[intersect.instanceId];
                        if (raw) {
                            setTooltip({
                                visible: true,
                                x: event.clientX + 15,
                                y: event.clientY + 15,
                                content: (
                                    <>
                                        <div><b>微震事件</b></div>
                                        <div>震级: {raw.magnitude?.toFixed(2)}</div>
                                        <div>位置: {raw.loc_x?.toFixed(1)}, {raw.loc_y?.toFixed(1)}, {raw.loc_z?.toFixed(1)}</div>
                                    </>
                                )
                            });
                            document.body.style.cursor = 'pointer';
                            return;
                        }
                    }
                }
            }

            // 未匹配到任何对象
            setTooltip(prev => ({ ...prev, visible: false }));
            document.body.style.cursor = 'default';
        };
        renderer.domElement.addEventListener('mousemove', onMouseMove);

        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.domElement.removeEventListener('mousemove', onMouseMove);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            renderer.dispose();
            if (containerRef.current) containerRef.current.removeChild(renderer.domElement);
        };
    }, []);

    // 3. 数据更新逻辑
    useEffect(() => {
        const scene = sceneRef.current;
        const camera = cameraRef.current;
        const controls = controlsRef.current;

        if (!scene || !camera || !controls || !bounds) return;

        // 清理旧模型
        ["LayerGroup", "AxesGroup", "EventsGroup", "CompassGroup", "LayerLabelsGroup"].forEach(name => {
            const oldGroup = scene.getObjectByName(name);
            if (oldGroup) {
                scene.remove(oldGroup);
                // 简单的内存清理
                oldGroup.traverse((child: any) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
                        else child.material.dispose();
                    }
                });
            }
        });

        // 更新中心点 ref
        centerRef.current.copy(center);

        // --- A. 绘制地层 (LayerGroup) ---
        const layerGroup = new THREE.Group();
        layerGroup.name = "LayerGroup";

        // 如果有 layers 定义，则根据 layers 生成多层；否则生成一个默认层
        // 过滤掉虚拟分析分区 (layer_type === 1)，暂时不在三维场景展示
        const filteredLayers = layers.filter(l => l.layer_type !== 1);

        const layersRenderList = filteredLayers.length > 0 ? filteredLayers : (layers.length > 0 ? [] : [{
            layer_name: "默认煤层",
            layer_depth: 10,
            layer_color: "#1a1a1a",
            layer_distance: 0
        }]);

        layersRenderList.forEach(layer => {
            // 构造该层的数据点 (Z轴根据 layer_distance 偏移)
            const layerPoints = dataPoints.map(p => ({
                ...p,
                point_z: p.point_z + (layer.layer_distance || 0)
            }));

            const mesh = createSolidLayer(
                layerPoints,
                layer.layer_depth || 10,
                new THREE.Color(layer.layer_color),
                center
            );
            mesh.name = layer.layer_name;
            layerGroup.add(mesh);
        });
        scene.add(layerGroup);

        // --- 绘制地层名称标注 ---
        if (layersRenderList.length > 0) {
            createLayerNames(
                layersRenderList,
                bounds.minX - center.x,
                bounds.minY - center.y,
                dataPoints[0].point_z - center.z,
                scene
            );
        }

        // --- B. 绘制坐标轴 (AxesGroup) ---
        createBoxAxes(bounds, scene, center);

        // --- C. 绘制微震事件 (EventsGroup) ---
        if (events && events.length > 0) {
            createEventSpheres(events, scene, center);
        }

        // --- D. 绘制指北针 ---
        if (compass) {
            createCompass(compass.start, compass.end, scene, center);
        }

        // --- E. 相机视角重置 ---
        const maxDim = Math.max(
            bounds.maxX - bounds.minX,
            bounds.maxY - bounds.minY
        );
        const dist = maxDim * 1.5;
        // 类似 CoalView 的相机位置 (斜侧上方)
        camera.position.set(dist, -dist, dist * 0.8);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();

    }, [dataPoints, bounds, center, events, layers, compass]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

            {/* React Portal or Absolute Div for Tooltip */}
            {tooltip.visible && (
                <div style={{
                    position: 'fixed',
                    top: tooltip.y,
                    left: tooltip.x,
                    background: 'rgba(0, 0, 0, 0.8)',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    pointerEvents: 'none',
                    fontSize: '12px',
                    zIndex: 1000,
                    whiteSpace: 'nowrap',
                    backdropFilter: 'blur(4px)'
                }}>
                    {tooltip.content}
                </div>
            )}
        </div>
    );
};

export default Scene;