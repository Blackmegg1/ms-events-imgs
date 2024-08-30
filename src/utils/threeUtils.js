import * as THREE from 'three';
import * as d3 from 'd3';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'; // 正确导入 FontLoader
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'; // 导入 TextGeometry
import fontJson from '@/assets/fonts/helvetiker_regular.typeface.json';

import { Delaunay } from 'd3-delaunay';

// 创建环绕曲面
export function createSurface(points, depth, scene, color = "0x00ff00") {
    // 将数据转换为 Vector3 对象
    const vectorPoints = points.map(
        (point) => new THREE.Vector3(point.x, point.y, point.z)
    );

    // 添加第一个点到数组末尾以闭合曲线
    vectorPoints.push(vectorPoints[0].clone());

    // 创建新的点集，通过沿 z 轴正方向移动原始点集
    const movedPoints = vectorPoints.map(
        (point) => new THREE.Vector3(point.x, point.y, point.z + depth)
    );

    // 创建几何体
    const geometry = new THREE.BufferGeometry();

    // 将原始点集和移动后的点集合并
    const vertices = [];
    const uvs = [];  // UV 坐标数组
    for (let i = 0; i < vectorPoints.length; i++) {
        vertices.push(vectorPoints[i].x, vectorPoints[i].y, vectorPoints[i].z);
        vertices.push(movedPoints[i].x, movedPoints[i].y, movedPoints[i].z);

        // 为每个顶点添加UV坐标
        uvs.push(i / (vectorPoints.length - 1), 0);
        uvs.push(i / (vectorPoints.length - 1), 1);
    }

    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(uvs, 2)
    );

    // 创建面索引
    const indices = [];
    for (let i = 0; i < vectorPoints.length - 1; i++) {
        const a = i * 2;
        const b = i * 2 + 1;
        const c = i * 2 + 2;
        const d = i * 2 + 3;
        indices.push(a, b, c);
        indices.push(b, d, c);
    }

    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // 创建材质，并添加到场景中
    const material = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
}

// 创建三角剖分面
export function createTriangulatedSurface(points, scene, color) {
    // 创建几何体
    const surfaceGeometry = new THREE.BufferGeometry();

    // 创建顶点
    const vertices = [];
    const pointsForDelaunay = [];
    points.forEach((point) => {
        vertices.push(point.x, point.y, point.z);
        pointsForDelaunay.push([point.x, point.y]);
    });

    // 使用 d3-delaunay 进行三角剖分
    const delaunay = Delaunay.from(pointsForDelaunay);
    const triangles = delaunay.triangles;

    // 创建面（三角形）
    const indices = [];
    for (let i = 0; i < triangles.length; i += 3) {
        indices.push(triangles[i], triangles[i + 1], triangles[i + 2]);
    }

    // 设置顶点和面
    surfaceGeometry.setIndex(indices);
    surfaceGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
    );

    // 计算法线
    surfaceGeometry.computeVertexNormals();

    // 创建材质
    const surfaceMaterial = new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4,
        color: color
    });

    // 创建网格
    const surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);

    // 添加到场景
    scene.add(surfaceMesh);
}

// 构建一个完整地层，包含上下两个面和环绕曲面
export function createLayer(points, depth, scene, color = "0x00ff00") {
    createTriangulatedSurface(points, scene, color);
    createSurface(points, depth, scene, color);
    let topPoints = points.map(
        (point) =>
            new THREE.Vector3(point.x, point.y, point.z + depth),
    );
    createTriangulatedSurface(topPoints, scene, color);
}

// 标注基准点
export function createPoints(points, scene) {
    const pointObjects = [];

    points.forEach((point) => {
        // 为每个点创建一个单独的几何体
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([point.x, point.y, point.z], 3));

        // 创建材质
        const material = new THREE.PointsMaterial({
            color: 0xff0000,
            size: 4,
            sizeAttenuation: false,
        });

        // 创建点对象
        const pointObject = new THREE.Points(geometry, material);

        // 添加到场景
        scene.add(pointObject);

        // 将点对象添加到数组
        pointObjects.push(pointObject);
    });

    return pointObjects;
}

function getOpacity(magnitude) {
    const normalizedMag = (magnitude + 2) / 5;
    return 0.1 + normalizedMag * 0.9;
}

function getColor(val) {
    const colorScale = d3
        .scaleLinear()
        .domain([-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3])
        .range([
            '#0a0675', // 深蓝色
            '#2008a8', // 较深的蓝色  
            '#3107f0', // 蓝色
            '#1f07f0', // 较深的蓝色
            '#081cf0', // 深蓝色
            '#22d3ae', // 浅绿色
            '#68d220', // 绿色
            '#c7aa1a', // 黄色
            '#ea851a', // 橙色
            '#e14e0f', // 深橙色
            '#ec0f08'  // 深红色
        ]);
    const color = colorScale(val);
    return color;
}

