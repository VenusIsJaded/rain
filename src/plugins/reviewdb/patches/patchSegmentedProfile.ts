import { after } from "@api/patcher";
import { findByFilePath } from "@metro";

export default () => {
    const SegmentedControlPages = findByFilePath(
        "design/components/SegmentedControl/native/SegmentedControlPages.native.tsx",
    );

    if (!SegmentedControlPages) return () => false;

    return after("SegmentedControlPages", SegmentedControlPages, (args, ret) => {
        const children = ret?.props?.children;
        if (!Array.isArray(children)) {
            console.log("[ReviewDB-Segmented] ret.props.children is not an array!");
            return;
        }

        console.log(`[ReviewDB-Segmented] Inspecting children (Length: ${children.length})`);

        children.forEach((child, index) => {
            if (!child) {
                console.log(`  [Child ${index}] is null/undefined`);
                return;
            }

            const typeName = child.type?.name || child.type?.displayName || typeof child.type;
            const propsKeys = child.props ? Object.keys(child.props) : [];
            
            console.log(`  [Child ${index}] type: ${typeName}, props keys: ${JSON.stringify(propsKeys)}`);

            // If it has children inside its props, check if they contain our target components
            if (child.props?.children) {
                const subChildren = Array.isArray(child.props.children) ? child.props.children : [child.props.children];
                const names = subChildren.map(sc => sc?.type?.name || sc?.type?.displayName || typeof sc?.type);
                console.log(`    Sub-children types: ${JSON.stringify(names)}`);
            }
        });
    });
};
