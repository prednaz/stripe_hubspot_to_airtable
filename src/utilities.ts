import * as util from "util";

export const inspect = (p: any): void => console.log(util.inspect(p, {showHidden: false, depth: null}));
