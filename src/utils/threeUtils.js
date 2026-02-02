import * as THREE from 'three';
import * as d3 from 'd3';
import { Delaunay } from 'd3-delaunay';

// 震级颜色标度
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
    return colorScale(val);
}

// 震级不透明度
function getOpacity(magnitude) {
    const normalizedMag = (magnitude + 2) / 5;
    return Math.min(Math.max(0.1 + normalizedMag * 0.9, 0.1), 1.0);
}

/**
 * 创建文字看板 (Canvas Sprite)
 */
export function makeTextSprite(str, size = 20, color = "#555", isBold = false) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const renderFontSize = 64; // 高分辨率渲染
    const fontSpec = `${isBold ? "bold" : "500"} ${renderFontSize}px 'Segoe UI', Arial, sans-serif`;

    ctx.font = fontSpec;
    const textWidth = ctx.measureText(str).width;
    canvas.width = Math.ceil(textWidth + renderFontSize * 2);
    canvas.height = Math.ceil(renderFontSize * 2.5);

    ctx.font = fontSpec;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(str, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 999;

    const aspect = canvas.width / canvas.height;
    const displayHeight = size * 1.8;
    sprite.scale.set(displayHeight * aspect, displayHeight, 1);

    return sprite;
}

/**
 * 创建封闭体地层 (基于 Delaunay 三角剖分)
 */
export function createSolidLayer(points, depth, color, center, opacity = 0.95) {
    const points2D = points.map(p => [p.point_x, p.point_y]);

    const delaunay = Delaunay.from(points2D);
    const triangles = delaunay.triangles;
    const numPoints = points.length;

    const vertices = [];
    const indices = [];

    // 假设向下延伸
    const topZOffset = 0;
    const bottomZOffset = -depth;

    // 添加上表面顶点
    points.forEach(p => vertices.push(p.point_x - center.x, p.point_y - center.y, p.point_z - center.z + topZOffset));
    // 添加下表面顶点
    points.forEach(p => vertices.push(p.point_x - center.x, p.point_y - center.y, p.point_z - center.z + bottomZOffset));

    // 上表面索引
    for (let i = 0; i < triangles.length; i += 3) {
        indices.push(triangles[i], triangles[i + 1], triangles[i + 2]);
    }

    // 下表面索引
    for (let i = 0; i < triangles.length; i += 3) {
        indices.push(triangles[i] + numPoints, triangles[i + 2] + numPoints, triangles[i + 1] + numPoints);
    }

    // 侧面 (缝合)
    const halfedges = delaunay.halfedges;
    for (let e = 0; e < halfedges.length; e++) {
        if (halfedges[e] === -1) {
            const pStart = triangles[e];
            const pEnd = triangles[(e % 3 === 2) ? e - 2 : e + 1];
            indices.push(pStart, pEnd, pEnd + numPoints);
            indices.push(pStart, pEnd + numPoints, pStart + numPoints);
        }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshPhysicalMaterial({
        color: color,
        metalness: 0.1,
        roughness: 0.8,
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide,
        flatShading: true // 开启平面着色，防止跨面颜色过渡不均
    });

    return new THREE.Mesh(geo, mat);
}

/**
 * 创建坐标轴、网格与刻度
 */
export function createBoxAxes(bounds, scene, center) {
    const group = new THREE.Group();
    group.name = "AxesGroup";

    const pad = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, bounds.maxZ - bounds.minZ) * 0.1;

    const minX = bounds.minX - pad - center.x;
    const maxX = bounds.maxX + pad - center.x;
    const minY = bounds.minY - pad - center.y;
    const maxY = bounds.maxY + pad - center.y;
    const minZ = bounds.minZ - pad - center.z;
    const maxZ = bounds.maxZ + pad - center.z;

    const frameMat = new THREE.LineBasicMaterial({ color: 0xbdc3c7, opacity: 0.8, transparent: true });

    // 边框线
    const framePts = [
        new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(maxX, minY, minZ),
        new THREE.Vector3(maxX, minY, minZ), new THREE.Vector3(maxX, maxY, minZ),
        new THREE.Vector3(maxX, maxY, minZ), new THREE.Vector3(minX, maxY, minZ),
        new THREE.Vector3(minX, maxY, minZ), new THREE.Vector3(minX, minY, minZ),
        new THREE.Vector3(minX, maxY, minZ), new THREE.Vector3(minX, maxY, maxZ),
        new THREE.Vector3(maxX, maxY, minZ), new THREE.Vector3(maxX, maxY, maxZ),
        new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(minX, minY, maxZ),
        new THREE.Vector3(minX, maxY, maxZ), new THREE.Vector3(maxX, maxY, maxZ),
        new THREE.Vector3(minX, minY, maxZ), new THREE.Vector3(minX, maxY, maxZ)
    ];
    group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(framePts), frameMat));

    // 网格线
    const gridMat = new THREE.LineBasicMaterial({ color: 0xe0e0e0, opacity: 0.6, transparent: true });
    const createGrid = (uMin, uMax, vMin, vMax, fixed, axis) => {
        const pts = [];
        const steps = 6;
        for (let i = 0; i <= steps; i++) {
            const u = uMin + (uMax - uMin) * (i / steps);
            const v = vMin + (vMax - vMin) * (i / steps);
            if (axis === 'z') { pts.push(u, vMin, fixed, u, vMax, fixed, uMin, v, fixed, uMax, v, fixed); }
            else if (axis === 'y') { pts.push(u, fixed, vMin, u, fixed, vMax, uMin, fixed, v, uMax, fixed, v); }
            else { pts.push(fixed, u, vMin, fixed, u, vMax, fixed, uMin, v, fixed, uMax, v); }
        }
        return new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)), gridMat);
    };

    group.add(createGrid(minX, maxX, minY, maxY, minZ, 'z'));
    group.add(createGrid(minX, maxX, minZ, maxZ, maxY, 'y'));
    group.add(createGrid(minY, maxY, minZ, maxZ, minX, 'x'));

    // 刻度与标签
    const createTicks = (axis, min, max, fixed1, fixed2) => {
        const count = 5;
        const step = (max - min) / count;
        const tickMat = new THREE.LineBasicMaterial({ color: 0x7f8c8d });
        const tickLen = (max - min) * 0.02;
        const pts = [];

        for (let i = 0; i <= count; i++) {
            const val = min + i * step;
            let realVal = 0;
            let labelPos = new THREE.Vector3();

            if (axis === 'x') {
                realVal = val + center.x;
                pts.push(val, fixed1, fixed2, val, fixed1, fixed2 + tickLen);
                labelPos.set(val, fixed1 + 15, fixed2 - 10);
            } else if (axis === 'y') {
                realVal = val + center.y;
                pts.push(fixed1, val, fixed2, fixed1 - tickLen, val, fixed2);
                labelPos.set(fixed1 - 30, val, fixed2);
            } else {
                realVal = val + center.z;
                pts.push(fixed1, fixed2, val, fixed1 - tickLen, fixed2, val);
                labelPos.set(fixed1 - 30, fixed2 + 10, val);
            }

            const sprite = makeTextSprite(realVal.toFixed(0));
            sprite.position.copy(labelPos);
            group.add(sprite);
        }
        group.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)), tickMat));
    };

    createTicks('x', minX, maxX, maxY, minZ);
    createTicks('y', minY, maxY, minX, minZ);
    createTicks('z', minZ, maxZ, minX, maxY);

    // 轴标题
    const addTitle = (text, x, y, z, color) => {
        const sprite = makeTextSprite(text, 24, color, true);
        sprite.position.set(x, y, z);
        group.add(sprite);
    };

    addTitle("X ", maxX + pad, maxY, minZ, "#e74c3c");
    addTitle("Y ", minX, minY - pad, minZ, "#27ae60");
    addTitle("Z ", minX, maxY, maxZ + pad, "#2980b9");

    scene.add(group);
}

