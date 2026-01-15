import { Delaunay } from "d3-delaunay";
import * as THREE from 'three';

import { getModelList } from '@/services/model/ModelController';
import { getPointList } from '@/services/point/PointController';

// 计算传入的点位是否在两个曲面之间
export default function isPointInSurfaceRegion(point, surface1Points, surface2Points) {
    // 使用d3-delaunay进行单次三角剖分（假设 surface1 和 surface2 的 X, Y 坐标集是一致的）
    const delaunay = Delaunay.from(surface1Points.map(p => [p.x, p.y]));
    const trianglesIndices = delaunay.triangles;

    // 判断点是否在两个曲面之间
    for (let i = 0; i < trianglesIndices.length; i += 3) {
        const i0 = trianglesIndices[i];
        const i1 = trianglesIndices[i + 1];
        const i2 = trianglesIndices[i + 2];

        const triangle1 = [surface1Points[i0], surface1Points[i1], surface1Points[i2]];
        const triangle2 = [surface2Points[i0], surface2Points[i1], surface2Points[i2]];

        // 判断 (x, y) 是否在三角形投影内
        if (pointInTriangle(point.x, point.y, triangle1)) {
            const z1 = interpolateZ(point.x, point.y, triangle1);
            const z2 = interpolateZ(point.x, point.y, triangle2);

            // 增强健壮性：判断 z 坐标是否在两个曲面之间（不假设 z1 < z2）
            const minZ = Math.min(z1, z2);
            const maxZ = Math.max(z1, z2);

            if (point.z >= minZ && point.z <= maxZ) {
                return true;
            }
        }
    }

    return false;
}

function pointInTriangle(px, py, triangle) {
    const [a, b, c] = triangle;

    // 使用叉积法判断点是否在三角形内，比面积法更稳健且避开浮点加法精度问题
    // 计算向量: (b-a)x(p-a), (c-b)x(p-b), (a-c)x(p-c)
    // 如果所有积符号相同，则点在三角形内
    const sign1 = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
    const sign2 = (c.x - b.x) * (py - b.y) - (c.y - b.y) * (px - b.x);
    const sign3 = (a.x - c.x) * (py - c.y) - (a.y - c.y) * (px - c.x);

    const has_neg = (sign1 < 0) || (sign2 < 0) || (sign3 < 0);
    const has_pos = (sign1 > 0) || (sign2 > 0) || (sign3 > 0);

    // 考虑在线上的情况：! (has_neg && has_pos)
    return !(has_neg && has_pos);
}

function area(x1, y1, x2, y2, x3, y3) {
    return Math.abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2.0);
}

function interpolateZ(x, y, triangle) {
    const [a, b, c] = triangle;

    const detT = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);

    // 如果三角形退化（共线），直接返回其中一个点的 Z 或平均 Z
    if (Math.abs(detT) < 1e-10) {
        return (a.z + b.z + c.z) / 3.0;
    }

    const l1 = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / detT;
    const l2 = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / detT;
    const l3 = 1.0 - l1 - l2;

    return l1 * a.z + l2 * b.z + l3 * c.z;
}


export async function computerEvent(project_id, events, bottomZ, topZ) {
    try {
        const { list: modelList } = await getModelList({ project_id: project_id });
        if (modelList.length < 1) {
            throw new Error('未配置工作面模型！');
        }
        const model_id = modelList.pop().model_id;
        const { list: points } = await getPointList({ model_id: model_id });
        if (points.length < 4) {
            throw new Error('模型基准点位过少！');
        }

        if (events.length > 0) {
            let bottomVectorPoints = points.map(
                (point) =>
                    new THREE.Vector3(
                        point.point_x,
                        point.point_y,
                        point.point_z + bottomZ,
                    ),
            );
            let topVectorPoints = points.map(
                (point) =>
                    new THREE.Vector3(point.point_x, point.point_y, point.point_z + topZ),
            );

            let eventVector = events.map((event) => {
                return { x: event.loc_x, y: event.loc_y, z: event.loc_z, ...event };
            });
            let filterEvent = eventVector.filter((event) => {
                return isPointInSurfaceRegion(
                    event,
                    bottomVectorPoints,
                    topVectorPoints,
                );
            });
            console.log(filterEvent);
            return filterEvent;
        }
        return [];
    } catch (error) {
        console.error('事件分层切片出错:', error.message);
        throw error; // 重新抛出错误，允许调用者进行进一步处理
    }
}