import { findByNameLazy, findByPropsLazy } from "@metro";

import CreateDecoration from "../pages/CreateDecoration";

const navModule1 = findByNameLazy("Navigator");
const navModule2 = findByPropsLazy("Navigator");
const Navigator = (props) => { const Comp = navModule1.default ?? navModule2.Navigator; return <Comp {...props} />; };
const modalCloseButton =
  findByProps("getRenderCloseButton")?.getRenderCloseButton ??
  findByProps("getHeaderCloseButton")?.getHeaderCloseButton;

const pushMod = findByPropsLazy("pushModal");

export default () => (
    <Navigator
        initialRouteName="CREATE_DECORATION"
        screens={{
            CREATE_DECORATION: {
                headerLeft: getModalCloseButton()(() => pushMod.popModal("create-decoration")),
                render: CreateDecoration,
                title: "Create Decoration"
            }
        }}
    />
);
