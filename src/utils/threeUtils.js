import * as THREE from 'three';
import * as d3 from 'd3';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'; // 正确导入 FontLoader
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'; // 导入 TextGeometry
import fontJson from '@/assets/fonts/helvetiker_regular.typeface.json';
import chineseFontJson from '@/assets/fonts/STXingkai_Regular.json'
import { getEData } from '@/services/eData/EDataController'
import { Delaunay } from 'd3-delaunay';

// 创建环绕曲面
export function createSurface(points, depth, scene, color = "0x00ff00") {

    const points2D = points.map(point => [point.x, point.y]);

    // 创建Delaunay对象并获取凸包
    const delaunay = Delaunay.from(points2D);
    const hullIndices = delaunay.hull;

    // 根据凸包索引创建新的点数组，并直接创建 THREE.Vector3 对象
    const vectorPoints = Array.from(hullIndices).map(index =>
        new THREE.Vector3(points[index].x, points[index].y, points[index].z)
    );

    console.log(vectorPoints, 'vectorPoints');
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
    return mesh;
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
    return surfaceMesh
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
export function createSphere(events, scene, renderer, camera) {
    const spheres = [];

    events.forEach(event => {
        if (event.magnitude > 0) {
            const radius = 3 + (event.magnitude * 3);
            const geometry = new THREE.SphereGeometry(radius, 64, 64);

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
            sphere.userData = { x: event.loc_x, y: event.loc_y, z: event.loc_z, magnitude: event.magnitude, energy: event.energy };
            scene.add(sphere);
            spheres.push(sphere);
        }
    });

    // 初始化 Raycaster 和鼠标位置
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // 创建悬浮窗
    const tooltip = document.createElement('div');
    tooltip.style.position = 'absolute';
    tooltip.style.padding = '5px';
    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    tooltip.style.color = 'white';
    tooltip.style.borderRadius = '4px';
    tooltip.style.display = 'none'; // 初始隐藏
    document.body.appendChild(tooltip);

    // 鼠标移动事件
    renderer.domElement.addEventListener('mousemove', (event) => {
        // 获取 renderer DOM 元素的尺寸
        const rect = renderer.domElement.getBoundingClientRect();

        // 将鼠标位置转化为标准化设备坐标（NDC）
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // 使用 Raycaster 设置从相机出发的光线
        raycaster.setFromCamera(mouse, camera);

        // 检测与球体的相交
        const intersects = raycaster.intersectObjects(spheres);

        if (intersects.length > 0) {
            const intersected = intersects[0].object;
            const { x, y, z, magnitude, energy } = intersected.userData;

            // 更新悬浮窗内容和位置
            tooltip.innerHTML = `X: ${x.toFixed(2)}米<br>Y: ${y.toFixed(2)}米<br>Z: ${z.toFixed(2)}米<br>震级: ${magnitude.toFixed(1)}M<br>能量: ${energy.toFixed(2)}J`;
            tooltip.style.left = `${event.clientX + 10}px`;
            tooltip.style.top = `${event.clientY + 10}px`;
            tooltip.style.display = 'block';
        } else {
            tooltip.style.display = 'none';
        }
    });
}

// 创建频次网格体
export function createDensityGrid(events, scene, gridSize = 10, gridFilter = [1, 1000]) {
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
                if (count >= gridFilter[0] && count <= gridFilter[1]) {
                    // Calculate position of the grid cell
                    const centerX = extent.minX + (x + 0.5) * gridSize;
                    const centerY = extent.minY + (y + 0.5) * gridSize;
                    const centerZ = extent.minZ + (z + 0.5) * gridSize;

                    // Determine color and opacity based on density
                    const colorScale = getFreqColor(count, maxCount);
                    const normalizedOpacity = 0.2 + (count / maxCount) * 0.8;

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
function createTextLabel(text, position, gridGroup, size = 10, color = 0x000000, rotation = false, isChinese = false) {
    const loader = new FontLoader();
    const textMaterial = new THREE.MeshBasicMaterial({ color });
    const font = loader.parse(isChinese ? chineseFontJson : fontJson); // 加载不同字体

    if (font) {
        const textGeometry = new TextGeometry(text, {
            font: font,
            size: size,
            height: 0.1, // 深度
        });

        textGeometry.computeBoundingBox(); // 计算边界框
        const boundingBox = textGeometry.boundingBox;
        const textLength = boundingBox.max.x - boundingBox.min.x; // 获取文本的宽度

        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.copy(position);

        // 如果是中文文本，根据宽度调整位置
        if (isChinese) {
            textMesh.position.x -= textLength + 5; // 将文本水平居中显示
        }

        // 根据需要旋转文本
        if (rotation) {
            textMesh.rotation.set(Math.PI / 2, 0, 0);
        }

        gridGroup.add(textMesh); // 将文字添加到传入的 gridGroup 中
    } else {
        console.log("字体加载出错！");
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

// 创建层位名称标注
export function createLayerNames(layers, minX, minY, centerZ, scene) {
    const gridGroup = new THREE.Group();
    layers.forEach(layer => {
        console.log(layer.layer_name)
        createTextLabel(layer.layer_name, new THREE.Vector3(minX, minY, centerZ + layer.layer_distance), gridGroup, 12, 0x000000, true, true)
    })
    scene.add(gridGroup);
}

// 根据视电阻率数据，创建三角剖分面
export async function createEDataSurface(
    height,
    eData,
    scene
) {
    const eDataJson = (await getEData(height, eData)).data;
    const points = eDataJson.chartData;

    // 找到 p 值的最小值和最大值，用于归一化
    const minP = 0;
    const maxP = 100;

    // 定义颜色标度
    const colorScaleTop = d3
        .scaleLinear()
        .domain([0, 0.2, 0.5, 1])
        .range(["rgb(0,0,255)", "rgb(0,255,0)", "rgb(255,255,0)", "rgb(255,100,0)"]);

    const colorScaleBottom = d3
        .scaleLinear()
        .domain([0, 0.03, 0.1, 1])
        .range(["rgb(0,255,0)", "rgb(200,255,0)", "rgb(255,255,0)", "rgb(255,100,0)"]);

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
        allVertices.push(
            p1[0],
            p1[1],
            p1[2],
            p2[0],
            p2[1],
            p2[2],
            p3[0],
            p3[1],
            p3[2]
        );

        // 计算 p 值的平均值
        const avgP =
            ((p1[3] - minP) / (maxP - minP) +
                (p2[3] - minP) / (maxP - minP) +
                (p3[3] - minP) / (maxP - minP)) /
            3;

        // 获取基于平均 p 值的颜色
        const faceColor = new THREE.Color(
            height === 6 || height === 12
                ? colorScaleTop(avgP)
                : colorScaleBottom(avgP)
        );

        // 为每个顶点设置颜色
        allColors.push(faceColor.r, faceColor.g, faceColor.b);
        allColors.push(faceColor.r, faceColor.g, faceColor.b);
        allColors.push(faceColor.r, faceColor.g, faceColor.b);
    }

    // 将顶点和颜色添加到几何体
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(allVertices, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(allColors, 3));

    // 使用顶点颜色创建材质
    const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        depthTest: false,
        transparent: true,
        opacity: 0.9,
    });

    // 创建单个三角形网格
    const mesh = new THREE.Mesh(geometry, material);

    // 为 mesh 增加唯一的名称
    mesh.name = `eDataSurface_${height}`;

    // 将网格添加到场景中
    scene.add(mesh);
}

// 更新视电阻率平面
export async function updateEDataSurface(
    height,
    eData,
    scene
) {
    const eDataJson = (await getEData(height, eData)).data;
    const points = eDataJson.chartData;

    // 找到 p 值的最小值和最大值，用于归一化
    const minP = 0;
    const maxP = 100;

    // 定义颜色标度
    const colorScaleTop = d3
        .scaleLinear()
        .domain([0, 0.2, 0.5, 1])
        .range(["rgb(0,0,255)", "rgb(0,255,0)", "rgb(255,255,0)", "rgb(255,100,0)"]);

    const colorScaleBottom = d3
        .scaleLinear()
        .domain([0, 0.03, 0.1, 1])
        .range(["rgb(0,255,0)", "rgb(200,255,0)", "rgb(255,255,0)", "rgb(255,100,0)"]);

    // 查找现有的表面网格
    const mesh = scene.getObjectByName(`eDataSurface_${height}`);

    // 如果网格不存在，创建新的
    if (!mesh) {
        createEDataSurface(height, eData, scene);
        return;
    }

    // 计算新几何体的顶点和颜色
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

    const allVertices = [];
    const allColors = [];

    // 遍历每个三角形，计算顶点和颜色
    for (let i = 0; i < triangles.length; i += 3) {
        const p1 = points[triangles[i]];
        const p2 = points[triangles[i + 1]];
        const p3 = points[triangles[i + 2]];

        // 添加顶点位置
        allVertices.push(
            p1[0],
            p1[1],
            p1[2],
            p2[0],
            p2[1],
            p2[2],
            p3[0],
            p3[1],
            p3[2]
        );

        // 计算 p 值的平均值
        const avgP =
            ((p1[3] - minP) / (maxP - minP) +
                (p2[3] - minP) / (maxP - minP) +
                (p3[3] - minP) / (maxP - minP)) /
            3;

        // 获取基于平均 p 值的颜色
        const faceColor = new THREE.Color(
            height === 6 || height === 12
                ? colorScaleTop(avgP)
                : colorScaleBottom(avgP)
        );

        // 为每个顶点设置颜色
        allColors.push(faceColor.r, faceColor.g, faceColor.b);
        allColors.push(faceColor.r, faceColor.g, faceColor.b);
        allColors.push(faceColor.r, faceColor.g, faceColor.b);
    }

    // 更新现有几何体的数据
    const geometry = mesh.geometry;

    // 更新顶点数据
    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(allVertices, 3)
    );
    geometry.attributes.position.needsUpdate = true;

    // 更新颜色数据
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(allColors, 3));
    geometry.attributes.color.needsUpdate = true;
}

