import {
  createDensityGrid,
  createGridLines,
  createSphere,
  updateLayerData,
} from '@/utils/threeUtils';
import { PropsWithChildren, useEffect, useMemo, useRef } from 'react';
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlRef = useRef<OrbitControls | null>(null);
  let animationFrameId: number;

  const sceneData = useMemo(() => {
    if (points.length < 3) return null;

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

    const centerX = (maxX + minX) / 2;
    const centerY = (maxY + minY) / 2;
    const centerZ = (maxZ + minZ) / 2;

    const target = new THREE.Vector3(centerX, centerY, centerZ);

    return {
      maxX,
      maxY,
      maxZ,
      minX,
      minY,
      minZ,
      centerX,
      centerY,
      centerZ,
      target,
    };
  }, [points]);

  function clearScene(scene: THREE.Scene) {
    // 创建一个临时数组存储需要删除的对象
    const objectsToRemove: THREE.Object3D[] = [];

    // 收集需要删除的对象
    scene.children.forEach((child) => {
      if (child.name.startsWith('eDataSurface_')) {
        return;
      }

      objectsToRemove.push(child);
    });

    // 删除收集到的对象
    objectsToRemove.forEach((child) => {
      if ((child as any).geometry) {
        (child as any).geometry.dispose();
      }
      if ((child as any).material) {
        if (Array.isArray((child as any).material)) {
          (child as any).material.forEach((material: THREE.Material) =>
            material.dispose(),
          );
        } else {
          (child as any).material.dispose();
        }
      }
      scene.remove(child);
    });
  }

  useEffect(() => {
    if (!containerRef.current || !sceneData) return;

    console.log('场景渲染');

    const {
      maxX,
      maxY,
      maxZ,
      minX,
      minY,
      minZ,
      centerX,
      centerY,
      centerZ,
      target,
    } = sceneData;

    if (!sceneRef.current) {
      sceneRef.current = new THREE.Scene();
    }
    sceneRef.current.scale.z = 1.2;

    if (!cameraRef.current) {
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        1,
        10000,
      );
      camera.up.set(0, 0, 1);
      camera.position.set(centerX, centerY - 700, centerZ + 120);
      camera.lookAt(target);
      cameraRef.current = camera;
    }

    const renderer =
      rendererRef.current || new THREE.WebGLRenderer({ alpha: true });
    renderer.setClearAlpha(0.0);
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight,
    );
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

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
    sceneRef.current.add(gridLines);

    const controls =
      controlRef.current ||
      new OrbitControls(cameraRef.current!, renderer.domElement);
    controls.target.copy(target);
    controls.update();
    controlRef.current = controls;

    const vectorPoints = points.map(
      (point) => new THREE.Vector3(point.point_x, point.point_y, point.point_z),
    );

    // createPoints(vectorPoints, sceneRef.current);

    updateLayerData(sceneRef.current, layers, vectorPoints);

    if (eventMode === 1) {
      createDensityGrid(events, sceneRef.current, 20, [1, 1000]);
    } else {
      createSphere(events, sceneRef.current, renderer, cameraRef.current!);
    }

    const animate = () => {
      console.log('动画更新');
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(sceneRef.current!, cameraRef.current!);
    };

    animate();

    return () => {
      console.log('组件卸载');
      cancelAnimationFrame(animationFrameId);
      clearScene(sceneRef.current!);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [points, layers, events, eventMode]);

  return (
    <>
      <div
        ref={containerRef}
        style={{ height: '100%', width: '100%', minHeight: '80vh' }}
      ></div>
    </>
  );
};

export default Scene;
