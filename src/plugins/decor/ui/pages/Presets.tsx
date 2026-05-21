import { ReactNative } from "@metro/common";
import { View } from "react-native";

import { getPresets,Preset as PresetInterface } from "../../lib/api";
import Preset from "../components/Preset";

import { FlashList } from "@metro/common/components";

export default function Presets() {
    const [presets, setPresets] = React.useState<PresetInterface[]>([]);

    React.useEffect(() => {
        let mounted = true;
        getPresets().then(presets => { if (mounted) setPresets(presets) });
        return () => { mounted = false; };
    }, []);

    return <FlashList estimatedItemSize={200} keyExtractor={(item, index) => item.id || item.name || index.toString()}
        data={presets}
        renderItem={({ item }) => <Preset preset={item} />}
        ListFooterComponent={() => <View style={{ height: 18 }} />}
    />;
}
