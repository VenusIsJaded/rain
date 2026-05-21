import { ReactNative } from "@metro/common";
import { View } from "react-native";

import { getPresets,Preset as PresetInterface } from "../../lib/api";
import Preset from "../components/Preset";

import { FlashList } from "@metro/common/components";

export default function Presets() {
    const [presets, setPresets] = React.useState<PresetInterface[]>([]);

    React.useEffect(() => {
        getPresets().then(presets => setPresets(presets));
    }, []);

    return <FlashList estimatedItemSize={200} keyExtractor={item => item.id || item.name || Math.random().toString()}
        data={presets}
        renderItem={({ item }) => <Preset preset={item} />}
        ListFooterComponent={() => <View style={{ height: 18 }} />}
    />;
}
