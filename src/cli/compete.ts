import { runCompeteCycle } from "../runtime/compete-cycle.js";

const result = await runCompeteCycle();
console.log(JSON.stringify(result, null, 2));
