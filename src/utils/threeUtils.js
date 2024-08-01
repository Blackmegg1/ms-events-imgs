import * as THREE from 'three';

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
export function createTriangulatedSurface(points, scene) {
    // 创建几何体
    const surfaceGeometry = new THREE.BufferGeometry();

    // 创建顶点
    const vertices = [];
    const center = new THREE.Vector3();
    points.forEach((point) => {
        vertices.push(point.x, point.y, point.z);
        center.add(point);
    });
    center.divideScalar(points.length);

    // 创建面（三角形）
    const indices = [];
    for (let i = 0; i < points.length - 1; i++) {
        indices.push(i, i + 1, points.length);
    }
    indices.push(points.length - 1, 0, points.length);

    // 添加中心点
    vertices.push(center.x, center.y, center.z);

    // 设置顶点和面
    surfaceGeometry.setIndex(indices);
    surfaceGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
    );

    // 计算法线
    surfaceGeometry.computeVertexNormals();

    // 创建材质
    const surfaceMaterial = new THREE.MeshStandardMaterial({
        color: "#2f343c",
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        // roughness: 0.7,  // 控制材质的光滑度
        // metalness: 0.1,  // 控制材质的金属感
        // transmission: 0.9, // 让材质允许光线穿过
        // thickness: 0.1, // 模拟材质的厚度
    });

    // 创建网格
    const surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);

    // 添加到场景
    scene.add(surfaceMesh);
}

// 标注基准点
export function createPoints(points, scene) {
    // 创建几何体
    const pointsGeometry = new THREE.BufferGeometry();

    // 将点坐标转换为 Float32Array
    const positions = new Float32Array(
        points.flatMap((point) => [point.x, point.y, point.z])
    );

    // 设置顶点属性
    pointsGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
    );

    // 创建材质
    const pointsMaterial = new THREE.PointsMaterial({
        color: 0xff0000,
        size: 10,
        sizeAttenuation: false,
    });

    // 创建点对象
    const pointsObject = new THREE.Points(pointsGeometry, pointsMaterial);

    // 添加到场景
    scene.add(pointsObject);
}

export function createSphere(events, scene) {
    events.forEach(event => {
        const geometry = new THREE.SphereGeometry(6, 24, 16);
        const sphere = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
            color: (event.magnitude > 0.1) ? 'red' : 'blue',
        }));
        sphere.position.set(event.loc_x, event.loc_y, event.loc_z);
        scene.add(sphere)
    })
}