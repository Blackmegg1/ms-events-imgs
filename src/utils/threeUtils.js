import * as THREE from 'three';
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
export function createTriangulatedSurface(points, scene) {
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

    // // 为每个三角形创建随机颜色
    // const colors = [];
    // for (let i = 0; i < indices.length; i += 3) {
    //     const color = new THREE.Color(Math.random(), Math.random(), Math.random());
    //     for (let j = 0; j < 3; j++) {
    //         colors.push(color.r, color.g, color.b);
    //     }
    // }

    // // 设置颜色属性
    // surfaceGeometry.setAttribute(
    //     "color",
    //     new THREE.Float32BufferAttribute(colors, 3)
    // );

    // 创建材质
    const surfaceMaterial = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
    });

    // 创建网格
    const surfaceMesh = new THREE.Mesh(surfaceGeometry, surfaceMaterial);

    // 添加到场景
    scene.add(surfaceMesh);
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
            size: 10,
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

// 创建事件球体
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