import * as THREE from 'three';
import * as d3 from 'd3';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'; // 正确导入 FontLoader
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'; // 导入 TextGeometry
import fontJson from '@/assets/fonts/helvetiker_regular.typeface.json';

import { getEData } from '@/services/eData/EDataController'
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
        opacity: 0.4
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
        opacity: 0.2,
        color: color,
        depthTest: false,
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

// 震级色标
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

// 频次色标
function getFreqColor(val, maxValue) {
    // 如果传入的最大值小于 10,则使用 0 到 10 作为域范围,否则使用 0 到最大值作为域范围
    const clampedDomain = maxValue < 10 ? [0, 10] : [0, maxValue];

    const colorScale = d3
        .scaleLinear()
        .domain(clampedDomain)
        .range([
            '#081cf0',
            '#22d3ae',
            '#68d220',
            '#c7aa1a',
            '#ea851a',
            '#e14e0f',
            '#ec0f08',
        ]);

    const colorRange = colorScale.range();
    const color = d3.interpolateRgbBasis(colorRange)(val / clampedDomain[1]);

    return color;
};

// 创建事件球体
export function createSphere(events, scene) {
    events.forEach(event => {

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

    })
}

// 创建频次网格体
export function createDensityGrid(events, scene, gridSize = 10) {
    // Step 1: Determine the spatial extent of events
    const extent = {
        minX: Math.min(...events.map(event => event.loc_x)),
        maxX: Math.max(...events.map(event => event.loc_x)),
        minY: Math.min(...events.map(event => event.loc_y)),
        maxY: Math.max(...events.map(event => event.loc_y)),
        minZ: Math.min(...events.map(event => event.loc_z)),
        maxZ: Math.max(...events.map(event => event.loc_z))
    };

    // Step 2: Divide the region into a grid
    const xRange = extent.maxX - extent.minX;
    const yRange = extent.maxY - extent.minY;
    const zRange = extent.maxZ - extent.minZ;

    const xSteps = Math.ceil(xRange / gridSize);
    const ySteps = Math.ceil(yRange / gridSize);
    const zSteps = Math.ceil(zRange / gridSize);

    // Step 3: Initialize a 3D grid to store event counts
    const grid = Array.from({ length: xSteps }, () =>
        Array.from({ length: ySteps }, () =>
            Array.from({ length: zSteps }, () => 0)
        )
    );

    // Step 4: Count events in each grid cell
    events.forEach(event => {
        const xIndex = Math.floor((event.loc_x - extent.minX) / gridSize);
        const yIndex = Math.floor((event.loc_y - extent.minY) / gridSize);
        const zIndex = Math.floor((event.loc_z - extent.minZ) / gridSize);

        if (xIndex < xSteps && yIndex < ySteps && zIndex < zSteps) {
            grid[xIndex][yIndex][zIndex]++;
        }
    });

    // Step 5: Find the maximum event count
    const maxCount = Math.max(...grid.flat(2));

    // Step 6: Create and visualize the density meshes
    for (let x = 0; x < xSteps; x++) {
        for (let y = 0; y < ySteps; y++) {
            for (let z = 0; z < zSteps; z++) {
                const count = grid[x][y][z];
                if (count > 0) {
                    // Calculate position of the grid cell
                    const centerX = extent.minX + (x + 0.5) * gridSize;
                    const centerY = extent.minY + (y + 0.5) * gridSize;
                    const centerZ = extent.minZ + (z + 0.5) * gridSize;

                    // Determine color and opacity based on density
                    const colorScale = getFreqColor(count, maxCount);
                    const normalizedOpacity = 0.1 + (count / maxCount) * 0.9;

                    // Create a cube or other mesh to represent density
                    const geometry = new THREE.BoxGeometry(gridSize, gridSize, gridSize);
                    const material = new THREE.MeshPhysicalMaterial({
                        color: colorScale,
                        transmission: 0.8,
                        thickness: 0.5,
                        transparent: true,
                        opacity: normalizedOpacity,
                    });

                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.position.set(centerX, centerY, centerZ);
                    scene.add(mesh);
                }
            }
        }
    }
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
export function createGridLines(maxX, minX, maxY, minY, maxZ, minZ, divisions = 10, fontMargin = 30, showHalfGrid = true) {
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
        const lineGeometryXBottom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, minY, minZ),
            new THREE.Vector3(x, maxY, minZ)
        ]);
        const lineBottom = new THREE.Line(lineGeometryXBottom, new THREE.LineBasicMaterial({ color: 0xcccccc }));
        gridGroup.add(lineBottom);

        // 为X方向网格线添加刻度
        createTextLabel(x.toFixed(0), new THREE.Vector3(x, minY - fontMargin, minZ), gridGroup);

        if (!showHalfGrid) {
            const lineGeometryXTop = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, minY, maxZ),
                new THREE.Vector3(x, maxY, maxZ)
            ]);
            const lineTop = new THREE.Line(lineGeometryXTop, new THREE.LineBasicMaterial({ color: 0xcccccc }));
            gridGroup.add(lineTop);
        }

        // 添加Y方向的网格线
        const lineGeometryYBottom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(minX, y, minZ),
            new THREE.Vector3(maxX, y, minZ)
        ]);
        const lineYBottom = new THREE.Line(lineGeometryYBottom, new THREE.LineBasicMaterial({ color: 0xcccccc }));
        gridGroup.add(lineYBottom);

        // 为Y方向网格线添加刻度
        createTextLabel(y.toFixed(0), new THREE.Vector3(minX - fontMargin, y, minZ), gridGroup);

        if (!showHalfGrid) {
            const lineGeometryYTop = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(minX, y, maxZ),
                new THREE.Vector3(maxX, y, maxZ)
            ]);
            const lineYTop = new THREE.Line(lineGeometryYTop, new THREE.LineBasicMaterial({ color: 0xcccccc }));
            gridGroup.add(lineYTop);
        }
    }

    // 为XZ平面创建网格线
    for (let i = 0; i <= divisions; i++) {
        const x = minX + i * cellSizeX;
        const z = minZ + i * cellSizeZ;

        // 添加X方向的网格线
        const lineGeometryXFront = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, maxY, minZ),
            new THREE.Vector3(x, maxY, maxZ)

        ]);
        const lineXFront = new THREE.Line(lineGeometryXFront, new THREE.LineBasicMaterial({ color: 0xcccccc }));
        gridGroup.add(lineXFront);

        if (!showHalfGrid) {
            const lineGeometryXBack = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, minY, minZ),
                new THREE.Vector3(x, minY, maxZ)
            ]);
            const lineXBack = new THREE.Line(lineGeometryXBack, new THREE.LineBasicMaterial({ color: 0xcccccc }));
            gridGroup.add(lineXBack);
        }

        // 添加Z方向的网格线
        const lineGeometryZFront = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(minX, maxY, z),
            new THREE.Vector3(maxX, maxY, z)

        ]);
        const lineZFront = new THREE.Line(lineGeometryZFront, new THREE.LineBasicMaterial({ color: 0xcccccc }));
        gridGroup.add(lineZFront);

        // 为Z方向网格线添加刻度
        createTextLabel(z.toFixed(0), new THREE.Vector3(minX - fontMargin, maxY, z), gridGroup, 10, 0x000000, true);

        if (!showHalfGrid) {
            const lineGeometryZBack = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(minX, minY, z),
                new THREE.Vector3(maxX, minY, z)
            ]);
            const lineZBack = new THREE.Line(lineGeometryZBack, new THREE.LineBasicMaterial({ color: 0xcccccc }));
            gridGroup.add(lineZBack);
        }
    }

    // 为YZ平面创建网格线
    for (let i = 0; i <= divisions; i++) {
        const y = minY + i * cellSizeY;
        const z = minZ + i * cellSizeZ;

        // 添加Y方向的网格线
        const lineGeometryYLeft = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(minX, y, minZ),
            new THREE.Vector3(minX, y, maxZ)
        ]);
        const lineYLeft = new THREE.Line(lineGeometryYLeft, new THREE.LineBasicMaterial({ color: 0xcccccc }));
        gridGroup.add(lineYLeft);

        if (!showHalfGrid) {
            const lineGeometryYRight = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(maxX, y, minZ),
                new THREE.Vector3(maxX, y, maxZ)
            ]);
            const lineYRight = new THREE.Line(lineGeometryYRight, new THREE.LineBasicMaterial({ color: 0xcccccc }));
            gridGroup.add(lineYRight);
        }

        // 添加Z方向的网格线
        const lineGeometryZLeft = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(minX, minY, z),
            new THREE.Vector3(minX, maxY, z)
        ]);
        const lineZLeft = new THREE.Line(lineGeometryZLeft, new THREE.LineBasicMaterial({ color: 0xcccccc }));
        gridGroup.add(lineZLeft);

        if (!showHalfGrid) {
            const lineGeometryZRight = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(maxX, minY, z),
                new THREE.Vector3(maxX, maxY, z)
            ]);
            const lineZRight = new THREE.Line(lineGeometryZRight, new THREE.LineBasicMaterial({ color: 0xcccccc }));
            gridGroup.add(lineZRight);
        }
    }

    return gridGroup;
}

