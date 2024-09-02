import { Delaunay } from "d3-delaunay";
import * as THREE from 'three';

import { getModelList } from '@/services/model/ModelController';
import { getPointList } from '@/services/point/PointController';

export default function isPointInSurfaceRegion(point, surface1Points, surface2Points) {
    // 使用d3-delaunay进行三角剖分
    const delaunay1 = Delaunay.from(surface1Points.map(p => [p.x, p.y]));
    const delaunay2 = Delaunay.from(surface2Points.map(p => [p.x, p.y]));

    const triangles1 = [];
    const triangles2 = [];

    // 获取三角剖分后的三角形数组
    const trianglesIndices1 = delaunay1.triangles;
    const trianglesIndices2 = delaunay2.triangles;

    for (let i = 0; i < trianglesIndices1.length; i += 3) {
        triangles1.push([
            surface1Points[trianglesIndices1[i]],
            surface1Points[trianglesIndices1[i + 1]],
            surface1Points[trianglesIndices1[i + 2]]
        ]);

        triangles2.push([
            surface2Points[trianglesIndices2[i]],
            surface2Points[trianglesIndices2[i + 1]],
            surface2Points[trianglesIndices2[i + 2]]
        ]);
    }

    // 判断点是否在两个曲面之间
    for (let i = 0; i < triangles1.length; i++) {
        const triangle1 = triangles1[i];
        const triangle2 = triangles2[i];

        // 判断 (x, y) 是否在三角形投影内
        if (pointInTriangle(point.x, point.y, triangle1)) {
            const z1 = interpolateZ(point.x, point.y, triangle1);
            const z2 = interpolateZ(point.x, point.y, triangle2);

            // 判断 z 坐标是否在两个曲面之间
            if (point.z >= z1 && point.z <= z2) {
                return true;
            }
        }
    }

    return false;
}

function pointInTriangle(px, py, triangle) {
    const [a, b, c] = triangle;
    return (
        area(px, py, b.x, b.y, c.x, c.y) +
        area(a.x, a.y, px, py, c.x, c.y) +
        area(a.x, a.y, b.x, b.y, px, py)
    ) === area(a.x, a.y, b.x, b.y, c.x, c.y);
}

function area(x1, y1, x2, y2, x3, y3) {
    return Math.abs((x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)) / 2.0);
}

function interpolateZ(x, y, triangle) {
    const [a, b, c] = triangle;

    const detT = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
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