// 更新地层
export function updateLayerData(scene, layers, points) {
    // 查找场景中的现有图层组
    let layerGroup = scene.getObjectByName("layerGroup");

    // 如果没有找到，创建一个新的组
    if (!layerGroup) {
        layerGroup = new THREE.Group();
        layerGroup.name = "layerGroup";
        scene.add(layerGroup);
    }

    layers.forEach((layer, index) => {
        const { layer_distance, layer_depth, layer_color } = layer;
        const color = layer_color || "0x00ff00";

        let belowPoints = points.map(
            (point) =>
                new THREE.Vector3(
                    point.x,
                    point.y,
                    point.z + layer_distance
                )
        );
        // 查找现有图层组中的子对象（底部、侧面和顶部表面）
        let bottomSurface = layerGroup.getObjectByName(`bottomSurface_${index}`);
        let sideSurface = layerGroup.getObjectByName(`sideSurface_${index}`);
        let topSurface = layerGroup.getObjectByName(`topSurface_${index}`);

        // 如果底部表面不存在，创建一个新的
        if (!bottomSurface) {
            bottomSurface = createTriangulatedSurface(belowPoints, scene, color);
            bottomSurface.name = `bottomSurface_${index}`;
            layerGroup.add(bottomSurface);
        } else {
            // 更新底部表面的几何体数据
            updateSurfaceGeometry(bottomSurface.geometry, belowPoints);
        }

        // 如果侧面表面不存在，创建一个新的
        if (!sideSurface) {
            sideSurface = createSurface(belowPoints, layer_depth, scene, color);
            sideSurface.name = `sideSurface_${index}`;
            layerGroup.add(sideSurface);
        } else {
            // 更新侧面表面的几何体数据
            updateSurfaceGeometry(sideSurface.geometry, belowPoints, layer_depth);
        }

        // 生成顶部点集
        let topPoints = belowPoints.map(
            (point) => new THREE.Vector3(point.x, point.y, point.z + layer_depth)
        );

        // 如果顶部表面不存在，创建一个新的
        if (!topSurface) {
            topSurface = createTriangulatedSurface(topPoints, scene, color);
            topSurface.name = `topSurface_${index}`;
            layerGroup.add(topSurface);
        } else {
            // 更新顶部表面的几何体数据
            updateSurfaceGeometry(topSurface.geometry, topPoints);
        }
    });

    // 清理多余的图层
    while (layerGroup.children.length > layers.length * 3) {
        const meshToRemove = layerGroup.children[layerGroup.children.length - 1];
        (meshToRemove).geometry.dispose();
        (meshToRemove).material.dispose();
        layerGroup.remove(meshToRemove);
    }
}

