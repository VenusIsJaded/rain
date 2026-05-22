import { after } from "@api/patcher";
import { findByFilePath } from "@metro";

export default () => {
    const SegmentedControlPages = findByFilePath(
        "design/components/SegmentedControl/native/SegmentedControlPages.native.tsx",
    );

    if (!SegmentedControlPages) return () => false;

    return after("SegmentedControlPages", SegmentedControlPages, (args, ret) => {
        const children = ret?.props?.children;
        if (!children) {
            console.log("[ReviewDB-Segmented] ret.props.children is null or undefined");
            return;
        }

        // Normalize children into an array regardless of count
        const childrenArray = Array.isArray(children) ? children : [children];

        console.log(`[ReviewDB-Segmented] Inspecting children array (Length: ${childrenArray.length})`);

        childrenArray.forEach((child, index) => {
            if (!child) {
                console.log(`[ReviewDB-Segmented] [Child ${index}] is null or undefined`);
                return;
            }

            const typeName = child.type?.name || child.type?.displayName || typeof child.type;
            const propsKeys = child.props ? Object.keys(child.props) : [];
            
            console.log(`[ReviewDB-Segmented] [Child ${index}] type: ${typeName}, props keys: ${JSON.stringify(propsKeys)}`);

            if (child.props?.children) {
                const subChildren = Array.isArray(child.props.children) ? child.props.children : [child.props.children];
                const names = subChildren.map(sc => sc?.type?.name || sc?.type?.displayName || typeof sc?.type);
                console.log(`[ReviewDB-Segmented] [Child ${index}] Sub-children types: ${JSON.stringify(names)}`);
            }
        });
    });
};
