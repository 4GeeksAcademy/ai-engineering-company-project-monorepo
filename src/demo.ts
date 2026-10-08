import { kpiSnapshotExample } from "./types/models";
import { buildValidatedKpiOverview } from "./utils/transformations";
import { flattenMatrix, transposeMatrix } from "./utils/collections";

const snapshots = [kpiSnapshotExample];
const overview = buildValidatedKpiOverview(snapshots);

const matrix = [
  [1, 2, 3],
  [4, 5, 6],
];

console.log("KPI overview:", overview);
console.log("Flatten matrix:", flattenMatrix(matrix));
console.log("Transpose matrix:", transposeMatrix(matrix));