// 辅助函数，用于更新几何体数据
function updateSurfaceGeometry(geometry, points, depth) {
    const vertices = points.flatMap((point) => [point.x, point.y, point.z]);

    // 如果是侧面，需要连接底部和顶部的点
    if (depth !== undefined) {
        const topPoints = points.map(
            (point) => new THREE.Vector3(point.x, point.y, point.z + depth)
        );
        vertices.push(
            ...topPoints.flatMap((point) => [point.x, point.y, point.z])
        );
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    geometry.attributes.position.needsUpdate = true;
}

// 创建指北针
export function createCompassArrow(start, end, options = {}) {
    const startPoint = new THREE.Vector3(start[0], start[1], start[2]);
    const endPoint = new THREE.Vector3(end[0], end[1], end[2]);
    // 默认参数
    const {
        arrowColor = 0xff0000,
        cylinderRadius = 1,      // 圆柱体（箭身）半径
        headRadius = 3,          // 箭头头部半径
        headLength = 12,          // 箭头头部长度
        textSize = 12,
        textColor = 0xff0000   // 文字颜色
    } = options;
    // 创建组对象来容纳箭头和文字
    const group = new THREE.Group();

    const direction = new THREE.Vector3().subVectors(endPoint, startPoint);
    const length = direction.length();

    // 创建箭身（圆柱体）
    const cylinderGeometry = new THREE.CylinderGeometry(
        cylinderRadius,
        cylinderRadius,
        length - headLength,
        16
    );

    // 创建箭头头部（圆锥体）
    const coneGeometry = new THREE.CylinderGeometry(
        0,
        headRadius,
        headLength,
        16
    );

    // 使用基础材质
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: arrowColor });

    // 创建箭头网格
    const cylinder = new THREE.Mesh(cylinderGeometry, arrowMaterial);
    const cone = new THREE.Mesh(coneGeometry, arrowMaterial);

    // 调整部件位置
    cylinder.position.y = (length - headLength) / 2;
    cone.position.y = length - headLength / 2;

    // 创建箭头组
    const arrowGroup = new THREE.Group();
    arrowGroup.add(cylinder);
    arrowGroup.add(cone);

    // 加载字体
    const loader = new FontLoader();
    const font = loader.parse(fontJson);
    const textGeometry = new TextGeometry('N', {
        font: font,
        size: textSize,
        height: textSize * 0.2, // 文字厚度
        curveSegments: 12
    });

    // 计算文字的包围盒
    textGeometry.computeBoundingBox();
    const textBoundingBox = textGeometry.boundingBox;

    // 计算文字的中心点偏移
    const textCenterX = (textBoundingBox.max.x - textBoundingBox.min.x) / 2;
    const textCenterY = (textBoundingBox.max.y - textBoundingBox.min.y) / 2;

    const textMaterial = new THREE.MeshBasicMaterial({ color: textColor });
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);

    // 设置文字位置，考虑中心点偏移
    const textPosition = new THREE.Vector3().copy(direction);
    textPosition.normalize().multiplyScalar(length + 10);
    textMesh.position.copy(textPosition);

    // 将文字中心点与箭头中心线对齐
    textMesh.position.x -= textCenterX;
    textMesh.position.y -= textCenterY;


    // 添加到组中
    group.add(textMesh);
    group.add(arrowGroup);

    // 调整箭头的方向
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize()
    );
    arrowGroup.setRotationFromQuaternion(quaternion);

    // 设置组的位置为起点
    group.position.copy(startPoint);

    return group;
}