/**
 * 实例化渲染微震事件
 */
export function createEventSpheres(events, scene, center) {
    if (!events || events.length === 0) return;
    const count = events.length;
    const geometry = new THREE.SphereGeometry(1, 8, 6);
    const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.8 });
    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    instancedMesh.name = "EventsGroup";

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    events.forEach((event, i) => {
        dummy.position.set(event.loc_x - center.x, event.loc_y - center.y, event.loc_z - center.z);
        const radius = 3 + (Math.abs(event.magnitude) * 3);
        dummy.scale.set(radius, radius, radius);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
        instancedMesh.setColorAt(i, color.set(getColor(event.magnitude)));
    });

    instancedMesh.userData = { type: 'events', rawEvents: events };
    scene.add(instancedMesh);
}

/**
 * 创建地层名称标注与引线
 */
export function createLayerLabels(layers, minX, minY, centerZ, scene) {
    const group = new THREE.Group();
    group.name = "LayerLabelsGroup";
    const offset = 40;

    layers.forEach(layer => {
        if (!layer.layer_name) return;
        const color = layer.layer_color || "#333";
        const labelZ = centerZ + (layer.layer_distance || 0);

        // 标签
        const sprite = makeTextSprite(layer.layer_name, 28, color, true);
        sprite.position.set(minX - offset, minY - offset, labelZ);
        group.add(sprite);

        // 引线 (虚线)
        const lineMat = new THREE.LineDashedMaterial({ color, dashSize: 8, gapSize: 4, opacity: 0.6, transparent: true });
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(minX - offset + 20, minY - offset + 20, labelZ),
            new THREE.Vector3(minX, minY, labelZ)
        ]);
        const line = new THREE.Line(lineGeo, lineMat);
        line.computeLineDistances();
        group.add(line);
    });

    scene.add(group);
}
// 导出别名以兼容 Scene.tsx
export { createLayerLabels as createLayerNames };

