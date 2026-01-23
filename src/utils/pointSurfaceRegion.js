import { Delaunay } from "d3-delaunay";

import { getModelList } from '@/services/model/ModelController';
import { getPointList } from '@/services/point/PointController';

/**
 * 快速插值计算：根据预先计算出的剖分和映射关系进行快速筛选
 */
function fastCheckPointInRegion(point, surface1Points, surface2Points, delaunay, pointToTriangles) {
    const { x, y, z } = point;

    // 1. 利用 d3-delaunay 的高效搜索算法找到最近的一个基准点索引
    // 复杂度 O(sqrt(M))
    const pIndex = delaunay.find(x, y);
    if (pIndex === -1) return false;

    // 2. 只遍历与该点关联的三角形索引
    const triangleIndices = pointToTriangles[pIndex];
    if (!triangleIndices) return false;

    for (const tIdx of triangleIndices) {
        const i0 = delaunay.triangles[tIdx * 3];
        const i1 = delaunay.triangles[tIdx * 3 + 1];
        const i2 = delaunay.triangles[tIdx * 3 + 2];

        const tri1 = [surface1Points[i0], surface1Points[i1], surface1Points[i2]];

        // 3. 判断是否在三角形内
        if (pointInTriangle(x, y, tri1)) {
            const tri2 = [surface2Points[i0], surface2Points[i1], surface2Points[i2]];
            const z1 = interpolateZ(x, y, tri1);
            const z2 = interpolateZ(x, y, tri2);

            const minZ = Math.min(z1, z2);
            const maxZ = Math.max(z1, z2);

            return z >= minZ && z <= maxZ;
        }
    }

    return false;
}

/**
 * 二维叉积判定法：判断点 (px, py) 是否在三角形内
 */
function pointInTriangle(px, py, triangle) {
    const [a, b, c] = triangle;
    const s1 = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
    const s2 = (c.x - b.x) * (py - b.y) - (c.y - b.y) * (px - b.x);
    const s3 = (a.x - c.x) * (py - c.y) - (a.y - c.y) * (px - c.x);

    const has_neg = (s1 < 0) || (s2 < 0) || (s3 < 0);
    const has_pos = (s1 > 0) || (s2 > 0) || (s3 > 0);
    return !(has_neg && has_pos);
}

/**
 * 重心坐标插值 Z 值
 */
function interpolateZ(x, y, triangle) {
    const [a, b, c] = triangle;
    const detT = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    if (Math.abs(detT) < 1e-10) return (a.z + b.z + c.z) / 3.0;

    const l1 = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / detT;
    const l2 = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / detT;
    const l3 = 1.0 - l1 - l2;

    return l1 * a.z + l2 * b.z + l3 * c.z;
}

/**
 * 层位切片主函数：计算处于指定地层范围内的事件
 * @param {number} project_id 项目ID
 * @param {Array} events 待筛选的微震事件列表
 * @param {number} bottomZ 底板偏移量
 * @param {number} topZ 顶板偏移量
 */
export async function computerEvent(project_id, events, bottomZ, topZ) {
    try {
        if (!events || events.length === 0) return [];

        const { list: modelList } = await getModelList({ project_id });
        if (!modelList || modelList.length === 0) throw new Error('未配置工作面模型！');

        const model_id = modelList[modelList.length - 1].model_id;
        const { list: points } = await getPointList({ model_id });
        if (points.length < 3) throw new Error('模型基准点位过少！');

        // 1. 初始化三角剖分 (仅计算一次)
        const coords = new Float64Array(points.length * 2);
        for (let i = 0; i < points.length; i++) {
            coords[i * 2] = points[i].point_x;
            coords[i * 2 + 1] = points[i].point_y;
        }
        const delaunay = new Delaunay(coords);

        // 2. 构建点到三角形的索引映射 (用于快速定位)
        const pointToTriangles = new Array(points.length);
        for (let i = 0; i < points.length; i++) pointToTriangles[i] = [];

        const { triangles } = delaunay;
        for (let i = 0; i < triangles.length; i++) {
            const pIdx = triangles[i];
            const tIdx = Math.floor(i / 3);
            pointToTriangles[pIdx].push(tIdx);
        }

        // 3. 准备插值所需的曲面数据
        const surface1 = points.map(p => ({ x: p.point_x, y: p.point_y, z: p.point_z + bottomZ }));
        const surface2 = points.map(p => ({ x: p.point_x, y: p.point_y, z: p.point_z + topZ }));

        // 4. 批量筛选事件
        const filtered = events.filter(ev => {
            const q = { x: ev.loc_x, y: ev.loc_y, z: ev.loc_z };
            return fastCheckPointInRegion(q, surface1, surface2, delaunay, pointToTriangles);
        });

        console.log(`[HorizonSlice] 处理完成。输入: ${events.length}, 输出: ${filtered.length}, 基准点数: ${points.length}`);
        return filtered;

    } catch (error) {
        console.error('事件分层切片计算失败:', error.message);
        throw error;
    }
}
