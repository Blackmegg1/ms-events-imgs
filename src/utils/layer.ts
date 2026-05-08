export const sortLayersByDistanceDesc = <
  T extends { layer_distance?: number | string | null },
>(
  layers: T[] = [],
) =>
  [...layers].sort((a, b) => {
    const distanceA = Number(a.layer_distance);
    const distanceB = Number(b.layer_distance);

    if (Number.isNaN(distanceA) && Number.isNaN(distanceB)) return 0;
    if (Number.isNaN(distanceA)) return 1;
    if (Number.isNaN(distanceB)) return -1;

    return distanceB - distanceA;
  });
