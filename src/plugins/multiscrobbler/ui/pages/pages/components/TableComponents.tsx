import { SliderRow } from "@api/ui/components/SliderRow";
import { findByPropsLazy } from "@metro";

const svMod = findByPropsLazy("ScrollView");
export const ScrollView = (props) => { const Comp = svMod.ScrollView; return <Comp {...props} />; };
export const {
    Card,
    TableRowGroup,
    TableSwitchRow,
    TableCheckboxRow,
    TableRadioRow,
    TableRadioGroup,
    Stack,
    TableRow,
} = findByProps(
    "Card",
    "TableSwitchRow",
    "TableCheckboxRow",
    "TableRowGroup",
    "Stack",
    "TableRow",
    "TableRadioRow",
    "TableRadioGroup",
);
const tiMod = findByPropsLazy("TextInput");
export const TextInput = (props) => { const Comp = tiMod.TextInput; return <Comp {...props} />; };
export { SliderRow };