/**
 * 创建 3D 指北针 (具有厚度和立体感)
 */
export function createCompass(start, end, scene, center, targetLength) {
    const startVec = new THREE.Vector3(Number(start[0]), Number(start[1]), Number(start[2]));
    const endVec = new THREE.Vector3(Number(end[0]), Number(end[1]), Number(end[2]));
    const direction = new THREE.Vector3().subVectors(endVec, startVec);
    const dirNormalized = direction.clone().normalize();

    // 长度处理
    const length = targetLength || 100;
    const thickness = length * 0.05;

    const group = new THREE.Group();
    group.name = "CompassGroup";

    const arrowGroup = new THREE.Group();

    const w1 = length * 0.4;
    const h1 = length * 0.6;
    const w2 = length * 0.3;
    const h2 = length * 0.4;

    const extrudeSettings = { depth: thickness, bevelEnabled: false };

    // 头部
    const headLeftShape = new THREE.Shape();
    headLeftShape.moveTo(0, 0);
    headLeftShape.lineTo(-w1 / 2, -h1);
    headLeftShape.lineTo(0, -h1 * 0.7);
    headLeftShape.lineTo(0, 0);
    const headLeft = new THREE.Mesh(new THREE.ExtrudeGeometry(headLeftShape, extrudeSettings), new THREE.MeshPhongMaterial({ color: 0xffffff }));

    const headRightShape = new THREE.Shape();
    headRightShape.moveTo(0, 0);
    headRightShape.lineTo(0, -h1 * 0.7);
    headRightShape.lineTo(w1 / 2, -h1);
    headRightShape.lineTo(0, 0);
    const headRight = new THREE.Mesh(new THREE.ExtrudeGeometry(headRightShape, extrudeSettings), new THREE.MeshPhongMaterial({ color: 0x222222 }));

    arrowGroup.add(headLeft, headRight);

    // 杆
    const shaftRadius = thickness * 0.2;
    const shaftLen = length - h1 * 0.7 - h2 * 0.3;
    const shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLen, 8);
    const shaft = new THREE.Mesh(shaftGeo, new THREE.MeshPhongMaterial({ color: 0x333333 }));
    shaft.position.y = -h1 * 0.7 - shaftLen / 2;
    arrowGroup.add(shaft);

    // 尾部
    const tailLeftShape = new THREE.Shape();
    tailLeftShape.moveTo(0, -length + h2 * 0.7);
    tailLeftShape.lineTo(-w2 / 2, -length);
    tailLeftShape.lineTo(0, -length - h2 * 0.2);
    tailLeftShape.lineTo(0, -length + h2 * 0.7);
    const tailLeft = new THREE.Mesh(new THREE.ExtrudeGeometry(tailLeftShape, extrudeSettings), new THREE.MeshPhongMaterial({ color: 0x222222 }));

    const tailRightShape = new THREE.Shape();
    tailRightShape.moveTo(0, -length + h2 * 0.7);
    tailRightShape.lineTo(0, -length - h2 * 0.2);
    tailRightShape.lineTo(w2 / 2, -length);
    tailRightShape.lineTo(0, -length + h2 * 0.7);
    const tailRight = new THREE.Mesh(new THREE.ExtrudeGeometry(tailRightShape, extrudeSettings), new THREE.MeshPhongMaterial({ color: 0xffffff }));

    arrowGroup.add(tailLeft, tailRight);

    // 居中
    arrowGroup.position.z = -thickness / 2;

    // 旋转到项目指北方向
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirNormalized);
    group.add(arrowGroup);
    group.applyQuaternion(quat);

    // N 标签
    const label = makeTextSprite("N", length * 0.4, "#000000", true);
    label.position.copy(dirNormalized.clone().multiplyScalar(length * 0.15));
    group.add(label);

    // 注意：在独立场景中使用时，我们不应用 center 偏移，直接放在原地
    if (!center || (center.x === 0 && center.y === 0 && center.z === 0)) {
        group.position.set(0, 0, 0);
    } else {
        group.position.set(endVec.x - center.x, endVec.y - center.y, endVec.z - center.z);
    }

    scene.add(group);
}
