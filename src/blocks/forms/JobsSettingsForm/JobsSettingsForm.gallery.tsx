import type { GalleryModule } from "../../../design-system/gallery/types";
import WithState from "../../../design-system/gallery/WithState";
import type { JobsDefaultPreset } from "../../../lib/jobsSettings";
import type { BlockFamilyId } from "../../families";
import type { EngineServerConnectFeedback, EngineServerFormStatus } from "../EngineServerForm";
import JobsSettingsForm from "./JobsSettingsForm";
import { API_URL, BOARD_DEFAULT, CONNECTING, DEEP_DEFAULT, ENGINES, NOT_AN_EVAL_API, ONLINE, PRESETS, UNREACHABLE } from "./fixtures";

type DemoState = { defaultPreset: JobsDefaultPreset | null; enabled: boolean; address: string; write?: boolean };

/** The settings with every control live; the API's status is the demo's, fixed. */
const demo = (
  initial: DemoState,
  status?: EngineServerFormStatus,
  connectFeedback: EngineServerConnectFeedback = "idle",
  writable?: boolean,
) => (
  <WithState<DemoState> initial={initial}>
    {(state, set) => (
      <JobsSettingsForm
        defaultPreset={state.defaultPreset}
        onDefaultPresetChange={(defaultPreset) => set({ ...state, defaultPreset })}
        initialDefault={BOARD_DEFAULT}
        engines={ENGINES}
        presets={PRESETS}
        evalApi={{
          enabled: state.enabled,
          onEnabledChange: (enabled) => set({ ...state, enabled }),
          address: state.address,
          onAddressChange: (address) => set({ ...state, address }),
          onConnect: () => {},
          connectFeedback,
          addressInvalid: !/^https?:\/\/\S+$/.test(state.address),
          example: API_URL,
          status: state.enabled ? status : undefined,
        }}
        evalApiWrite={{ checked: state.write === true, onChange: (write) => set({ ...state, write }), writable }}
        testId="gallery-jobs-settings"
      />
    )}
  </WithState>
);

const off: DemoState = { defaultPreset: null, enabled: false, address: API_URL };
const on: DemoState = { defaultPreset: DEEP_DEFAULT, enabled: true, address: API_URL };

const gallery: GalleryModule<BlockFamilyId> = {
  section: "forms",
  title: "JobsSettingsForm",
  demos: [
    { name: "The defaults — the board's engine, the API off: the app contacts nothing", render: () => demo(off) },
    { name: "A default engine and preset, the API connected", render: () => demo(on, ONLINE) },
    { name: "The API connecting", render: () => demo(on, CONNECTING) },
    { name: "Connect pressed — the API answered", render: () => demo(on, ONLINE, "answered") },
    { name: "The API unreachable — with Try again", render: () => demo(on, UNREACHABLE, "failed") },
    { name: "Something answered, but not the evaluation API", render: () => demo(on, NOT_AN_EVAL_API) },
    { name: "Sending the engine's evaluations — the API in write mode", render: () => demo({ ...on, write: true }, ONLINE, "idle", true) },
    { name: "Sending the engine's evaluations — the API not in write mode", render: () => demo({ ...on, write: true }, ONLINE, "idle", false) },
    { name: "Not an address", render: () => demo({ ...on, address: "10.0.0.3:8000" }, UNREACHABLE) },
  ],
};

export default gallery;