// 创建事件球体
export function createSphere(events, scene) {
    events.forEach(event => {
        if (event.magnitude > 0) {
            const radius = 3 + (event.magnitude * 3);
            const geometry = new THREE.SphereGeometry(radius, 64, 64);

            // 根据震级计算颜色和透明度
            const colorScale = getColor(event.magnitude);
            const opacity = getOpacity(event.magnitude);

            const material = new THREE.MeshPhysicalMaterial({
                color: colorScale,
                metalness: 0.0,
                roughness: 0.1,
                transmission: 0.8,
                thickness: 0.5,
                transparent: true,
                opacity: opacity
            });

            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(event.loc_x, event.loc_y, event.loc_z);
            scene.add(sphere);
        }
    })
}

// 创建文字刻度函数
function createTextLabel(text, position, gridGroup, size = 10, color = 0x000000, rotation = false) {
    const loader = new FontLoader();
    const textMaterial = new THREE.MeshBasicMaterial({ color });
    const font = loader.parse(fontJson)
    if (font) {
        const textGeometry = new TextGeometry(text, {
            font: font,
            size: size,
            depth: 0.1,
        });
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.copy(position);
        if (rotation) {
            textMesh.rotation.set(Math.PI / 2, 0, 0);
        }
        gridGroup.add(textMesh); // 将文字添加到传入的 gridGroup 中
    }
    else {
        console.log("字体加载出错！")
    }
}

// 创建网格线
export function createGridLines(maxX, minX, maxY, minY, maxZ, minZ, divisions = 10, fontMargin = 30) {
    const gridGroup = new THREE.Group();

    // 计算每个网格单元的大小
    const cellSizeX = (maxX - minX) / divisions;
    const cellSizeY = (maxY - minY) / divisions;
    const cellSizeZ = (maxZ - minZ) / divisions;

    // 为XY平面创建网格线
    for (let i = 0; i <= divisions; i++) {
        const x = minX + i * cellSizeX;
        const y = minY + i * cellSizeY;

        // 添加X方向的网格线
        const lineGeometryX = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, minY, minZ),
            new THREE.Vector3(x, maxY, minZ)
        ]);
        const lineX = new THREE.Line(lineGeometryX, new THREE.LineBasicMaterial({ color: 0xcccccc }));
        gridGroup.add(lineX);

        // 为X方向网格线添加刻度
        createTextLabel(x.toFixed(0), new THREE.Vector3(x, minY - fontMargin, minZ), gridGroup);

        // 添加Y方向的网格线
        const lineGeometryY = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(minX, y, minZ),
            new THREE.Vector3(maxX, y, minZ)
        ]);
        const lineY = new THREE.Line(lineGeometryY, new THREE.LineBasicMaterial({ color: 0xcccccc }));
        gridGroup.add(lineY);

        // 为Y方向网格线添加刻度
        createTextLabel(y.toFixed(0), new THREE.Vector3(minX - fontMargin, y, minZ), gridGroup);
    }

    // 为XZ平面创建网格线
    for (let i = 0; i <= divisions; i++) {
        const x = minX + i * cellSizeX;
        const z = minZ + i * cellSizeZ;

        // 添加X方向的网格线
        const lineGeometryX = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, maxY, minZ),
            new THREE.Vector3(x, maxY, maxZ)
        ]);
        const lineX = new THREE.Line(lineGeometryX, new THREE.LineBasicMaterial({ color: 0xcccccc }));
        gridGroup.add(lineX);

        // 添加Z方向的网格线
        const lineGeometryZ = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(minX, maxY, z),
            new THREE.Vector3(maxX, maxY, z)
        ]);
        const lineZ = new THREE.Line(lineGeometryZ, new THREE.LineBasicMaterial({ color: 0xcccccc }));
        gridGroup.add(lineZ);

        // 为Z方向网格线添加刻度
        createTextLabel(z.toFixed(0), new THREE.Vector3(minX, maxY, z), gridGroup, 10, 0x000000, true);
    }

    // 为YZ平面创建网格线
    for (let i = 0; i <= divisions; i++) {
        const y = minY + i * cellSizeY;
        const z = minZ + i * cellSizeZ;

        // 添加Y方向的网格线
        const lineGeometryY = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(minX, y, minZ),
            new THREE.Vector3(minX, y, maxZ)
        ]);
        const lineY = new THREE.Line(lineGeometryY, new THREE.LineBasicMaterial({ color: 0xcccccc }));
        gridGroup.add(lineY);

        // 添加Z方向的网格线
        const lineGeometryZ = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(minX, minY, z),
            new THREE.Vector3(minX, maxY, z)
        ]);
        const lineZ = new THREE.Line(lineGeometryZ, new THREE.LineBasicMaterial({ color: 0xcccccc }));
        gridGroup.add(lineZ);

    }

    return gridGroup;
}
