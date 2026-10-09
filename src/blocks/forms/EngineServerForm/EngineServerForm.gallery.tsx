import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { BlockFamilyId } from "../../families";
import { EnginePicker } from "../EnginePicker";
import EngineServerForm, { type EngineServerConnectFeedback, type EngineServerFormStatus } from "./EngineServerForm";
import { CONNECTING, EXAMPLE_URL, LONG_ADDRESS, NOT_AN_ENGINE_SERVER, ONLINE, SERVER_ENGINES, UNREACHABLE } from "./fixtures";

type DemoState = { enabled: boolean; address: string };

/** The form with its switch and field live; the status is the demo's, fixed. */
const demo = (
  initial: DemoState,
  status?: EngineServerFormStatus,
  addressInvalid = false,
  connectFeedback: EngineServerConnectFeedback = "idle",
) => (
  <WithState<DemoState> initial={initial}>
    {(state, set) => (
      <EngineServerForm
        enabled={state.enabled}
        onEnabledChange={(enabled) => set({ ...state, enabled })}
        address={state.address}
        onAddressChange={(address) => set({ ...state, address })}
        onConnect={() => {}}
        connectFeedback={connectFeedback}
        addressInvalid={addressInvalid}
        example={EXAMPLE_URL}
        status={state.enabled ? status : undefined}
        testId="gallery-engine-server"
      />
    )}
  </WithState>
);

const on = { enabled: true, address: EXAMPLE_URL };

/** As Settings → Engine shows it: the server's engines listed under the details. */
const withEngines = () => (
  <WithState<string> initial={SERVER_ENGINES[1].descriptor.id}>
    {(value, set) => (
      <EngineServerForm
        enabled
        onEnabledChange={() => {}}
        address={EXAMPLE_URL}
        onAddressChange={() => {}}
        onConnect={() => {}}
        connectFeedback="idle"
        addressInvalid={false}
        example={EXAMPLE_URL}
        status={ONLINE}
        testId="gallery-engine-server-listed"
      >
        <EnginePicker
          entries={SERVER_ENGINES}
          value={value}
          onChange={set}
          legend="Engines on this server"
          testId="gallery-engine-server-picker"
        />
      </EngineServerForm>
    )}
  </WithState>
);

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "EngineServerForm",
  demos: [
    { name: "Off — the default: the app contacts nothing", render: () => demo({ enabled: false, address: EXAMPLE_URL }) },
    { name: "Connecting", render: () => demo(on, CONNECTING) },
    { name: "Connected", render: () => demo(on, ONLINE) },
    { name: "Connect pressed — the check is out", render: () => demo(on, ONLINE, false, "checking") },
    { name: "Connect pressed — the server answered", render: () => demo(on, ONLINE, false, "answered") },
    { name: "Connect pressed — no answer", render: () => demo(on, UNREACHABLE, false, "failed") },
    { name: "Connected — the server's engines listed under it, as Settings → Engine does", render: withEngines },
    { name: "Unreachable — with Try again", render: () => demo(on, UNREACHABLE) },
    { name: "Something answered, but not an engine server", render: () => demo(on, NOT_AN_ENGINE_SERVER) },
    { name: "Not an address — the field says what one looks like", render: () => demo({ enabled: true, address: "127.0.0.1:8800" }, UNREACHABLE, true) },
    { name: "A long address on another machine", render: () => demo({ enabled: true, address: LONG_ADDRESS }, { ...ONLINE, url: LONG_ADDRESS }) },
  ],
};

export default gallery;
