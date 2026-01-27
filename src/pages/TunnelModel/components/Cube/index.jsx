import { Button, Drawer, Form, Input, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import regularFont from 'three/examples/fonts/optimer_regular.typeface.json';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';

import EditTable from '../EditTable';

const Cube = () => {
  const [form] = Form.useForm();
  const containerRef = useRef();
  const cameraRef = useRef();
  const controlRef = useRef();
  const [messageApi, contextHolder] = message.useMessage();
  const [open, setOpen] = useState(false);
  const [axisStart, setAxisStart] = useState(0);
  const [axisLength, setAxisLength] = useState(100);

  const [geoData, setGeoData] = useState([
    {
      key: 0,
      x: 80,
      type: 1,
      depth: 2,
      angle: 0,
      color: 'rgb(255, 0, 0)',
    },
  ]);

  const showDrawer = () => {
    setOpen(true);
  };
  const onClose = () => {
    setOpen(false);
  };

  useEffect(() => {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current?.clientWidth / containerRef.current?.clientHeight,
      0.1,
      1000,
    );

    const color = 0xffffff;
    const intensity = 3;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    scene.add(light);

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight,
    );
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controlRef.current = controls;

    const storedCamera = localStorage.getItem('cameraState');
    if (storedCamera) {
      const storedCameraJson = JSON.parse(storedCamera);
      camera.position.set(
        storedCameraJson.position.x,
        storedCameraJson.position.y,
        storedCameraJson.position.z,
      );
      camera.rotation.set(
        storedCameraJson.rotation['_x'],
        storedCameraJson.rotation['_y'],
        storedCameraJson.rotation['_z'],
        storedCameraJson.rotation['_order'],
      );
      controls.target.set(
        storedCameraJson.target.x,
        storedCameraJson.target.y,
        storedCameraJson.target.z,
      );
    } else {
      camera.position.x = 50;
      camera.position.y = 50;
      camera.position.z = 100;
    }

    const axesHelper = new THREE.AxesHelper(40);
    scene.add(axesHelper);

    const transparentMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });
    const cubeGeometry = new THREE.BoxGeometry(axisLength, 20, 20);
    const cubeMesh = new THREE.Mesh(cubeGeometry, transparentMaterial);
    cubeMesh.position.set(axisLength / 2, 10, 10);
    scene.add(cubeMesh);

    addGridLines(cubeMesh, 10);

    for (let geo of geoData) {
      if (geo.type === 1) {
        addCuttingPlane(geo.x, geo.depth, geo.color, geo.angle);
      } else {
        addCurve(geo.x, geo.depth, geo.color);
      }
    }

    // 添加鼠标点击事件以设置旋转中心
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const textMeshes = [];
    textMeshes.push(...addAxisNumber(axisStart, axisLength, 10));

    const animate = () => {
      if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
      }
      textMeshes.forEach((mesh) => mesh.lookAt(camera.position));
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    renderer.domElement.addEventListener('click', onMouseClick);

    function onMouseClick(event) {
      // 计算鼠标在标准化设备坐标中的位置 (-1 到 +1)
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // 更新射线投射器
      raycaster.setFromCamera(mouse, camera);

      // 获取场景中所有对象的交点
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length > 0) {
        // 将 OrbitControls 的目标设置为第一个交点
        const intersectionPoint = intersects[0].point;
        controls.target.copy(intersectionPoint);
        controls.update();
      }
    }

    function addGridLines(mesh, spacing) {
      var geometry = new THREE.BufferGeometry();
      var material = new THREE.LineBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 2,
        linewidth: 1,
        scale: 1,
        dashSize: 3,
        gapSize: 1,
      });

      var vertices = [];
      for (
        var i = -mesh.geometry.parameters.width / 2;
        i <= mesh.geometry.parameters.width / 2;
        i += spacing
      ) {
        for (
          var j = -mesh.geometry.parameters.height / 2;
          j <= mesh.geometry.parameters.height / 2;
          j += spacing
        ) {
          vertices.push(i, j, -mesh.geometry.parameters.depth / 2);
          vertices.push(i, j, mesh.geometry.parameters.depth / 2);
        }
        for (
          var k = -mesh.geometry.parameters.depth / 2;
          k <= mesh.geometry.parameters.depth / 2;
          k += spacing
        ) {
          vertices.push(i, -mesh.geometry.parameters.height / 2, k);
          vertices.push(i, mesh.geometry.parameters.height / 2, k);
        }
      }
      for (
        var ii = -mesh.geometry.parameters.height / 2;
        ii <= mesh.geometry.parameters.height / 2;
        ii += spacing
      ) {
        for (
          var jj = -mesh.geometry.parameters.depth / 2;
          jj <= mesh.geometry.parameters.depth / 2;
          jj += spacing
        ) {
          vertices.push(-mesh.geometry.parameters.width / 2, ii, jj);
          vertices.push(mesh.geometry.parameters.width / 2, ii, jj);
        }
      }

      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(vertices, 3),
      );

      var lines = new THREE.LineSegments(geometry, material);
      lines.material.dashed = true;
      mesh.add(lines);
    }

    function addCuttingPlane(x, depth = 1, color = 'rgb(255, 0, 0)', angle = 0) {
      var boxGeometry = new THREE.BoxGeometry(depth, 20, 20);
      var boxMaterial = new THREE.MeshBasicMaterial({ color: color });
      var box = new THREE.Mesh(boxGeometry, boxMaterial);
      box.position.x = x;
      box.position.y = 10;
      box.position.z = 10;
      box.rotation.z = THREE.MathUtils.degToRad(angle);
      scene.add(box);
    }

    function addCurve(x = 0, depth = 1, color = 'rgb(255, 0, 0)') {
      for (let i = 0; i < 20; i++) {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0 + x, 0, i * 1.0),
          new THREE.Vector3(5 + x, 10, i * 1.0),
          new THREE.Vector3(0 + x, 20, i * 1.0),
        ]);
        const tubeRadius = depth / 2;
        const tubularSegments = 100;
        const radialSegments = 100;
        const closed = false;
        const geometry = new THREE.TubeGeometry(
          curve,
          tubularSegments,
          tubeRadius,
          radialSegments,
          closed,
        );
        const material = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
      }
    }

    function addText(text, position, color, camera) {
      const font = new FontLoader().parse(regularFont);
      const textGeometry = new TextGeometry(text, {
        font: font,
        size: 3,
        height: 0.1,
      });
      const textMaterial = new THREE.MeshBasicMaterial({ color });
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.copy(position);
      textMesh.rotation.x = -Math.PI / 2;
      textMesh.lookAt(camera.position);
      scene.add(textMesh);
      return textMesh;
    }

    function addAxisNumber(start = 0, length, divide, axis = 'x', unit = '(m)') {
      const meshes = [];
      const step = length / divide;

      // 根据轴调整文字位置和朝向
      for (let i = 0; i <= divide; i++) {
        const pos = i * step;
        const value = (start + pos).toString();
        let position;

        // 根据轴设置文字位置
        switch (axis.toLowerCase()) {
          case 'x':
            position = new THREE.Vector3(pos, 0, 25); // X 轴，Z 偏移以显示在轴上方
            break;
          case 'y':
            position = new THREE.Vector3(0, pos, 25); // Y 轴，Z 偏移
            break;
          case 'z':
            position = new THREE.Vector3(0, 25, pos); // Z 轴，Y 偏移
            break;
          default:
            throw new Error("Axis must be 'x', 'y', or 'z'");
        }

        // 添加刻度文字
        meshes.push(addText(value, position, 0x000000, camera));
      }

      // 添加单位标签
      let unitPosition;
      switch (axis.toLowerCase()) {
        case 'x':
          unitPosition = new THREE.Vector3(length + 8, 0, 25); // 单位放在 X 轴末端
          break;
        case 'y':
          unitPosition = new THREE.Vector3(0, length + 8, 25); // 单位放在 Y 轴末端
          break;
        case 'z':
          unitPosition = new THREE.Vector3(0, 25, length + 8); // 单位放在 Z 轴末端
          break;
      }
      meshes.push(addText(unit, unitPosition, 0x000000, camera));

      return meshes;
    }

    function resizeRendererToDisplaySize(renderer) {
      const canvas = renderer.domElement;
      const width = canvas.parentElement?.clientWidth;
      const height = canvas.parentElement?.clientHeight;
      const needResize = canvas.width !== width || canvas.height !== height;
      if (needResize) {
        renderer.setSize(width, height, false);
      }
      return needResize;
    }

    cameraRef.current = camera;
    animate();

    return () => {
      renderer.domElement.removeEventListener('click', onMouseClick);
      renderer.domElement.remove();
      renderer.forceContextLoss();
    };
  }, [axisStart, geoData, axisLength]);

  const onFinish = (values) => {
    const { axisStart, axisLength } = values;
    setAxisStart(+axisStart);
    setAxisLength(+axisLength);
    onClose();
  };

  const addGeo = () => {
    const newkey = geoData.length;
    const newGeoData = [
      ...geoData,
      {
        key: newkey,
        x: 0,
        type: 1,
        depth: 1,
        angle: 0,
        color: 'rgb(255, 0, 0)',
      },
    ];
    setGeoData(newGeoData);
  };

  function getCameraState(camera, orbitControls) {
    return {
      position: camera.position,
      rotation: camera.rotation,
      target: orbitControls.target,
    };
  }

  function saveCameraState() {
    var cameraState = getCameraState(cameraRef.current, controlRef.current);
    localStorage.setItem('cameraState', JSON.stringify(cameraState));
    messageApi.success('当前视角已保存！');
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          gap: '16px',
          marginBottom: '16px',
          flexWrap: 'wrap', // 允许按钮在小屏幕上换行
        }}
      >
        <Button type="primary" onClick={showDrawer}>
          图像设置
        </Button>
        <Button type="default" onClick={saveCameraState}>
          保存视角
        </Button>
      </div>
      <div
        ref={containerRef}
        style={{ width: '100%', height: 'calc(100vh - 210px)', background: '#fff' }}
      ></div>
      <Drawer
        title="图像设置"
        placement="left"
        closable={true}
        size="large"
        onClose={onClose}
        open={open}
      >
        <Form
          onFinish={onFinish}
          initialValues={{ axisStart: axisStart, axisLength: axisLength }}
        >
          <Form.Item
            name="axisLength"
            label="坐标轴长度(m)"
            rules={[{ required: true }]}
          >
            <Input style={{ width: '20%' }} type="number" />
          </Form.Item>
          <Form.Item
            name="axisStart"
            label="坐标轴起始值(m)"
            rules={[{ required: true }]}
          >
            <Input style={{ width: '20%' }} type="number" />
          </Form.Item>
          <Form.Item wrapperCol={{ span: 16 }}>
            <Button type="primary" onClick={addGeo}>
              添加偏移
            </Button>
          </Form.Item>
          <Form.Item>
            <EditTable
              name="geoData"
              form={form}
              data={geoData}
              setData={setGeoData}
            />
          </Form.Item>
          <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
          </Form.Item>
        </Form>
      </Drawer>
      {contextHolder}
    </div>
  );
};

export default Cube;
