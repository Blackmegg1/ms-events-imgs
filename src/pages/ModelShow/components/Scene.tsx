import {
  createDensityGrid,
  createGridLines,
  createLayer,
  createSphere,
} from '@/utils/threeUtils';
import { message } from 'antd';
import { PropsWithChildren, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

interface Events {
  loc_x: number;
  loc_y: number;
  loc_z: number;
}
[];

interface Layers {
  layer_depth: number;
  layer_color: string;
  layer_name: string;
  layer_distance: number;
}
[];

interface SceneProps {
  points: {
    point_name: string;
    point_x: number;
    point_y: number;
    point_z: number;
  }[];
  events: Events | [];
  layers: Layers | [];
  eventMode: Number;
}

const Scene: React.FC<PropsWithChildren<SceneProps>> = (props) => {
  const { points, events, layers, eventMode } = props;

  const [messageApi, contextHolder] = message.useMessage();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<HTMLDivElement | null>(null);
  const controlRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (points.length < 3) {
      return;
    }
    if (containerRef.current) {
      // 创建场景
      const scene = new THREE.Scene();
      scene.scale.z = 1.5;
      scene.background = new THREE.Color(0xffffff);
      // 创建相机
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        1,
        10000,
      );
      camera.up.set(0, 0, 1);

      // 创建光源
      const color = 0xffffff;
      const intensity = 3;
      const light = new THREE.DirectionalLight(color, intensity);
      light.position.set(-1, 2, 4);
      scene.add(light);

      // 创建渲染器
      const renderer = new THREE.WebGLRenderer();
      renderer.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight,
      );
      containerRef.current.appendChild(renderer.domElement);

      // 调整摄像机位置
      let maxX = -Infinity,
        maxY = -Infinity,
        maxZ = -Infinity;
      let minX = Infinity,
        minY = Infinity,
        minZ = Infinity;
      points.forEach((point) => {
        maxX = Math.max(maxX, point.point_x);
        maxY = Math.max(maxY, point.point_y);
        maxZ = Math.max(maxZ, point.point_z);
        minX = Math.min(minX, point.point_x);
        minY = Math.min(minY, point.point_y);
        minZ = Math.min(minZ, point.point_z);
      });

      // 创建并添加网格线
      const gridLines = createGridLines(
        maxX + 100,
        minX,
        maxY + 100,
        minY,
        maxZ + 150,
        minZ - 100,
        8,
        30,
        true,
      );
      scene.add(gridLines);

      // 计算场景中心点
      const centerX = (maxX + minX) / 2;
      const centerY = (maxY + minY) / 2;
      const centerZ = (maxZ + minZ) / 2;

      // 设置摄像机位置
      const offset = 400;
      camera.position.set(centerX, minY - offset * 1.2, centerZ);

      // 创建一个位于场景上方的目标点
      const target = new THREE.Vector3(
        centerX,
        centerY + offset * 2,
        minZ - offset,
      );

      // 让摄像机朝向目标点
      camera.lookAt(target);

      // 设置 OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(target); // 设置 OrbitControls 的目标点
      controls.update();

      controlRef.current = controls;
      cameraRef.current = camera;

      // 将数据转换为 Vector3 对象
      let vectorPoints = points.map(
        (point) =>
          new THREE.Vector3(point.point_x, point.point_y, point.point_z),
      );

      // 展示基准点
      // createPoints(vectorPoints, scene);

      // 增加分层地质
      layers.forEach((layer) => {
        let belowPoints = vectorPoints.map(
          (point) =>
            new THREE.Vector3(point.x, point.y, point.z + layer.layer_distance),
        );
        createLayer(belowPoints, layer.layer_depth, scene, layer.layer_color);
      });

      if (eventMode === 1) {
        // 增加微震事件频次密度图
        createDensityGrid(events, scene, 20);
      } else {
        // 展示微震事件点
        createSphere(events, scene);
      }

      // 增加电阻率切片
      // createEDataSurface(5, scene);
      // createEDataSurface(6, scene);
      // createEDataSurface(7, scene);

      // 渲染场景
      const animate = () => {
        if (resizeRendererToDisplaySize(renderer)) {
          const canvas = renderer.domElement;
          camera.aspect = canvas.clientWidth / canvas.clientHeight;
          camera.updateProjectionMatrix();
        }
        requestAnimationFrame(animate);
        controls.update(); // 在每一帧都更新控制器
        renderer.render(scene, camera);
      };

      function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer) {
        const canvas = renderer.domElement;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
          renderer.setSize(width, height, false);
        }
        return needResize;
      }

      animate();

      // 当组件卸载时，停止动画循环
      return () => {
        renderer.domElement.remove();
        renderer.forceContextLoss();
      };
    }
  }, [points, layers, eventMode]);

  return (
    <>
      <div
        ref={containerRef}
        style={{ height: '100%', width: '100%', minHeight: '80vh' }}
      ></div>
      {contextHolder}
    </>
  );
};

export default Scene;
