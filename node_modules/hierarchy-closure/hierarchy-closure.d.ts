/** create a hierarchy object
 * This object keeps track of direct children and parents as well as transitive children and parents.
 */
declare function makeHierarchy(): {
    add: (parent: any, child: any) => void;
    roots: {};
    parents: {};
    children: {};
};
export function depthFirst(n: any, f: any, p: any): any;
export { makeHierarchy as create };