// 根据视电阻率数据，创建三角剖分面
export async function createEDataSurface(id, scene) {
    const eDataJson = await getEData(id);
    const points = eDataJson.chartData;

    // 找到 p 值的最小值和最大值，用于归一化
    const minP = 0;
    const maxP = 100;

    // 定义颜色标度
    const colorScale = d3.scaleLinear()
        .domain([0, 0.15, 0.5, 1])
        .range(["rgb(0,0,255)", "rgb(0,255,0)", "rgb(255,255,0)", "rgb(255,100,0)"]);

    // 创建几何体
    const vertices = [];
    const colors = [];
    const pointsForDelaunay = [];

    points.forEach((point) => {
        vertices.push(point[0], point[1], point[2]);
        pointsForDelaunay.push([point[0], point[1]]);
    });

    // 使用 d3-delaunay 进行三角剖分
    const delaunay = Delaunay.from(pointsForDelaunay);
    const triangles = delaunay.triangles;

    // 创建单一的几何体来表示整个表面
    const geometry = new THREE.BufferGeometry();
    const allVertices = [];
    const allColors = [];

    // 遍历每个三角形，计算顶点和颜色
    for (let i = 0; i < triangles.length; i += 3) {
        const p1 = points[triangles[i]];
        const p2 = points[triangles[i + 1]];
        const p3 = points[triangles[i + 2]];

        // 添加顶点位置
        allVertices.push(p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2]);

        // 计算 p 值的平均值
        const avgP = ((p1[3] - minP) / (maxP - minP) + (p2[3] - minP) / (maxP - minP) + (p3[3] - minP) / (maxP - minP)) / 3;

        // 获取基于平均 p 值的颜色
        const faceColor = new THREE.Color(colorScale(avgP));

        // 为每个顶点设置颜色
        allColors.push(faceColor.r, faceColor.g, faceColor.b);
        allColors.push(faceColor.r, faceColor.g, faceColor.b);
        allColors.push(faceColor.r, faceColor.g, faceColor.b);
    }

    // 将顶点和颜色添加到几何体
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(allVertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(allColors, 3));

    // 使用顶点颜色创建材质
    const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
    });

    // 创建单个三角形网格
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 为每个顶点添加红色标记
    // const pointGeometry = new THREE.BufferGeometry();
    // const pointVertices = new Float32Array(vertices.length);
    // pointVertices.set(vertices);
    // pointGeometry.setAttribute('position', new THREE.BufferAttribute(pointVertices, 3));

    // const pointMaterial = new THREE.PointsMaterial({
    //     color: 0xff0000, // 红色
    //     size: 0.1 // 设置点的大小
    // });

    // const pointsMesh = new THREE.Points(pointGeometry, pointMaterial);
    // scene.add(pointsMesh);
}


